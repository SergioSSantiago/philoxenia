import { describe, expect, it } from "vitest";
import { createPaymentProvider } from "./strk20-payment-provider";
import { PublicPaymentProvider } from "./public-payment-provider";

describe("createPaymentProvider", () => {
  it("uses public ERC-20 when privacy is off", () => {
    const provider = createPaymentProvider("STRK", {} as never, "0x1", false);
    expect(provider).toBeInstanceOf(PublicPaymentProvider);
    expect(provider.getCapabilities().privacySupported).toBe(false);
  });
});
