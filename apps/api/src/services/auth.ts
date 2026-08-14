import { randomBytes } from "node:crypto";
import { eq, and, gt, isNull, desc } from "drizzle-orm";
import { validateAndParseAddress } from "starknet";
import { db, schema } from "../db/index.js";
import { normalizeWalletAddress } from "../lib/utils.js";

const APP_NAME = "Philoxenia";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function buildAuthMessage(nonce: string): string {
  return `${APP_NAME} authentication\nNonce: ${nonce}\nThis request will not trigger a blockchain transaction.`;
}

export async function createAuthChallenge(walletAddress: string) {
  const normalized = normalizeWalletAddress(walletAddress);
  const nonce = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  await db.insert(schema.authNonces).values({
    walletAddress: normalized,
    nonce,
    expiresAt,
  });

  return {
    message: buildAuthMessage(nonce),
    nonce,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function verifyAuthSignature(
  walletAddress: string,
  signature: string[],
  displayName?: string
) {
  const normalized = normalizeWalletAddress(walletAddress);

  const nonceRecords = await db.query.authNonces.findMany({
    where: and(
      eq(schema.authNonces.walletAddress, normalized),
      gt(schema.authNonces.expiresAt, new Date()),
      isNull(schema.authNonces.usedAt)
    ),
    orderBy: [desc(schema.authNonces.createdAt)],
    limit: 1,
  });

  const nonceRecord = nonceRecords[0];

  if (!nonceRecord) {
    throw new Error("Invalid or expired authentication challenge");
  }

  const message = buildAuthMessage(nonceRecord.nonce);

  try {
    validateAndParseAddress(normalized);
  } catch {
    throw new Error("Invalid wallet address");
  }

  if (!signature[0] || !signature[1]) {
    throw new Error("Invalid signature");
  }

  // MVP: challenge nonce is single-use; signature presence validated.
  // Production should verify via starknet.js verifyMessage against wallet SNIP-12 format.
  void message;

  await db
    .update(schema.authNonces)
    .set({ usedAt: new Date() })
    .where(eq(schema.authNonces.id, nonceRecord.id));

  let user = await db.query.users.findFirst({
    where: eq(schema.users.walletAddress, normalized),
  });

  if (!user) {
    const name =
      displayName?.trim() ||
      `${normalized.slice(0, 6)}…${normalized.slice(-4)}`;

    const [created] = await db
      .insert(schema.users)
      .values({
        walletAddress: normalized,
        displayName: name,
      })
      .returning();

    user = created;
  }

  return user;
}

export function toUserResponse(user: typeof schema.users.$inferSelect) {
  return {
    id: user.id,
    walletAddress: user.walletAddress,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
  };
}
