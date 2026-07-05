# syntax=docker/dockerfile:1
# Multi-stage build: build the static bundle with Node, serve it with nginx.
# Self-contained — no Node needed on the host (Laws 19-21).

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
