# syntax=docker/dockerfile:1
# Self-contained — no Go needed on the host (Laws 19-21).
FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY . .
RUN CGO_ENABLED=0 go build -mod=mod -o /usr/local/bin/server .

FROM alpine:3.20
WORKDIR /app
COPY --from=build /usr/local/bin/server ./server
COPY migrations ./migrations
EXPOSE 8080
CMD ["./server"]
