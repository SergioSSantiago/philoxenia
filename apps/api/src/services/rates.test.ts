import { afterEach, describe, expect, it, vi } from "vitest";
import { daiToStrk, getStrkPerDai } from "./rates.js";

describe("daiToStrk", () => {
  it("multiplies DAI by STRK-per-DAI and trims zeros", () => {
    expect(daiToStrk("10", 2)).toBe("20");
    expect(daiToStrk("1", 0.0433)).toBe("0.0433");
  });

  it("rejects invalid DAI amounts", () => {
    expect(() => daiToStrk("nope", 1)).toThrow(/valid DAI/i);
    expect(() => daiToStrk("-1", 1)).toThrow(/valid DAI/i);
  });
});

describe("getStrkPerDai", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("computes STRK per DAI from CoinGecko USD prices", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ starknet: { usd: 0.5 }, dai: { usd: 1 } }),
      }))
    );
    const quote = await getStrkPerDai({ fresh: true });
    expect(quote.source).toBe("coingecko");
    expect(quote.strkPerDai).toBe(2);
    expect(quote.usdPerStrk).toBe(0.5);
    expect(quote.usdPerDai).toBe(1);
  });

  it("falls back when the feed is down", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network");
      })
    );
    const quote = await getStrkPerDai({ fresh: true });
    expect(quote.source).toBe("fallback");
    expect(quote.strkPerDai).toBeGreaterThan(0);
    expect(quote.usdPerStrk).toBeNull();
  });
});
