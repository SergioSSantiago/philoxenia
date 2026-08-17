import { describe, expect, it } from "vitest";
import {
  txHashVariants,
  uuidToOnChainId,
  weiToTokenAmount,
} from "./verify-booking-tx.js";

describe("uuidToOnChainId", () => {
  it("uses the first 16 hex chars of the UUID", () => {
    expect(uuidToOnChainId("56f4c573-5f7b-46b7-abcd-1234567890ab")).toBe(
      BigInt("0x56f4c5735f7b46b7")
    );
  });
});

describe("weiToTokenAmount", () => {
  it("formats 18-decimal token amounts", () => {
    expect(weiToTokenAmount(433625520000000000n)).toBe("0.43362552");
    expect(weiToTokenAmount(10n ** 18n)).toBe("1");
  });
});

describe("txHashVariants", () => {
  it("includes padded and short forms", () => {
    const variants = txHashVariants(
      "0x5bac436e2a9775719de94e0ec1ea62f1cbc9737b23dd780230df66a53cc7813"
    );
    expect(variants.some((h) => h.startsWith("0x") && h.length === 66)).toBe(
      true
    );
    expect(variants).toContain(
      "0x5bac436e2a9775719de94e0ec1ea62f1cbc9737b23dd780230df66a53cc7813"
    );
  });
});
