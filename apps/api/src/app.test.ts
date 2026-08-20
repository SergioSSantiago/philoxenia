import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

describe("HTTP app", () => {
  it("serves /health without a database", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
    await app.close();
  });

  it("rejects malformed auth challenge bodies with 400", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/auth/challenge",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBeTruthy();
    await app.close();
  });

  it("requires a session for /auth/me", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/auth/me" });
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatch(/Connect Ready X/i);
    await app.close();
  });
});
