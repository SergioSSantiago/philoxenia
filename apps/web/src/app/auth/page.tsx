"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@starknet-react/core";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

export default function AuthPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { user, connectWallet, signIn, isLoading } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace("/home");
    }
  }, [user, router]);

  async function handleSignIn() {
    setError("");
    setSigningIn(true);
    try {
      await signIn(displayName || undefined);
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-md">
        <h1 className="text-3xl">Welcome</h1>
        <p className="mt-2 text-muted">
          Connect your Starknet wallet to join Philoxenia.
        </p>

        {!isConnected ? (
          <div className="mt-8 space-y-4">
            <Button className="w-full" onClick={() => connectWallet()}>
              Connect wallet
            </Button>
            <p className="text-xs text-muted text-center">
              Philoxenia never custodies your funds or keys.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-muted">
              Connected:{" "}
              <span className="font-mono text-foreground">
                {address?.slice(0, 10)}…{address?.slice(-6)}
              </span>
            </p>
            <label className="block text-sm">
              Display name (optional)
              <input
                className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </label>
            <Button
              className="w-full"
              onClick={handleSignIn}
              disabled={signingIn || isLoading}
            >
              {signingIn ? "Signing in…" : "Sign in"}
            </Button>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-700">{error}</p>
        )}
      </Card>
    </div>
  );
}
