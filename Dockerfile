FROM node:alpine

WORKDIR /app

EXPOSE 8080/tcp

CMD ["npm", "start"]

COPY package.json index.html room.html index.js client.js ./

RUN npm install