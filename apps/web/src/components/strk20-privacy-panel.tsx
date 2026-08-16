"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "@starknet-react/core";
import { ActionNotice } from "@/components/action-notice";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { createStrk20Provider } from "@/lib/payments/strk20-payment-provider";
import { diagnosePrivacyWallet } from "@/lib/payments/wallet-account-v6";
import { STRK20_PRIVACY_ENABLED } from "@/lib/tokens";
import { formatWalletError } from "@/lib/wallet-errors";

/**
 * Shield / unshield STRK via Ready WalletAccountV6.
 * Deposit amounts are public ERC-20 legs — labeled honestly.
 * Requires a live Ready signing session (JWT alone is not enough).
 */
export function Strk20PrivacyPanel() {
  const { account, address } = useAccount();
  const { user, connectWallet } = useAuth();
  const [capable, setCapable] = useState(false);
  const [hint, setHint] = useState("");
  const [privateBal, setPrivateBal] = useState<string | null>(null);
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [msg, setMsg] = useState("");
  const [notice, setNotice] = useState<{
    title: string;
    body: string;
    tone: "warn" | "error" | "info";
    primaryLabel?: string;
  } | null>(null);
  const autoConnectTried = useRef(false);

  const walletReady = Boolean(account && address);

  const refreshPrivate = useCallback(async () => {
    if (!account || !address) {
      setCapable(false);
      setHint("");
      setPrivateBal(null);
      return;
    }
    const provider = createStrk20Provider(account, "STRK");
    const diag = await diagnosePrivacyWallet(address);
    setCapable(diag.capable);
    setHint(diag.reason ?? "");
    if (diag.capable) {
      const bal = await provider.getPrivateBalance();
      setPrivateBal(bal);
    } else {
      setPrivateBal(null);
    }
  }, [account, address]);

  useEffect(() => {
    if (!STRK20_PRIVACY_ENABLED) return;
    void refreshPrivate();
  }, [refreshPrivate]);

  const reconnectReady = useCallback(async () => {
    setReconnecting(true);
    setMsg("");
    setNotice({
      title: "Connecting Ready",
      body: "Approve the connection in Ready X (unlock if needed). Shielded STRK needs a live signing session — Philoxenia login alone cannot manage private balances.",
      tone: "info",
    });
    try {
      await connectWallet();
      setNotice({
        title: "Ready connected",
        body: "You can shield and unshield STRK now.",
        tone: "info",
        primaryLabel: "Got it",
      });
    } catch (err) {
      setNotice({
        title: "Could not connect Ready",
        body: formatWalletError(err),
        tone: "error",
        primaryLabel: "Try again",
      });
    } finally {
      setReconnecting(false);
    }
  }, [connectWallet]);

  // If the user is signed into Philoxenia but Ready is idle, force reconnect once.
  useEffect(() => {
    if (!STRK20_PRIVACY_ENABLED) return;
    if (!user) return;
    if (walletReady) return;
    if (autoConnectTried.current) return;
    autoConnectTried.current = true;
    void reconnectReady();
  }, [user, walletReady, reconnectReady]);

  async function run(action: "shield" | "unshield") {
    if (!account || !address) {
      await reconnectReady();
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const provider = createStrk20Provider(account, "STRK");
      if (action === "shield") {
        setMsg("Approve deposit (public amount), then the private proof…");
        const { txHash } = await provider.shield(amount);
        setMsg(`Shielded. Tx ${txHash.slice(0, 10)}…`);
      } else {
        setMsg("Unshielding to your public balance…");
        const { txHash } = await provider.unshield(amount, address);
        setMsg(`Unshielded. Tx ${txHash.slice(0, 10)}…`);
      }
      await refreshPrivate();
    } catch (e) {
      const body = formatWalletError(e);
      const needsReconnect =
        /not connected|reconnect|wallet api|Ready X|STRK20|privacy|signing|session/i.test(
          body
        );
      setNotice({
        title: needsReconnect ? "Ready session needed" : "STRK20 action failed",
        body,
        tone: "error",
        primaryLabel: needsReconnect ? "Connect Ready" : "Dismiss",
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
          <p className="text-sm font-medium text-foreground">Private STRK</p>
          <p className="mt-0.5 text-xs text-muted">
            Shielded balance (wallet-mediated). Deposit/withdraw amounts are
            public onchain.
          </p>
        </div>

        {!walletReady ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
              Ready is not connected for signing. Connect to view and manage
              your shielded STRK balance.
            </div>
            <Button
              type="button"
              disabled={reconnecting}
              onClick={() => void reconnectReady()}
            >
              {reconnecting ? "Connecting Ready…" : "Connect Ready"}
            </Button>
          </div>
        ) : !capable ? (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-muted">
              {hint ||
                "This wallet does not expose STRK20 yet (needs wallet API ≥ 0.10). Use Public ERC-20 on booking pay, or update Ready X with Smart Wallet + Private."}
            </p>
            <Button
              type="button"
              variant="secondary"
              disabled={reconnecting}
              onClick={() => void reconnectReady()}
            >
              {reconnecting ? "Reconnecting…" : "Reconnect Ready"}
            </Button>
          </div>
        ) : (
          <>
            <p className="font-mono text-sm text-foreground">
              {privateBal == null ? "…" : `${privateBal} STRK`}
            </p>
            <label className="block text-xs text-muted">
              Amount
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
                disabled={busy}
                onClick={() => void run("shield")}
              >
                Shield
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-h-10 px-4 text-xs"
                disabled={busy}
                onClick={() => void run("unshield")}
              >
                Unshield
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
        onPrimary={() => {
          if (
            notice?.primaryLabel === "Connect Ready" ||
            notice?.primaryLabel === "Try again"
          ) {
            void reconnectReady();
            return;
          }
          setNotice(null);
        }}
        onSecondary={() => setNotice(null)}
      />
    </>
  );
}
