FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

# Ensure logs and uploads directories exist
RUN mkdir -p /app/logs /app/uploads/profiles

EXPOSE 5000

CMD ["node", "server.js"]
