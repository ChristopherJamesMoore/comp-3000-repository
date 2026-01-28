FROM node:20-alpine
RUN apk add curl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

COPY entrypoint.sh .
RUN chmod +x ./entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["./entrypoint.sh"]
