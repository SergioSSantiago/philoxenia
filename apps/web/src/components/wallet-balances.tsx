"use client";

import { Component, type ReactNode } from "react";
import { useAccount, useBalance } from "@starknet-react/core";
import { useAuth } from "@/lib/auth-context";
import {
  DAI_TOKEN_ADDRESS,
  STRK20_PRIVACY_ENABLED,
  STRK_TOKEN_ADDRESS,
} from "@/lib/tokens";

function BalanceRow({
  label,
  amount,
  loading,
  hint,
  error,
}: {
  label: string;
  amount?: string;
  loading: boolean;
  hint?: string;
  error?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      <p className="shrink-0 text-right font-mono text-sm text-foreground">
        {loading ? "…" : error ? "—" : (amount ?? "—")}
      </p>
    </div>
  );
}

function WalletBalancesContent({ compact = false }: { compact?: boolean }) {
  const { address, isConnected } = useAccount();
  const { user, connectWallet } = useAuth();

  // Public ERC20 balances only need an address. Prefer the live Ready
  // connection; fall back to the Philoxenia session wallet (JWT can outlive
  // the connector when autoConnect is off or the extension slept).
  const balanceAddress = (address ?? user?.walletAddress) as
    | `0x${string}`
    | undefined;

  const strk = useBalance({
    address: balanceAddress,
    token: STRK_TOKEN_ADDRESS as `0x${string}`,
    enabled: Boolean(balanceAddress),
  });

  const dai = useBalance({
    address: balanceAddress,
    token: DAI_TOKEN_ADDRESS as `0x${string}`,
    enabled: Boolean(balanceAddress),
  });

  if (!balanceAddress) {
    return (
      <p className="text-sm text-muted">
        Connect your wallet to see STRK and DAI balances.
      </p>
    );
  }

  const strkAmount =
    strk.data && !strk.error ? strk.data.formatted : undefined;
  const daiAmount =
    dai.data && !dai.error ? dai.data.formatted : undefined;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {!compact && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">Your balances</p>
          {STRK20_PRIVACY_ENABLED && (
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
              STRK20 privacy on
            </span>
          )}
        </div>
      )}
      <BalanceRow
        label="STRK"
        amount={strkAmount}
        loading={strk.isLoading}
        error={Boolean(strk.error)}
        hint={
          STRK20_PRIVACY_ENABLED
            ? "Public balance · private STRK via wallet when paying"
            : undefined
        }
      />
      <BalanceRow
        label="DAI"
        amount={daiAmount}
        loading={dai.isLoading}
        error={Boolean(dai.error)}
      />
      {!isConnected && user && (
        <p className="text-xs text-muted">
          Showing balances for your Philoxenia account.{" "}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-foreground"
            onClick={() => void connectWallet()}
          >
            Reconnect Ready X
          </button>{" "}
          to pay or settle.
        </p>
      )}
      {compact && STRK20_PRIVACY_ENABLED && (
        <p className="text-xs text-muted">STRK20 privacy enabled for STRK</p>
      )}
    </div>
  );
}

class WalletBalancesErrorBoundary extends Component<
  { children: ReactNode; compact?: boolean },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <p className="text-sm text-muted">
          Balances unavailable right now. Your wallet is still connected.
        </p>
      );
    }
    return this.props.children;
  }
}

export function WalletBalances({ compact = false }: { compact?: boolean }) {
  return (
    <WalletBalancesErrorBoundary compact={compact}>
      <WalletBalancesContent compact={compact} />
    </WalletBalancesErrorBoundary>
  );
}
