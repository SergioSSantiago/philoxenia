import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAvnuClientOptions,
  getAvnuSwapPaymasterParams,
  paymasterProxyUrl,
} from "./client";

describe("paymasterProxyUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses same-origin proxy in the browser", () => {
    expect(paymasterProxyUrl()).toBe("http://localhost:3000/api/paymaster");
  });

  it("returns relative path on the server", () => {
    vi.stubGlobal("window", undefined);
    expect(paymasterProxyUrl()).toBe("/api/paymaster");
  });
});

describe("getAvnuClientOptions", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns paymasterBaseUrl when sponsored gas is enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_SPONSORED_GAS", "true");
    expect(getAvnuClientOptions()).toEqual({
      paymasterBaseUrl: paymasterProxyUrl(),
    });
  });

  it("returns undefined when sponsored gas is disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_SPONSORED_GAS", "false");
    expect(getAvnuClientOptions()).toBeUndefined();
  });
});

describe("getAvnuSwapPaymasterParams", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns sponsored paymaster params when enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_SPONSORED_GAS", "true");
    const params = getAvnuSwapPaymasterParams();
    expect(params?.active).toBe(true);
    expect(params?.params).toEqual({
      version: "0x1",
      feeMode: { mode: "sponsored" },
    });
  });
});
