import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { registerRoutes } from "./routes/index.js";

function parseCorsOrigins(): string[] | true {
  const raw = process.env.CORS_ORIGIN;
  if (!raw || raw === "*") return true;
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}

export async function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "production",
    bodyLimit: 8 * 1024 * 1024,
  });

  await app.register(cors, {
    origin: parseCorsOrigins(),
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
  });

  app.setErrorHandler((error: Error & { validation?: unknown }, _request, reply) => {
    if (error.message === "Unauthorized") {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    // Zod / Fastify validation — surface a clear message instead of a blank 500
    if (
      error.name === "ZodError" ||
      Array.isArray(error.validation) ||
      error.message?.includes("Invalid")
    ) {
      return reply.status(400).send({ error: error.message || "Invalid request" });
    }
    app.log.error(error);
    const detail =
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : error.message || "Internal server error";
    return reply.status(500).send({ error: detail });
  });

  await registerRoutes(app);

  return app;
}
