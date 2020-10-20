let sock = new WebSocket('ws://' + window.location.host);

sock.onopen = init;
sock.onmessage = recv;
sock.onclose = (e) => console.log('[-] Connection closed.');
sock.onerror = (e) => console.log(`[!] Socket error: ${e}`);

// WebRTC
const config = {
    iceServers: [{url: 'stun:stun.1.google.com:19302'}]
}
const constraints = {
    optional: [
        {DtlsSrtpKeyAgreement: true}
    ]
}
let pc = new RTCPeerConnection(config, constraints);
pc.onicecandidate = sendIceCandidate;
pc.ondatachannel = addRecvChannel;
window.pc = pc;
sendChannel = pc.createDataChannel('caller', {reliable: true});
sendChannel.onopen = sendChannelHandler;
sendChannel.onclose = sendChannelHandler;
let recvChannel = null;

// Methods
function init(e) {
    console.log('[+] Connection established to server.');
    // Get local path (room name)
    const room = window.location.pathname.substr(1);
    const data = {
        type: 'join',
        data: room
    }
    sock.send(JSON.stringify(data));
}

function recv(e) {
    try {
        let msg = JSON.parse(e.data);
        switch (msg.type) {
        case 'created':
            // Lie in wait...
            console.log(`[+] Created room ${msg.data}`);
            break;
        case 'joined':
            // Initialize peer connnection variables...
            console.log(`[+] Joined room ${msg.data}`);
            break;
        case 'peer':
            // Initiate WebRTC connection...
            console.log(`[+] Peer connected on room ${msg.data}`);
            pc.createOffer(genDesc, e => console.log(`[!] Error creating offer: ${e}`));
            break;
        case 'candidate':
            // Add ICE candidate...
            console.log('[+] Received ICE candidate');
            pc.addIceCandidate(msg.data);
            break;
        case 'description':
            // Generate answer...
            console.log('[+] Received caller description');
            pc.setRemoteDescription(msg.data);
            pc.createAnswer(sendAnswer, e => console.log(`[!] Error creating answer: ${e}`));
            break;
        case 'answer':
            // Set remote description for caller
            console.log('[+] Received callee answer');
            pc.setRemoteDescription(msg.data);
            break;
        default:
            console.log('[!] Unknown type: ', msg.type);
        }
    } catch(e) {
        console.log(`[!] Parsing error: ${e}`);
    }
}

function sendIceCandidate(e) {
    if (e.candidate) {
        const data = {
            type: 'candidate',
            data: e.candidate
        }
        sock.send(JSON.stringify(data));
    }
}

function genDesc(desc) {
    pc.setLocalDescription(desc);
    const data = {
        type: 'description',
        data: desc
    }
    sock.send(JSON.stringify(data));
}

function sendAnswer(desc) {
    pc.setLocalDescription(desc);
    const data = {
        type: 'answer',
        data: desc
    }
    sock.send(JSON.stringify(data));
}

function addRecvChannel(e) {
    console.log('[+] Data channel added to peer connection');
    recvChannel = e.channel;
    recvChannel.onopen = recvChannelHandler;
    recvChannel.onclose = recvChannelHandler;
    recvChannel.onmessage = recvMsg;
}

function sendChannelHandler() {
    console.log(`[+] Send Channel State: ${sendChannel.readyState}`);
    if (sendChannel.readyState === 'open') {
        document.querySelector('button').disabled = false;
    } else document.querySelector('button').disabled = true;
}

function recvChannelHandler() {
    console.log(`[+] Receiving Channel State: ${recvChannel.readyState}`);
}

function sendMsg(msg) {
    sendChannel.send(msg);
}

// HTML triggers
document.querySelector('button').onclick = send;
document.querySelector('button').disabled = true;
document.onkeypress = e => {
    if (e.keyCode === 13) send();
};

function recvMsg(e) {
    console.log(e.data);
    let msg = document.createElement('li');
    msg.innerText = e.data;
    msg.className = 'msg them';
    let container = document.createElement('div');
    container.className = 'cont';
    container.appendChild(msg);
    document.querySelector('ul').appendChild(container);
}

function send() {
    if (sendChannel.readyState !== 'open') return;
    const txt = document.querySelector('input').value;
    if (txt === '') return;
    document.querySelector('input').value = '';
    sendMsg(txt);
    let msg = document.createElement('li');
    msg.innerText = txt;
    msg.className = 'msg me';
    let container = document.createElement('div');
    container.className = 'cont';
    container.appendChild(msg);
    document.querySelector('ul').appendChild(container);
}
