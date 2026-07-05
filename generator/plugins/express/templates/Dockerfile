# syntax=docker/dockerfile:1
# Self-contained — no Node needed on the host (Laws 19-21).
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY . .
EXPOSE 8080
CMD ["node", "src/server.js"]
