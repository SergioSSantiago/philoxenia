"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@philoxenia/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ensureMessageKeyPair } from "@/lib/chat-crypto";

/**
 * Ensures a device keypair exists and publishes the public half to the API
 * so friends can seal messages to this user.
 */
export function useSealedMessaging() {
  const { token, user, refreshUser } = useAuth();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensure = useCallback(async () => {
    if (!token || !user?.walletAddress) {
      setReady(false);
      return null;
    }
    try {
      const publicSpki = await ensureMessageKeyPair(user.walletAddress);
      if (user.messagePublicKey !== publicSpki) {
        const updated = await api.patch<User>("/users/me", {
          messagePublicKey: publicSpki,
        });
        await refreshUser().catch(() => updated);
      }
      setReady(true);
      setError(null);
      return publicSpki;
    } catch (err) {
      setReady(false);
      setError(
        err instanceof Error ? err.message : "Could not enable sealed chat"
      );
      return null;
    }
  }, [token, user?.walletAddress, user?.messagePublicKey, refreshUser]);

  useEffect(() => {
    void ensure();
  }, [ensure]);

  return { ready, error, ensure };
}
