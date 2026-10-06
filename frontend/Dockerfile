# Build stage
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Set environment build arguments
ARG VITE_API_BASE_URI=http://localhost:5000
ARG VITE_CAPTCHA_SERVICE_URL=http://localhost:11905
ENV VITE_API_BASE_URI=$VITE_API_BASE_URI
ENV VITE_CAPTCHA_SERVICE_URL=$VITE_CAPTCHA_SERVICE_URL

RUN npm run build

# Production Nginx stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
