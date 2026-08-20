/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  ensureMessageKeyPair,
  isSealedBody,
  previewBody,
  SEALED_PLAINTEXT_MAX,
  sealMessage,
  unsealMessage,
} from "./chat-crypto";

describe("sealed chat", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("detects phx1 bodies", () => {
    expect(isSealedBody("phx1.a.b.c.d.e")).toBe(true);
    expect(isSealedBody("hello")).toBe(false);
  });

  it("round-trips a dual-recipient sealed note for sender and recipient", async () => {
    const alice = "0xaaa";
    const bob = "0xbbb";
    const alicePub = await ensureMessageKeyPair(alice);
    const bobPub = await ensureMessageKeyPair(bob);
    expect(await ensureMessageKeyPair(alice)).toBe(alicePub);

    const sealed = await sealMessage(alice, bobPub, "see you in Florence");
    expect(isSealedBody(sealed)).toBe(true);
    expect(sealed.split(".")).toHaveLength(6);

    expect(await unsealMessage(alice, sealed)).toBe("see you in Florence");
    expect(await unsealMessage(bob, sealed)).toBe("see you in Florence");
    expect(await unsealMessage("0xccc", sealed)).toBeNull();
  });

  it("rejects oversized plaintext", async () => {
    const alice = "0xaaa";
    const bob = "0xbbb";
    await ensureMessageKeyPair(alice);
    const bobPub = await ensureMessageKeyPair(bob);
    await expect(
      sealMessage(alice, bobPub, "x".repeat(SEALED_PLAINTEXT_MAX + 1))
    ).rejects.toThrow(/at most/i);
  });

  it("previews sealed notes without throwing", async () => {
    expect(await previewBody(undefined, "hi")).toBe("hi");
    expect(await previewBody("0x1", "phx1.nope")).toBe("Sealed note");
    expect(await previewBody("0x1", "")).toBe("");
  });
});
