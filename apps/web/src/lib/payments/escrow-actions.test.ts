import { describe, expect, it } from "vitest";
import { onChainIdFromUuid } from "./escrow-actions";

describe("onChainIdFromUuid", () => {
  it("uses the first 16 hex chars of the UUID", () => {
    expect(onChainIdFromUuid("56f4c573-5f7b-46b7-abcd-1234567890ab")).toBe(
      BigInt("0x56f4c5735f7b46b7").toString()
    );
  });
});
