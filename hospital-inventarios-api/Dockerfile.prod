# hospital-inventarios-api/Dockerfile
FROM ghcr.io/puppeteer/puppeteer:latest
WORKDIR /app

# 1) deps
COPY package*.json ./
RUN npm i

# 2) prisma (schema + generate)
COPY prisma ./prisma
RUN npx prisma generate

# 3) código
COPY tsconfig.json ./
COPY src ./src

# 4) build
RUN npm run build

ENV PORT=8000
EXPOSE 8000

# 5) al arrancar el contenedor aplica migraciones y levanta
CMD sh -lc "npx prisma migrate deploy || npx prisma db push; node dist/server.js"
