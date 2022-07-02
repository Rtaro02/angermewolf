FROM node:slim

WORKDIR /usr/app
COPY . /usr/app

RUN npm install

ENTRYPOINT ["node", "index.js"]