FROM node:18

WORKDIR /app

# 1. Copiar dependencias
COPY package*.json ./

# 2. Instalar dependencias
RUN npm install

# 3. Copiar código fuente
COPY . .

# 4. Generar cliente Prisma
RUN npx prisma generate

# 5. Compilar TypeScript
RUN npm run build

# 6. Exponer puerto
EXPOSE 8000

# 7. Ejecutar en modo producción
CMD ["npm", "start"]
