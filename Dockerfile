FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./

RUN npm install --omit=dev

COPY backend .

EXPOSE 4000

CMD ["sh", "-c", "node src/migrate.js && node src/seed.js && node src/index.js"]
