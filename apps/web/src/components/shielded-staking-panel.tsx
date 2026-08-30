"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "@starknet-react/core";
import { ActionNotice } from "@/components/action-notice";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import {
  getShieldedTokenBalance,
  shieldToken,
  unshieldToken,
} from "@/lib/payments/strk20-actions";
import { diagnosePrivacyWallet } from "@/lib/payments/wallet-account-v6";
import {
  buildRedeemXstrkCalls,
  buildStakeStrkCalls,
  fetchEndurStrkStats,
  getPublicTokenBalance,
  previewStrkFromXstrk,
  previewXstrkFromStrk,
  type EndurStrkStats,
} from "@/lib/staking/endur-staking";
import { STRK20_PRIVACY_ENABLED, STRK_TOKEN_ADDRESS, XSTRK_TOKEN_ADDRESS } from "@/lib/tokens";
import { formatWalletError } from "@/lib/wallet-errors";

type NoticeState = {
  title: string;
  body: string;
  tone: "warn" | "error" | "info";
  primaryLabel?: string;
  secondaryLabel?: string;
  reloadOnSecondary?: boolean;
};

/**
 * Endur liquid staking (STRK → xSTRK) + STRK20 shield for private yield.
 * Stake/redeem legs are public ERC-20; shield/unshield uses the privacy pool.
 */
export function ShieldedStakingPanel() {
  const { account, address } = useAccount();
  const { reconnectWallet } = useAuth();
  const [capable, setCapable] = useState(false);
  const [hint, setHint] = useState("");
  const [stats, setStats] = useState<EndurStrkStats | null>(null);
  const [publicStrk, setPublicStrk] = useState<string | null>(null);
  const [publicXstrk, setPublicXstrk] = useState<string | null>(null);
  const [shieldedXstrk, setShieldedXstrk] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState("10");
  const [shieldAmount, setShieldAmount] = useState("1");
  const [redeemAmount, setRedeemAmount] = useState("1");
  const [previewXstrk, setPreviewXstrk] = useState<string | null>(null);
  const [previewStrk, setPreviewStrk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [msg, setMsg] = useState("");
  const [notice, setNotice] = useState<NoticeState | null>(null);

  const walletReady = Boolean(account && address);

  const refreshBalances = useCallback(async () => {
    if (!account || !address) {
      setCapable(false);
      setHint("");
      setPublicStrk(null);
      setPublicXstrk(null);
      setShieldedXstrk(null);
      return;
    }

    const diag = await diagnosePrivacyWallet(address);
    setCapable(diag.capable);
    setHint(diag.reason ?? "");

    const [strk, xstrk, shielded] = await Promise.all([
      getPublicTokenBalance(STRK_TOKEN_ADDRESS, address),
      getPublicTokenBalance(XSTRK_TOKEN_ADDRESS, address),
      diag.capable
        ? getShieldedTokenBalance(account, XSTRK_TOKEN_ADDRESS)
        : Promise.resolve(null),
    ]);
    setPublicStrk(strk);
    setPublicXstrk(xstrk);
    setShieldedXstrk(shielded);
  }, [account, address]);

  useEffect(() => {
    if (!STRK20_PRIVACY_ENABLED) return;
    void refreshBalances();
    void fetchEndurStrkStats().then(setStats);
  }, [refreshBalances]);

  useEffect(() => {
    if (!stakeAmount.trim()) {
      setPreviewXstrk(null);
      return;
    }
    let cancelled = false;
    void previewXstrkFromStrk(stakeAmount)
      .then((value) => {
        if (!cancelled) setPreviewXstrk(value);
      })
      .catch(() => {
        if (!cancelled) setPreviewXstrk(null);
      });
    return () => {
      cancelled = true;
    };
  }, [stakeAmount]);

  useEffect(() => {
    if (!redeemAmount.trim()) {
      setPreviewStrk(null);
      return;
    }
    let cancelled = false;
    void previewStrkFromXstrk(redeemAmount)
      .then((value) => {
        if (!cancelled) setPreviewStrk(value);
      })
      .catch(() => {
        if (!cancelled) setPreviewStrk(null);
      });
    return () => {
      cancelled = true;
    };
  }, [redeemAmount]);

  const reconnectReady = useCallback(async () => {
    setReconnecting(true);
    setMsg("");
    setNotice({
      title: "Reconnecting Ready X",
      body: "Approve in Ready X so Philoxenia can stake and shield xSTRK via STRK20.",
      tone: "info",
    });
    try {
      await reconnectWallet();
      for (let i = 0; i < 12; i++) {
        await new Promise((r) => setTimeout(r, 280));
        const diag = await diagnosePrivacyWallet();
        if (diag.capable) break;
      }
      await refreshBalances();
      setNotice({
        title: "Ready X connected",
        body: "You can stake STRK on Endur and shield xSTRK when Ready X supports it.",
        tone: "info",
        primaryLabel: "Got it",
      });
    } catch (err) {
      setNotice({
        title: "Could not reconnect Ready X",
        body: formatWalletError(err),
        tone: "error",
        primaryLabel: "Try Ready X again",
        secondaryLabel: "Refresh Philoxenia",
        reloadOnSecondary: true,
      });
    } finally {
      setReconnecting(false);
    }
  }, [reconnectWallet, refreshBalances]);

  async function runStake() {
    if (!account || !address) {
      await reconnectReady();
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      setMsg("Approve STRK and stake on Endur (public on-chain)…");
      const calls = buildStakeStrkCalls(address, stakeAmount);
      const { transaction_hash } = await account.execute(calls);
      setMsg(`Staked STRK → xSTRK. Tx ${transaction_hash.slice(0, 10)}…`);
      await refreshBalances();
    } catch (e) {
      setNotice({
        title: "Could not stake on Endur",
        body: formatWalletError(e),
        tone: "error",
        primaryLabel: "Got it",
      });
    } finally {
      setBusy(false);
    }
  }

  async function runShield() {
    if (!account || !address) {
      await reconnectReady();
      return;
    }
    if (!capable) {
      setNotice({
        title: "Ready X Private needed",
        body: hint || "Shield xSTRK needs Ready X with STRK20 (wallet API ≥ 0.10).",
        tone: "warn",
        primaryLabel: "Reconnect Ready X",
      });
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      setMsg(
        "Approve xSTRK shield (public amount), then the private proof…"
      );
      const { txHash } = await shieldToken(
        account,
        XSTRK_TOKEN_ADDRESS,
        shieldAmount
      );
      setMsg(`Shielded xSTRK. Tx ${txHash.slice(0, 10)}…`);
      await refreshBalances();
    } catch (e) {
      setNotice({
        title: "Could not shield xSTRK",
        body: formatWalletError(e),
        tone: "error",
        primaryLabel: "Got it",
      });
    } finally {
      setBusy(false);
    }
  }

  async function runStakeAndShield() {
    if (!account || !address) {
      await reconnectReady();
      return;
    }
    if (!capable) {
      setNotice({
        title: "Ready X Private needed",
        body: hint || "Stake & shield needs Ready X with STRK20 (wallet API ≥ 0.10).",
        tone: "warn",
        primaryLabel: "Reconnect Ready X",
      });
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const expectedXstrk = previewXstrk ?? (await previewXstrkFromStrk(stakeAmount));
      setMsg("Step 1/2 — stake STRK on Endur (public)…");
      const calls = buildStakeStrkCalls(address, stakeAmount);
      await account.execute(calls);
      setMsg("Step 2/2 — shield xSTRK in the privacy pool…");
      const { txHash } = await shieldToken(
        account,
        XSTRK_TOKEN_ADDRESS,
        expectedXstrk
      );
      setMsg(`Shielded staking position opened. Tx ${txHash.slice(0, 10)}…`);
      await refreshBalances();
    } catch (e) {
      setNotice({
        title: "Stake & shield did not finish",
        body: formatWalletError(e),
        tone: "error",
        primaryLabel: "Got it",
      });
    } finally {
      setBusy(false);
    }
  }

  async function runUnshieldAndRedeem() {
    if (!account || !address) {
      await reconnectReady();
      return;
    }
    if (!capable) {
      setNotice({
        title: "Ready X Private needed",
        body: hint || "Unshield xSTRK needs Ready X with STRK20.",
        tone: "warn",
        primaryLabel: "Reconnect Ready X",
      });
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      setMsg("Step 1/2 — unshield xSTRK to your wallet…");
      await unshieldToken(account, XSTRK_TOKEN_ADDRESS, redeemAmount, address);
      setMsg("Step 2/2 — redeem xSTRK for STRK on Endur (public)…");
      const calls = buildRedeemXstrkCalls(address, redeemAmount);
      const { transaction_hash } = await account.execute(calls);
      setMsg(`Redeemed to STRK. Tx ${transaction_hash.slice(0, 10)}…`);
      await refreshBalances();
    } catch (e) {
      setNotice({
        title: "Could not unshield & redeem",
        body: formatWalletError(e),
        tone: "error",
        primaryLabel: "Got it",
      });
    } finally {
      setBusy(false);
    }
  }

  if (!STRK20_PRIVACY_ENABLED) return null;

  return (
    <>
      <div className="space-y-4 rounded-xl border border-border bg-background p-4">
        <div>
          <p className="text-sm font-medium text-foreground">
            Shielded staking (Endur xSTRK)
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Stake STRK with Endur, then shield xSTRK in the STRK20 pool for
            private liquid staking yield. Stake, redeem, and shield deposit
            amounts are public on-chain; shielded xSTRK balance stays private
            in Ready X.
          </p>
          {stats ? (
            <p className="mt-1 text-xs text-foreground">
              Endur STRK APY ≈ {stats.apyLabel}
            </p>
          ) : null}
        </div>

        {!walletReady ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
              Connect Ready X to stake STRK and shield xSTRK.
            </div>
            <Button
              type="button"
              disabled={reconnecting}
              onClick={() => void reconnectReady()}
            >
              {reconnecting ? "Connecting Ready X…" : "Connect Ready X"}
            </Button>
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
              <div className="rounded-lg border border-border px-3 py-2">
                <dt className="text-muted">Public STRK</dt>
                <dd className="font-mono text-foreground">
                  {publicStrk ?? "…"}
                </dd>
              </div>
              <div className="rounded-lg border border-border px-3 py-2">
                <dt className="text-muted">Public xSTRK</dt>
                <dd className="font-mono text-foreground">
                  {publicXstrk ?? "…"}
                </dd>
              </div>
              <div className="rounded-lg border border-border px-3 py-2">
                <dt className="text-muted">Shielded xSTRK</dt>
                <dd className="font-mono text-foreground">
                  {capable ? (shieldedXstrk ?? "…") : "—"}
                </dd>
              </div>
            </dl>

            {!capable ? (
              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
                {hint ||
                  "Shielding xSTRK needs Ready X with STRK20 (wallet API ≥ 0.10). You can still stake publicly."}
                <Button
                  type="button"
                  className="mt-2"
                  disabled={reconnecting}
                  onClick={() => void reconnectReady()}
                >
                  {reconnecting ? "Reconnecting…" : "Reconnect Ready X"}
                </Button>
              </div>
            ) : null}

            <div className="space-y-3 border-t border-border pt-3">
              <p className="text-xs font-medium text-foreground">Stake STRK</p>
              <label className="block text-xs text-muted">
                STRK amount
                <input
                  type="text"
                  inputMode="decimal"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground"
                  disabled={busy}
                />
              </label>
              {previewXstrk ? (
                <p className="text-xs text-muted">
                  ≈ {previewXstrk} xSTRK from Endur
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="min-h-10 px-4 text-xs"
                  disabled={busy || reconnecting}
                  onClick={() => void runStake()}
                >
                  Stake on Endur
                </Button>
                <Button
                  type="button"
                  className="min-h-10 px-4 text-xs"
                  disabled={busy || reconnecting || !capable}
                  onClick={() => void runStakeAndShield()}
                >
                  Stake & shield
                </Button>
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-3">
              <p className="text-xs font-medium text-foreground">
                Shield public xSTRK
              </p>
              <label className="block text-xs text-muted">
                xSTRK amount
                <input
                  type="text"
                  inputMode="decimal"
                  value={shieldAmount}
                  onChange={(e) => setShieldAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground"
                  disabled={busy || !capable}
                />
              </label>
              <Button
                type="button"
                variant="secondary"
                className="min-h-10 px-4 text-xs"
                disabled={busy || reconnecting || !capable}
                onClick={() => void runShield()}
              >
                Shield xSTRK
              </Button>
            </div>

            <div className="space-y-3 border-t border-border pt-3">
              <p className="text-xs font-medium text-foreground">
                Exit (unshield & redeem)
              </p>
              <label className="block text-xs text-muted">
                Shielded xSTRK to exit
                <input
                  type="text"
                  inputMode="decimal"
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-foreground"
                  disabled={busy || !capable}
                />
              </label>
              {previewStrk ? (
                <p className="text-xs text-muted">
                  ≈ {previewStrk} STRK after redeem
                </p>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                className="min-h-10 px-4 text-xs"
                disabled={busy || reconnecting || !capable}
                onClick={() => void runUnshieldAndRedeem()}
              >
                Unshield & redeem STRK
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
        secondaryLabel={notice?.secondaryLabel ?? "Got it"}
        onPrimary={() => {
          const label = notice?.primaryLabel;
          if (
            label === "Reconnect Ready X" ||
            label === "Try Ready X again"
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
