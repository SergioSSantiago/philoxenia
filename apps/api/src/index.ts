import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { registerRoutes } from "./routes/index.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  credentials: true,
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

const port = Number(process.env.API_PORT ?? 4000);
const host = process.env.API_HOST ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
