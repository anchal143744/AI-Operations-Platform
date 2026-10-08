import "reflect-metadata";
import {
  BadRequestException,
  ValidationPipe,
  type ValidationError,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  json,
  urlencoded,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import { AppModule } from "./app.module.js";
import { isLoopbackOrigin } from "./auth/auth.config.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const appOrigin = new URL(process.env.APP_ORIGIN ?? "http://localhost:3000")
    .origin;

  app.use(helmet());
  app.use(
    "/activity",
    (_request: Request, response: Response, next: NextFunction) => {
      response.setHeader("Cache-Control", "no-store");
      next();
    },
  );
  app.use(
    "/auth",
    (_request: Request, response: Response, next: NextFunction) => {
      response.setHeader("Cache-Control", "no-store");
      response.setHeader("Pragma", "no-cache");
      next();
    },
  );
  app.use(
    "/leads",
    (_request: Request, response: Response, next: NextFunction) => {
      response.setHeader("Cache-Control", "no-store");
      next();
    },
  );
  app.use(
    "/follow-ups",
    (_request: Request, response: Response, next: NextFunction) => {
      response.setHeader("Cache-Control", "no-store");
      next();
    },
  );
  app.use(
    "/settings",
    (_request: Request, response: Response, next: NextFunction) => {
      response.setHeader("Cache-Control", "no-store");
      next();
    },
  );
  app.use(
    "/organizations",
    (_request: Request, response: Response, next: NextFunction) => {
      response.setHeader("Cache-Control", "no-store");
      next();
    },
  );
  app.use(
    "/conversations",
    (_request: Request, response: Response, next: NextFunction) => {
      response.setHeader("Cache-Control", "no-store");
      next();
    },
  );
  for (const path of ["/workflows", "/approvals"]) {
    app.use(
      path,
      (_request: Request, response: Response, next: NextFunction) => {
        response.setHeader("Cache-Control", "no-store");
        next();
      },
    );
  }
  app.use(json({ limit: "100kb" }));
  app.use(urlencoded({ extended: false, limit: "100kb" }));
  app.enableCors({
    origin: appOrigin,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "X-AOP-Organization-Id",
      "X-AOP-Workspace-Id",
    ],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (_errors: ValidationError[]) =>
        new BadRequestException({
          statusCode: 400,
          code: "VALIDATION_FAILED",
          message: "Check the submitted fields and try again.",
        }),
    }),
  );
  app.enableShutdownHooks();
  const localEmailPreview =
    process.env.NODE_ENV === "development" &&
    (process.env.AUTH_EMAIL_TRANSPORT ?? "development") === "development" &&
    isLoopbackOrigin(appOrigin);
  const configuredPort =
    process.env.NODE_ENV === "production"
      ? (process.env.PORT ?? process.env.API_PORT)
      : (process.env.API_PORT ?? process.env.PORT);
  const port = Number(configuredPort ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("API port must be an integer between 1 and 65535.");
  }
  await app.listen(port, localEmailPreview ? "127.0.0.1" : "0.0.0.0");
}

void bootstrap().catch((error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "EADDRINUSE"
  ) {
    process.stderr.write(
      "API port is already in use. Use the existing local server or stop it before restarting.\n",
    );
  } else {
    // Startup exceptions can contain connection strings or provider details.
    // Emit only a stable diagnostic code; secrets belong in the secret manager,
    // never in process logs.
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string" &&
      /^[A-Z][A-Z0-9_]{1,20}$/.test(error.code)
        ? error.code
        : "STARTUP_FAILED";
    process.stderr.write(`API startup failed (${code}).\n`);
  }
  process.exitCode = 1;
});
