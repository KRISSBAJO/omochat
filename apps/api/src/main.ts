import "./env";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { getAllowedOrigins, getServerPort } from "./config/runtime";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: getAllowedOrigins(),
    credentials: true
  });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true
    })
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Omochat API")
    .setDescription("Realtime chat API for conversations, messages, media, presence, and future enterprise modules.")
    .setVersion("0.1.0")
    .addBearerAuth({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
      description: "Use Authorization: Bearer <access_token>. This is the best default for mobile clients."
    })
    .addCookieAuth("refresh_token", {
      type: "apiKey",
      in: "cookie",
      name: "refresh_token",
      description: "Recommended for browser refresh-token rotation when same-site cookie delivery is available."
    })
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, swaggerDocument);

  await app.listen(getServerPort(), "0.0.0.0");
}

void bootstrap();
