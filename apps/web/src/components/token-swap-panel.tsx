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
  executeAvnuPrivateSwap,
  executeAvnuSwap,
  formatSwapAmount,
  quoteAvnuSwap,
} from "@/lib/payments/avnu-swap";
import { diagnosePrivacyWallet } from "@/lib/payments/wallet-account-v6";
import { formatWalletError } from "@/lib/wallet-errors";

type SwapMode = "private" | "public";

/**
 * STRK ↔ DAI swap via AVNU. Defaults to private (STRK20 pool) when Ready X supports it.
 */
export function TokenSwapPanel() {
  const { account, address } = useAccount();
  const { reconnectWallet } = useAuth();
  const [sellAsset, setSellAsset] = useState<PaymentAsset>("STRK");
  const buyAsset: PaymentAsset = sellAsset === "STRK" ? "DAI" : "STRK";
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [swapMode, setSwapMode] = useState<SwapMode>("private");
  const [privacyCapable, setPrivacyCapable] = useState(false);
  const [privacyHint, setPrivacyHint] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sponsoredGas, setSponsoredGas] = useState(false);
  const [avnuHint, setAvnuHint] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [notice, setNotice] = useState<{
    title: string;
    body: string;
    tone: "warn" | "error" | "info";
    primaryLabel?: string;
  } | null>(null);
  const quoteReq = useRef(0);
  const walletReady = Boolean(account && address);

  useEffect(() => {
    fetch("/api/avnu/status")
      .then((response) => response.json())
      .then(
        (data: {
          sponsoredGasEnabled?: boolean;
          sponsorReady?: boolean;
          hint?: string | null;
        }) => {
          setSponsoredGas(Boolean(data.sponsoredGasEnabled && data.sponsorReady));
          setAvnuHint(data.hint ?? null);
        }
      )
      .catch(() => {
        setSponsoredGas(false);
        setAvnuHint(null);
      });
  }, []);

  useEffect(() => {
    if (!address) {
      setPrivacyCapable(false);
      setPrivacyHint("");
      return;
    }
    let cancelled = false;
    void diagnosePrivacyWallet(address).then((result) => {
      if (cancelled) return;
      setPrivacyCapable(result.capable);
      setPrivacyHint(result.reason ?? "");
      if (result.capable) setSwapMode("private");
    });
    return () => {
      cancelled = true;
    };
  }, [address]);

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
      title: "Connecting Ready X",
      body: "Approve in Ready X (Chrome extension or Ready X browser). Private swaps need a live STRK20 session.",
      tone: "info",
    });
    try {
      await reconnectWallet();
      setNotice({
        title: "Ready X connected",
        body: "You can swap STRK ↔ DAI now.",
        tone: "info",
        primaryLabel: "Got it",
      });
    } catch (err) {
      setNotice({
        title: "Could not connect Ready X",
        body: formatWalletError(err),
        tone: "error",
        primaryLabel: "Try Ready X again",
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

    const usePrivate = swapMode === "private";
    if (usePrivate && !privacyCapable) {
      setNotice({
        title: "Private swap needs Ready X Private",
        body:
          privacyHint ||
          "Shield the sell token on Ready X first (wallet API ≥ 0.10). Or use Public swap in Advanced.",
        tone: "warn",
        primaryLabel: "Got it",
      });
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

      if (usePrivate) {
        setMsg(
          `Private swap: approve proof in Ready X (sell ${sellAsset} must be shielded)…`
        );
        const { transactionHash } = await executeAvnuPrivateSwap({
          walletAddress: address,
          quote: live,
        });
        setMsg(`Private swap submitted. Tx ${transactionHash.slice(0, 12)}…`);
        setNotice({
          title: "Private swap submitted",
          body: `You receive shielded ${buyAsset} inside the pool. Tx ${transactionHash}`,
          tone: "info",
          primaryLabel: "Got it",
        });
      } else {
        setMsg("Approve in Ready X to swap STRK ↔ DAI…");
        const { transactionHash } = await executeAvnuSwap({
          account,
          quote: live,
        });
        setMsg(`Swapped STRK ↔ DAI. Tx ${transactionHash.slice(0, 12)}…`);
        setNotice({
          title: "Public swap submitted",
          body: `STRK ↔ DAI swapped on-chain. Tx ${transactionHash}`,
          tone: "info",
          primaryLabel: "Got it",
        });
      }

      setAmount("");
      setQuote(null);
    } catch (err) {
      const body = formatWalletError(err);
      const needsReconnect =
        /not connected|reconnect|Ready|STRK20|privacy|signing|session|wallet/i.test(
          body
        );
      setNotice({
        title: needsReconnect ? "Ready X session needed" : "Could not swap STRK or DAI",
        body,
        tone: "error",
        primaryLabel: needsReconnect ? "Connect Ready X" : "Got it",
      });
      setMsg(body);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-foreground">Swap STRK ↔ DAI</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {swapMode === "private" ? (
              <>
                Private swap via{" "}
                <a
                  href="https://docs.avnu.fi/docs/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline-offset-2 hover:underline"
                >
                  AVNU
                </a>{" "}
                inside the STRK20 pool — amounts stay private. Shield the sell
                token first. Slippage {(AVNU_SWAP_SLIPPAGE * 100).toFixed(0)}%.
              </>
            ) : (
              <>
                Public swap via{" "}
                <a
                  href="https://app.avnu.fi"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline-offset-2 hover:underline"
                >
                  AVNU
                </a>
                . Routes and amounts are visible on Voyager. Slippage{" "}
                {(AVNU_SWAP_SLIPPAGE * 100).toFixed(0)}%.
              </>
            )}
            {sponsoredGas && (
              <>
                {" "}
                Network fees may be sponsored by AVNU when your balance allows.
              </>
            )}
            {avnuHint && !sponsoredGas && (
              <>
                {" "}
                <span className="text-amber-800">{avnuHint}</span>
              </>
            )}
          </p>
        </div>

        {!walletReady && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
            Connect Ready X to swap STRK ↔ DAI.
            <div className="mt-2">
              <Button
                type="button"
                disabled={reconnecting}
                onClick={() => void reconnectReady()}
              >
                {reconnecting ? "Connecting Ready X…" : "Connect Ready X"}
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSwapMode("private")}
            className={`rounded-full px-4 py-2 text-sm transition ${
              swapMode === "private"
                ? "bg-accent text-white"
                : "border border-border bg-surface text-muted hover:text-foreground"
            }`}
          >
            Private swap (default)
          </button>
          {(!privacyCapable || showAdvanced) && (
            <button
              type="button"
              onClick={() => setSwapMode("public")}
              className={`rounded-full px-4 py-2 text-sm transition ${
                swapMode === "public"
                  ? "bg-accent text-white"
                  : "border border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              Public swap
            </button>
          )}
        </div>

        {privacyCapable && !showAdvanced && swapMode === "private" && (
          <button
            type="button"
            className="text-xs text-muted underline-offset-2 hover:text-foreground hover:underline"
            onClick={() => setShowAdvanced(true)}
          >
            Advanced: public swap (visible on Voyager)
          </button>
        )}

        {swapMode === "private" && !privacyCapable && (
          <p className="text-xs leading-relaxed text-amber-800">
            {privacyHint ||
              "Ready X wallet API ≥ 0.10 required for private swaps. Shield on Ready X first."}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <label className="block text-sm">
            You sell
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
            aria-label="Flip STRK ↔ DAI"
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
            ? "Connect Ready X to swap STRK ↔ DAI"
            : busy
              ? swapMode === "private"
                ? "Private swap…"
                : "Swapping STRK ↔ DAI…"
              : swapMode === "private"
                ? `Private swap ${sellAsset} → ${buyAsset}`
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
            notice?.primaryLabel === "Connect Ready X" ||
            notice?.primaryLabel === "Try Ready X again"
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
