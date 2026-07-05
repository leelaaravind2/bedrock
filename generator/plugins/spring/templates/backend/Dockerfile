# syntax=docker/dockerfile:1
# Multi-stage build: compile with Maven, run on a slim JRE.
# Self-contained — no Maven/JDK needed on the host (Laws 19-21).

FROM maven:3.9-eclipse-temurin-__JAVA_VERSION__ AS build
WORKDIR /app
# Resolve dependencies first for better layer caching.
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
# No -q here: build output (incl. compile errors) must stay visible.
RUN mvn -B clean package -DskipTests

FROM eclipse-temurin:__JAVA_VERSION__-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
