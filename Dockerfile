FROM eclipse-temurin:22-jdk-alpine

WORKDIR /app

COPY src/main/resources/static/pdf /app/pdf
COPY target/archi-web-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

CMD ["java", "-jar", "app.jar"]
