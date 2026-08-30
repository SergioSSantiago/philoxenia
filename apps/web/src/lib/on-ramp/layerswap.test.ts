import { describe, expect, it } from "vitest";
import { buildLayerswapFundUrl } from "@/lib/on-ramp/layerswap";

describe("buildLayerswapFundUrl", () => {
  it("prefills Starknet destination and asset", () => {
    const url = buildLayerswapFundUrl({
      walletAddress:
        "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      asset: "STRK",
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe("https://layerswap.io/app/");
    expect(parsed.searchParams.get("to")).toBe("STARKNET_MAINNET");
    expect(parsed.searchParams.get("toAsset")).toBe("STRK");
    expect(parsed.searchParams.get("destAddress")).toMatch(/^0x/);
    expect(parsed.searchParams.get("clientId")).toBe("philoxenia");
  });

  it("supports DAI destination", () => {
    const url = buildLayerswapFundUrl({
      walletAddress: "0x1",
      asset: "DAI",
    });
    expect(new URL(url).searchParams.get("toAsset")).toBe("DAI");
  });
});
