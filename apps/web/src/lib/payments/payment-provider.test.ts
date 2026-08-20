import { describe, expect, it } from "vitest";
import { hasCapability, privacyLabel } from "./payment-provider";
import { PublicPaymentProvider } from "./public-payment-provider";

describe("privacyLabel", () => {
  it("names the two Book & pay modes", () => {
    expect(privacyLabel("private")).toBe("Private");
    expect(privacyLabel("public")).toBe("Public");
  });
});

describe("PublicPaymentProvider capabilities", () => {
  it("never claims STRK20 privacy", () => {
    const provider = new PublicPaymentProvider("STRK", {} as never, "0x1");
    expect(provider.getCapabilities().privacySupported).toBe(false);
    expect(hasCapability(provider, "publicTransfer")).toBe(true);
    expect(hasCapability(provider, "shield")).toBe(false);
  });
});
