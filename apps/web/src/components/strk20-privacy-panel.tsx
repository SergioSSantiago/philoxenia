"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@starknet-react/core";
import { Button } from "@/components/ui";
import { createStrk20Provider } from "@/lib/payments/strk20-payment-provider";
import { STRK20_PRIVACY_ENABLED } from "@/lib/tokens";

/**
 * Shield / unshield STRK via Ready WalletAccountV6.
 * Deposit amounts are public ERC-20 legs — labeled honestly.
 */
export function Strk20PrivacyPanel() {
  const { account, address, isConnected } = useAccount();
  const [capable, setCapable] = useState(false);
  const [privateBal, setPrivateBal] = useState<string | null>(null);
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!account || !STRK20_PRIVACY_ENABLED) {
      setCapable(false);
      setPrivateBal(null);
      return;
    }
    let cancelled = false;
    const provider = createStrk20Provider(account, "STRK");
    void (async () => {
      const ok = await provider.detectPrivacySupport();
      if (cancelled) return;
      setCapable(ok);
      if (ok) {
        const bal = await provider.getPrivateBalance();
        if (!cancelled) setPrivateBal(bal);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account]);

  if (!STRK20_PRIVACY_ENABLED) return null;

  if (!isConnected || !account || !address) {
    return (
      <p className="text-xs text-muted">
        Connect Ready to manage private STRK (STRK20).
      </p>
    );
  }

  if (!capable) {
    return (
      <p className="text-xs text-muted">
        This wallet does not expose STRK20 yet (needs wallet API ≥ 0.10). Use
        Public ERC-20 on booking pay, or update Ready.
      </p>
    );
  }

  async function run(action: "shield" | "unshield") {
    if (!account || !address) return;
    setBusy(true);
    setErr("");
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
      const bal = await provider.getPrivateBalance();
      setPrivateBal(bal);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "STRK20 action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background p-4">
      <div>
        <p className="text-sm font-medium text-foreground">Private STRK</p>
        <p className="mt-0.5 text-xs text-muted">
          Shielded balance (wallet-mediated). Deposit/withdraw amounts are
          public onchain.
        </p>
      </div>
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
      {err ? <p className="text-xs text-red-700">{err}</p> : null}
    </div>
  );
}
