"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@starknet-react/core";
import type { PaymentAsset } from "@philoxenia/shared";
import { ActionNotice } from "@/components/action-notice";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { createStrk20Provider } from "@/lib/payments/strk20-payment-provider";
import { diagnosePrivacyWallet } from "@/lib/payments/wallet-account-v6";
import { STRK20_PRIVACY_ENABLED } from "@/lib/tokens";
import { formatWalletError } from "@/lib/wallet-errors";

type NoticeState = {
  title: string;
  body: string;
  tone: "warn" | "error" | "info";
  primaryLabel?: string;
  secondaryLabel?: string;
  /** Secondary closes notice unless reload is set. */
  reloadOnSecondary?: boolean;
};

/**
 * Shield / unshield STRK or DAI via Ready X WalletAccountV6.
 * Deposit amounts are public ERC-20 legs — labeled honestly.
 * Requires a live Ready X signing session (JWT alone is not enough).
 */
export function Strk20PrivacyPanel() {
  const { account, address } = useAccount();
  const { reconnectWallet } = useAuth();
  const [asset, setAsset] = useState<PaymentAsset>("STRK");
  const [capable, setCapable] = useState(false);
  const [hint, setHint] = useState("");
  const [privateBal, setPrivateBal] = useState<string | null>(null);
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [msg, setMsg] = useState("");
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const walletReady = Boolean(account && address);

  const refreshPrivate = useCallback(async () => {
    if (!account || !address) {
      setCapable(false);
      setHint("");
      setPrivateBal(null);
      return { capable: false, reason: null as string | null };
    }
    const provider = createStrk20Provider(account, asset);
    const diag = await diagnosePrivacyWallet(address);
    setCapable(diag.capable);
    setHint(diag.reason ?? "");
    if (diag.capable) {
      const bal = await provider.getPrivateBalance();
      setPrivateBal(bal);
    } else {
      setPrivateBal(null);
    }
    return { capable: diag.capable, reason: diag.reason };
  }, [account, address, asset]);

  useEffect(() => {
    if (!STRK20_PRIVACY_ENABLED) return;
    void refreshPrivate();
  }, [refreshPrivate]);

  const reconnectReady = useCallback(async () => {
    setReconnecting(true);
    setMsg("");
    setNotice({
      title: "Reconnecting Ready X",
      body: "Approve in Ready X (unlock if asked). We disconnect first so Private Book & pay can rediscover wallet API ≥ 0.10 — a silent reconnect does nothing when Ready X is already linked.",
      tone: "info",
    });
    try {
      await reconnectWallet();
      let lastReason: string | null = null;
      let ok = false;
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 280));
        const diag = await diagnosePrivacyWallet();
        lastReason = diag.reason;
        if (diag.capable) {
          ok = true;
          break;
        }
      }
      const refreshed = await refreshPrivate();
      ok = ok || refreshed.capable;
      lastReason = refreshed.reason ?? lastReason;

      if (ok) {
        setNotice({
          title: "Private balances ready",
          body: "Ready X reported a privacy-capable session. You can shield and unshield STRK or DAI now.",
          tone: "info",
          primaryLabel: "Got it",
        });
      } else {
        setNotice({
          title: "Still not privacy-capable",
          body:
            lastReason ??
            "Ready X connected, but Private needs Smart Wallet + Private (API ≥ 0.10).",
          tone: "warn",
          primaryLabel: "Try again",
          secondaryLabel: "Refresh page",
          reloadOnSecondary: true,
        });
      }
    } catch (err) {
      setNotice({
        title: "Could not reconnect Ready X",
        body: formatWalletError(err),
        tone: "error",
        primaryLabel: "Try again",
        secondaryLabel: "Refresh page",
        reloadOnSecondary: true,
      });
    } finally {
      setReconnecting(false);
    }
  }, [reconnectWallet, refreshPrivate]);

  async function run(action: "shield" | "unshield") {
    if (!account || !address) {
      await reconnectReady();
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const provider = createStrk20Provider(account, asset);
      if (action === "shield") {
        setMsg(
          `Approve ${asset} deposit (public amount), then the private proof…`
        );
        const { txHash } = await provider.shield(amount);
        setMsg(`Shielded ${asset}. Tx ${txHash.slice(0, 10)}…`);
      } else {
        setMsg(`Unshielding ${asset} to your public balance…`);
        const { txHash } = await provider.unshield(amount, address);
        setMsg(`Unshielded ${asset}. Tx ${txHash.slice(0, 10)}…`);
      }
      await refreshPrivate();
    } catch (e) {
      const body = formatWalletError(e);
      const needsReconnect =
        /not connected|reconnect|wallet api|Ready X|STRK20|privacy|signing|session/i.test(
          body
        );
      setNotice({
        title: needsReconnect ? "Ready X session needed" : "Could not shield or unshield STRK or DAI",
        body,
        tone: "error",
        primaryLabel: needsReconnect ? "Reconnect Ready X" : "Dismiss",
        secondaryLabel: needsReconnect ? "Refresh page" : "Dismiss",
        reloadOnSecondary: needsReconnect,
      });
    } finally {
      setBusy(false);
    }
  }

  if (!STRK20_PRIVACY_ENABLED) return null;

  return (
    <>
      <div className="space-y-3 rounded-xl border border-border bg-background p-4">
        <div>
          <p className="text-sm font-medium text-foreground">
            Shield for Private Book & pay
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Shielded balances for Private Book & pay (wallet-mediated).
            Shield and unshield amounts are public on-chain.
          </p>
        </div>

        {!walletReady ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
              Ready X is not connected for signing. Connect to view shielded
              STRK or DAI for Private Book & pay.
            </div>
            <Button
              type="button"
              disabled={reconnecting}
              onClick={() => void reconnectReady()}
            >
              {reconnecting ? "Connecting Ready X…" : "Connect Ready X"}
            </Button>
          </div>
        ) : !capable ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
              {hint ||
                "This Ready X wallet does not expose STRK20 yet (needs wallet API ≥ 0.10)."}
            </div>
            <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-muted">
              <li>
                Desktop: unlock Ready X in Chrome (not Firefox). iPhone: open
                Philoxenia in the Ready X in-app browser for Private Book & pay.
              </li>
              <li>Enable Smart Wallet and Private.</li>
              <li>Tap Reconnect Ready X and approve again.</li>
            </ol>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                disabled={reconnecting}
                onClick={() => void reconnectReady()}
              >
                {reconnecting ? "Reconnecting…" : "Reconnect Ready X"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={reconnecting}
                onClick={() => window.location.reload()}
              >
                Refresh page
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2" role="group" aria-label="Token">
              {(["STRK", "DAI"] as const).map((token) => (
                <button
                  key={token}
                  type="button"
                  disabled={busy || reconnecting}
                  onClick={() => {
                    setAsset(token);
                    setMsg("");
                  }}
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
            <p className="font-mono text-sm text-foreground">
              {privateBal == null ? "…" : `${privateBal} ${asset}`}
            </p>
            <label className="block text-xs text-muted">
              Amount ({asset})
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground"
                disabled={busy}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="min-h-10 px-4 text-xs"
                disabled={busy || reconnecting}
                onClick={() => void run("shield")}
              >
                Shield {asset}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-10 px-4 text-xs"
                disabled={busy || reconnecting}
                onClick={() => void run("unshield")}
              >
                Unshield {asset}
              </Button>
            </div>
            {msg ? <p className="text-xs text-foreground">{msg}</p> : null}
          </>
        )}
      </div>

      <ActionNotice
        open={Boolean(notice)}
        title={notice?.title ?? ""}
        body={notice?.body ?? ""}
        tone={notice?.tone ?? "warn"}
        busy={reconnecting || busy}
        primaryLabel={notice?.primaryLabel}
        secondaryLabel={notice?.secondaryLabel ?? "Dismiss"}
        onPrimary={() => {
          const label = notice?.primaryLabel;
          if (
            label === "Connect Ready" ||
            label === "Connect Ready X" ||
            label === "Reconnect Ready" ||
            label === "Reconnect Ready X" ||
            label === "Try again"
          ) {
            void reconnectReady();
            return;
          }
          setNotice(null);
        }}
        onSecondary={() => {
          if (notice?.reloadOnSecondary) {
            window.location.reload();
            return;
          }
          setNotice(null);
        }}
      />
    </>
  );
}
