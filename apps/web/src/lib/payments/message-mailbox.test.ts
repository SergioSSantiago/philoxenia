import { describe, expect, it } from "vitest";
import { channelIdForPair, messageMailboxAddress } from "./message-mailbox";

describe("channelIdForPair", () => {
  it("is order-independent", () => {
    const a = "0xaaa";
    const b = "0xbbb";
    expect(channelIdForPair(a, b)).toBe(channelIdForPair(b, a));
    expect(channelIdForPair(a, b)).toMatch(/^0x[0-9a-f]+$/);
  });
});

describe("messageMailboxAddress", () => {
  it("defaults to the mainnet mailbox", () => {
    expect(messageMailboxAddress()).toMatch(/^0x00db59cc/);
  });
});
