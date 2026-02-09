FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .
COPY docker/docker-entrypoint.sh /usr/src/app/docker-entrypoint.sh
RUN chmod +x /usr/src/app/docker-entrypoint.sh

ARG CC_SERVER_PORT
ENV PORT=$CC_SERVER_PORT
EXPOSE $CC_SERVER_PORT

ENTRYPOINT ["/usr/src/app/docker-entrypoint.sh"]
