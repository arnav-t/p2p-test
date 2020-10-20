const ws = require('ws');
const http = require('http');
const path = require('path');
const express = require('express');

const app = express();
const server = http.createServer(app);
const wss = new ws.Server({ server });

// Express server
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/client.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'client.js'));
});

app.get('/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'room.html'));
});

server.listen(8080, '0.0.0.0', () => console.log('[+] Listening on port 8080...'));

// Websocket connections
let rooms = {};

wss.on('connection', (sock, req) => {
    const ip = req.headers['x-forwarded-for'] || sock._socket.remoteAddress;
    console.log(`[+] Received connection from ${ip}`);
    sock.on('message', rawMsg => {
        try {
            const msg = JSON.parse(rawMsg);
            switch (msg.type) {
            case 'join':
                if (msg.data in rooms && rooms[msg.data].length < 2) join(sock, msg.data);
                else create(sock, msg.data);
                break;
            case 'candidate':
            case 'description':
            case 'answer':
                forward(sock, rawMsg)
                break;
            default:
                console.log('[!] Unknown type: ', msg.type);
            }
        } catch(e) {
            console.log('[!] Parsing error: ', e);
        }
    });

    sock.on('close', e => {
        console.log(`[-] Connection closed on ${ip}`);
        teardown(sock.room);
    });
});

function create(sock, room) {
    console.log(`[+] Creating room ${room}`);
    teardown(room);
    sock.room = room;
    rooms[room] = [sock];
    const data = {
        type: 'created',
        data: room
    }
    sock.send(JSON.stringify(data));
}

function join(sock, room) {
    console.log(`[+] Peer connected on room ${room}`);
    sock.room = room;
    rooms[room].push(sock);
    const calleeData = {
        type: 'joined',
        data: room
    }
    const callerData = {
        type: 'peer',
        data: room
    }
    sock.send(JSON.stringify(calleeData));
    rooms[room][0].send(JSON.stringify(callerData));
}

function teardown(room) {
    if (!(room in rooms)) return;
    for (let sock of rooms[room]) {
        try {
            sock.close();
        } catch(e) {
            console.log(`[!] Error closing connection: ${e}`);
        }
    }
    delete rooms.room;
}

function forward(fromSock, msg) {
    const room = fromSock.room;
    for (let sock of rooms[room]) {
        if (sock !== fromSock) sock.send(msg);
    }
}
