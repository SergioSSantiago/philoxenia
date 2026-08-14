import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "../src/app.js";

let init: Promise<void> | null = null;
let server: Awaited<ReturnType<typeof buildApp>>["server"] | null = null;

async function ensureReady() {
  if (!init) {
    init = (async () => {
      const app = await buildApp();
      await app.ready();
      server = app.server;
    })();
  }
  await init;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  await ensureReady();
  server!.emit("request", req, res);
}
