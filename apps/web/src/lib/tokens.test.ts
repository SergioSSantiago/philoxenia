import { describe, expect, it } from "vitest";
import {
  escrowAddressForAsset,
  STRK20_PRIVACY_ENABLED,
  SUPPORTED_PAYMENT_ASSETS,
  tokenAddressForAsset,
} from "@/lib/tokens";

describe("tokens", () => {
  it("maps STRK and DAI to distinct mainnet contracts", () => {
    expect(tokenAddressForAsset("STRK")).not.toBe(tokenAddressForAsset("DAI"));
    expect(escrowAddressForAsset("STRK")).not.toBe(escrowAddressForAsset("DAI"));
    expect(SUPPORTED_PAYMENT_ASSETS).toEqual(["STRK", "DAI"]);
  });

  it("keeps STRK20 on unless explicitly disabled", () => {
    expect(STRK20_PRIVACY_ENABLED).toBe(true);
  });
});
