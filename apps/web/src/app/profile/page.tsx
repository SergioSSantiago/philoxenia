"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shell,
  SectionTitle,
  Button,
  Card,
  TextInput,
} from "@/components/ui";
import { WalletAddress } from "@/components/wallet-address";
import { WalletBalances } from "@/components/wallet-balances";
import { Strk20PrivacyPanel } from "@/components/strk20-privacy-panel";
import { useAuth } from "@/lib/auth-context";
import { formatWalletError } from "@/lib/wallet-errors";

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, isLoading, updateDisplayName, refreshUser, disconnect } =
    useAuth();
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!token) {
      router.replace("/home");
      return;
    }
    refreshUser().catch(() => router.replace("/home"));
  }, [token, isLoading, router, refreshUser]);

  useEffect(() => {
    if (user) setDisplayName(user.displayName);
  }, [user]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      await updateDisplayName(displayName);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(formatWalletError(err));
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <Shell>
        <p className="text-muted">Loading…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <SectionTitle
        title="Profile"
        subtitle="Your display name is how friends see you. They add you by wallet address only."
      />

      <div className="space-y-6">
        <Card>
          <h3 className="text-lg text-foreground">Display name</h3>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            Change it anytime. It is not used for search — only your wallet
            address can be used to find you.
          </p>
          <form onSubmit={handleSaveName} className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="text-muted">Name shown to others</span>
              <TextInput
                className="mt-1"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={64}
                autoComplete="nickname"
              />
            </label>
            <Button
              type="submit"
              disabled={saving || !displayName.trim()}
              className="w-full sm:w-auto"
            >
              {saving ? "Saving…" : saved ? "Saved!" : "Save name"}
            </Button>
          </form>
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        </Card>

        <Card>
          <WalletBalances />
        </Card>

        <Card>
          <Strk20PrivacyPanel />
        </Card>

        <Card>
          <WalletAddress address={user.walletAddress} />
          <p className="mt-4 text-sm text-muted leading-relaxed">
            Share this address so trusted friends can add you on Philoxenia.
          </p>
        </Card>

        <Card>
          <h3 className="text-lg text-foreground">Session</h3>
          <p className="mt-2 text-sm text-muted">
            Disconnect your wallet from this browser.
          </p>
          <Button
            variant="secondary"
            className="mt-4 w-full sm:w-auto"
            onClick={() => {
              disconnect();
              router.replace("/home");
            }}
          >
            Disconnect wallet
          </Button>
        </Card>
      </div>
    </Shell>
  );
}
