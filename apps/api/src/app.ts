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

  app.setErrorHandler((error: Error, _request, reply) => {
    if (error.message === "Unauthorized") {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    app.log.error(error);
    return reply.status(500).send({ error: "Internal server error" });
  });

  await registerRoutes(app);

  return app;
}
