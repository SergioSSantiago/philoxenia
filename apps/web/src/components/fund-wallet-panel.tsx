"use client";

import { useState } from "react";
import type { PaymentAsset } from "@philoxenia/shared";
import { Button } from "@/components/ui";
import { buildLayerswapFundUrl } from "@/lib/on-ramp/layerswap";
import { isSponsoredGasEnabled } from "@/lib/payments/paymaster";

type FundWalletPanelProps = {
  walletAddress: string;
  /** Compact row for Book & pay sheet */
  compact?: boolean;
  /** Pre-select STRK or DAI for Layerswap destination */
  defaultAsset?: PaymentAsset;
};

/**
 * On-ramp via Layerswap — bridge or buy STRK/DAI into the user's Ready X wallet.
 */
export function FundWalletPanel({
  walletAddress,
  compact = false,
  defaultAsset = "STRK",
}: FundWalletPanelProps) {
  const [asset, setAsset] = useState<PaymentAsset>(defaultAsset);

  const fundUrl = buildLayerswapFundUrl({ walletAddress, asset });

  if (compact) {
    return (
      <div className="rounded-xl border border-border bg-background px-3 py-3 text-xs leading-relaxed">
        <p className="font-medium text-foreground">Need STRK or DAI to Book & pay?</p>
        <p className="mt-1 text-muted">
          Add funds to your Ready X wallet with Layerswap (card, bank, or bridge).
          {isSponsoredGasEnabled()
            ? " Philoxenia can sponsor gas on Book & pay when your balance is low on STRK."
            : null}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["STRK", "DAI"] as const).map((token) => (
            <button
              key={token}
              type="button"
              onClick={() => setAsset(token)}
              className={`min-h-9 rounded-lg border px-3 text-xs font-medium ${
                asset === token
                  ? "border-foreground bg-foreground text-surface"
                  : "border-border text-muted"
              }`}
            >
              {token}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mt-3 w-full text-xs"
          onClick={() => window.open(fundUrl, "_blank", "noopener,noreferrer")}
        >
          Add {asset} with Layerswap
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">Add STRK or DAI</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          Bridge or buy into your Ready X wallet with Layerswap — then shield on
          Ready X for Private Book & pay.
          {isSponsoredGasEnabled()
            ? " Public Book & pay gas can be sponsored by Philoxenia."
            : null}
        </p>
      </div>
      <div className="flex gap-2" role="group" aria-label="Asset to receive">
        {(["STRK", "DAI"] as const).map((token) => (
          <button
            key={token}
            type="button"
            onClick={() => setAsset(token)}
            className={`min-h-10 flex-1 rounded-lg border px-3 text-sm font-medium transition ${
              asset === token
                ? "border-foreground bg-foreground text-surface"
                : "border-border bg-surface text-foreground hover:bg-background"
            }`}
          >
            {token}
          </button>
        ))}
      </div>
      <Button
        type="button"
        className="w-full"
        onClick={() => window.open(fundUrl, "_blank", "noopener,noreferrer")}
      >
        Open Layerswap for {asset}
      </Button>
      <p className="text-xs text-muted leading-relaxed">
        Layerswap opens in a new tab. Confirm your Ready X wallet as the
        Starknet destination before you send.
      </p>
    </div>
  );
}
