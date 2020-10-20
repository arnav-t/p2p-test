FROM node:alpine

WORKDIR /app

EXPOSE 8080/tcp

CMD ["npm", "start"]

COPY package.json .
COPY index.html .
COPY room.html .
COPY index.js .
COPY client.js .

RUN npm install