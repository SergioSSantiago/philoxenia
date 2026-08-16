import type { FastifyRequest } from "fastify";
import { db, schema } from "../db/index.js";

export async function writeAuditLog(input: {
  action: string;
  actorUserId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  meta?: Record<string, unknown> | null;
  request?: FastifyRequest;
}) {
  const ip =
    (input.request?.headers["x-forwarded-for"] as string | undefined)
      ?.split(",")[0]
      ?.trim() ||
    input.request?.ip ||
    null;

  try {
    await db.insert(schema.auditLogs).values({
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      meta: input.meta ? JSON.stringify(input.meta) : null,
      ip,
    });
  } catch (err) {
    // Never fail the user action because of audit write
    console.error("[audit]", input.action, err);
  }
}
