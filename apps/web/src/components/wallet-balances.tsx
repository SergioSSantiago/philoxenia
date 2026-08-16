"use client";

import { Component, type ReactNode } from "react";
import { useAccount, useBalance } from "@starknet-react/core";
import { formatTokenAmount } from "@philoxenia/shared";
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
  const display =
    loading ? "…" : error ? "—" : amount != null ? formatTokenAmount(amount, 6) : "—";

  return (
    <div className="flex min-w-0 items-start justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && (
          <p className="mt-0.5 text-xs leading-snug text-muted">{hint}</p>
        )}
      </div>
      <p
        className="max-w-[48%] shrink-0 truncate text-right font-mono text-sm tabular-nums text-foreground"
        title={!loading && !error && amount ? amount : undefined}
      >
        {display}
      </p>
    </div>
  );
}

function WalletBalancesContent({ compact = false }: { compact?: boolean }) {
  const { address, isConnected } = useAccount();
  const { user, reconnectWallet } = useAuth();

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
    <div className={`min-w-0 ${compact ? "space-y-2" : "space-y-3"}`}>
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
            ? compact
              ? "Public · shield on Profile"
              : "Public balance · shield on Profile for private STRK"
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
        <p className="text-xs leading-relaxed text-muted">
          Public balances from your session.{" "}
          <button
            type="button"
            className="font-medium text-accent underline-offset-2 hover:underline"
            onClick={() => void reconnectWallet()}
          >
            Connect Ready X
          </button>{" "}
          only when you need to sign (shield, private pay, settle).
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
