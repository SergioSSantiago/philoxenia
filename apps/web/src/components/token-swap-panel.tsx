"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "@starknet-react/core";
import type { Quote } from "@avnu/avnu-sdk";
import type { PaymentAsset } from "@philoxenia/shared";
import { ActionNotice } from "@/components/action-notice";
import { Button, TextInput } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import {
  AVNU_SWAP_SLIPPAGE,
  executeAvnuSwap,
  formatSwapAmount,
  quoteAvnuSwap,
} from "@/lib/payments/avnu-swap";
import { formatWalletError } from "@/lib/wallet-errors";

/**
 * Public STRK ↔ DAI swap via AVNU aggregator (Ready signs).
 */
export function TokenSwapPanel() {
  const { account, address } = useAccount();
  const { user, reconnectWallet } = useAuth();
  const [sellAsset, setSellAsset] = useState<PaymentAsset>("STRK");
  const buyAsset: PaymentAsset = sellAsset === "STRK" ? "DAI" : "STRK";
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [msg, setMsg] = useState("");
  const [notice, setNotice] = useState<{
    title: string;
    body: string;
    tone: "warn" | "error" | "info";
    primaryLabel?: string;
  } | null>(null);
  const quoteReq = useRef(0);
  const walletReady = Boolean(account && address);

  const refreshQuote = useCallback(async () => {
    if (!address || !amount.trim()) {
      setQuote(null);
      return;
    }
    const req = ++quoteReq.current;
    setQuoting(true);
    try {
      const next = await quoteAvnuSwap({
        sellAsset,
        buyAsset,
        sellAmount: amount,
        takerAddress: address,
      });
      if (req === quoteReq.current) setQuote(next);
    } catch (err) {
      if (req === quoteReq.current) {
        setQuote(null);
        setMsg(formatWalletError(err));
      }
    } finally {
      if (req === quoteReq.current) setQuoting(false);
    }
  }, [address, amount, buyAsset, sellAsset]);

  useEffect(() => {
    setMsg("");
    const t = window.setTimeout(() => {
      void refreshQuote();
    }, 400);
    return () => window.clearTimeout(t);
  }, [refreshQuote]);

  const reconnectReady = useCallback(async () => {
    setReconnecting(true);
    setNotice({
      title: "Connecting Ready",
      body: "Approve the connection in Ready X. Swaps need a live signing session.",
      tone: "info",
    });
    try {
      await reconnectWallet();
      setNotice({
        title: "Ready connected",
        body: "You can quote and swap STRK ↔ DAI now.",
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
  }, [reconnectWallet]);

  function flipDirection() {
    setSellAsset((prev) => (prev === "STRK" ? "DAI" : "STRK"));
    setQuote(null);
    setMsg("");
  }

  async function onSwap() {
    if (!amount.trim()) return;
    if (!account || !address) {
      await reconnectReady();
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      let live = quote;
      if (!live) {
        live = await quoteAvnuSwap({
          sellAsset,
          buyAsset,
          sellAmount: amount,
          takerAddress: address,
        });
        setQuote(live);
      }
      setMsg("Approve in Ready to execute the AVNU swap…");
      const { transactionHash } = await executeAvnuSwap({
        account,
        quote: live,
      });
      setMsg(`Swapped. Tx ${transactionHash.slice(0, 12)}…`);
      setAmount("");
      setQuote(null);
      setNotice({
        title: "Swap submitted",
        body: `AVNU route executed. Tx ${transactionHash}`,
        tone: "info",
        primaryLabel: "Got it",
      });
    } catch (err) {
      const body = formatWalletError(err);
      const needsReconnect =
        /not connected|reconnect|Ready|signing|session|wallet/i.test(body);
      setNotice({
        title: needsReconnect ? "Ready session needed" : "Swap failed",
        body,
        tone: "error",
        primaryLabel: needsReconnect ? "Connect Ready" : "Dismiss",
      });
      setMsg(body);
    } finally {
      setBusy(false);
    }
  }

  // Always render the panel — parent Profile already gates on auth.
  // Returning null here looked like a missing feature when user hydrated late.

  return (
    <>
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">Swap STRK ↔ DAI</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Public swap via{" "}
            <a
              href="https://app.avnu.fi"
              target="_blank"
              rel="noreferrer"
              className="text-accent underline-offset-2 hover:underline"
            >
              AVNU
            </a>
            . Routes aggregate Starknet liquidity. Slippage{" "}
            {(AVNU_SWAP_SLIPPAGE * 100).toFixed(0)}%.
          </p>
        </div>

        {!walletReady && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
            Connect Ready to quote and swap.
            <div className="mt-2">
              <Button
                type="button"
                disabled={reconnecting}
                onClick={() => void reconnectReady()}
              >
                {reconnecting ? "Connecting…" : "Connect Ready"}
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <label className="block text-sm">
            You pay
            <div className="mt-1 flex gap-2">
              <TextInput
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                disabled={busy}
              />
              <span className="inline-flex min-w-[4.5rem] items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-medium">
                {sellAsset}
              </span>
            </div>
          </label>

          <button
            type="button"
            onClick={flipDirection}
            className="mb-1 flex h-11 w-11 items-center justify-center self-end rounded-full border border-border bg-surface text-lg text-foreground transition hover:bg-accent-soft/50"
            aria-label="Flip swap direction"
          >
            ⇄
          </button>

          <label className="block text-sm">
            You receive (est.)
            <div className="mt-1 flex gap-2">
              <div className="flex min-h-[44px] flex-1 items-center rounded-xl border border-border bg-background px-4 font-mono text-sm tabular-nums text-foreground">
                {quoting
                  ? "…"
                  : quote
                    ? formatSwapAmount(quote.buyAmount)
                    : "—"}
              </div>
              <span className="inline-flex min-w-[4.5rem] items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-medium">
                {buyAsset}
              </span>
            </div>
          </label>
        </div>

        {quote && (
          <p className="text-[11px] text-muted">
            ≈ ${quote.buyAmountInUsd.toFixed(2)} · impact{" "}
            {(quote.priceImpact * 100).toFixed(2)}% · via{" "}
            {quote.routes[0]?.name ?? "AVNU"}
          </p>
        )}

        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={busy || reconnecting || !amount.trim()}
          onClick={() => void onSwap()}
        >
          {!walletReady
            ? "Connect Ready to swap"
            : busy
              ? "Swapping…"
              : `Swap ${sellAsset} → ${buyAsset}`}
        </Button>

        {msg && !notice ? (
          <p className="text-xs text-muted leading-relaxed">{msg}</p>
        ) : null}
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
