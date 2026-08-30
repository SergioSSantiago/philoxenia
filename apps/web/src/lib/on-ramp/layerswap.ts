import type { PaymentAsset } from "@philoxenia/shared";

const LAYERSWAP_APP = "https://layerswap.io/app/";

export type LayerswapFundOptions = {
  walletAddress: string;
  asset: PaymentAsset;
  /** STRK default; DAI maps to Layerswap's DAI asset name on Starknet. */
};

export function layerswapDestinationAsset(asset: PaymentAsset): string {
  return asset;
}

/**
 * Layerswap hosted page — bridge or buy into Starknet with destination prefilled.
 * @see https://docs.layerswap.io/integration/UI/HostedPage
 */
export function buildLayerswapFundUrl(options: LayerswapFundOptions): string {
  const params = new URLSearchParams({
    to: "STARKNET_MAINNET",
    toAsset: layerswapDestinationAsset(options.asset),
    destAddress: options.walletAddress,
    clientId: "philoxenia",
    actionButtonText: `Receive ${options.asset} on Starknet`,
    defaultTab: "swap",
  });
  return `${LAYERSWAP_APP}?${params.toString()}`;
}
