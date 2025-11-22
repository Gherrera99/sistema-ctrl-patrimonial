# Build stage
FROM node:20 AS build
WORKDIR /app
COPY package*.json ./
RUN npm i
COPY . .

# 👇 nuevo: recoger el arg y exponerlo como env para el build de Vite
ARG VITE_OWNER_EMAIL
ENV VITE_OWNER_EMAIL=${VITE_OWNER_EMAIL}

RUN npm run build

# Nginx stage
FROM nginx:1.25-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
