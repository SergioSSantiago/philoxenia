"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import type { User } from "@philoxenia/shared";
import { buildPhiloxeniaAuthTypedData } from "@philoxenia/shared";
import { api } from "./api";
import { openReadyForSignRequest } from "./ready-mobile";
import { snip12ChainId } from "./starknet-config";
import { pickReadyConnector } from "./wallet-connectors";
import { formatWalletError, normalizeWalletSignature } from "./wallet-errors";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  /** True once a fresh auth challenge is cached for the connected wallet. */
  challengeReady: boolean;
  signInOpen: boolean;
  openSignIn: () => void;
  closeSignIn: () => void;
  connectWallet: () => Promise<void>;
  disconnect: () => void;
  signIn: (displayName?: string) => Promise<void>;
  refreshUser: () => Promise<User>;
  updateDisplayName: (displayName: string) => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "philoxenia_token";
const USER_KEY = "philoxenia_user";

function persistSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, account } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { disconnect: disconnectWallet } = useDisconnect();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signInOpen, setSignInOpen] = useState(false);
  const [challengeReady, setChallengeReady] = useState(false);
  const challengeRef = useRef<{
    message: string;
    nonce: string;
    expiresAt: string;
    walletAddress: string;
  } | null>(null);

  const openSignIn = useCallback(() => setSignInOpen(true), []);
  const closeSignIn = useCallback(() => setSignInOpen(false), []);

  const applyUser = useCallback((next: User) => {
    setUser(next);
    localStorage.setItem(USER_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedToken && storedUser) {
        const parsed = JSON.parse(storedUser) as User;
        if (
          !parsed?.id ||
          !parsed?.walletAddress ||
          typeof parsed.displayName !== "string"
        ) {
          throw new Error("Invalid stored user");
        }
        setToken(storedToken);
        setUser(parsed);
        api.setToken(storedToken);
        api.get<User>("/auth/me").then(applyUser).catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setToken(null);
          setUser(null);
          api.setToken(null);
        });
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
      api.setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [applyUser]);

  const connectWallet = useCallback(async () => {
    const connector = pickReadyConnector(connectors);
    if (!connector) return;
    await connectAsync({ connector });
  }, [connectAsync, connectors]);

  const refreshUser = useCallback(async () => {
    const fresh = await api.get<User>("/auth/me");
    applyUser(fresh);
    return fresh;
  }, [applyUser]);

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      const updated = await api.patch<User>("/users/me", {
        displayName: displayName.trim(),
      });
      applyUser(updated);
      return updated;
    },
    [applyUser]
  );

  useEffect(() => {
    if (!address) {
      challengeRef.current = null;
      setChallengeReady(false);
      return;
    }
    let cancelled = false;
    setChallengeReady(false);
    api
      .post<{ message: string; nonce: string; expiresAt: string }>(
        "/auth/challenge",
        { walletAddress: address }
      )
      .then((challenge) => {
        if (!cancelled) {
          challengeRef.current = { ...challenge, walletAddress: address };
          setChallengeReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          challengeRef.current = null;
          setChallengeReady(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  const signIn = useCallback(
    async (displayName?: string) => {
      if (!address || !account) {
        throw new Error("Wallet not connected");
      }

      const cached = challengeRef.current;
      const freshEnough =
        cached &&
        cached.walletAddress === address &&
        Date.parse(cached.expiresAt) - Date.now() > 8_000;

      // Prefer a prefetched challenge so Sign in can call the wallet in the
      // same user gesture (required for iOS to reopen Ready).
      const challenge = freshEnough
        ? cached
        : await api.post<{
            message: string;
            nonce: string;
            expiresAt: string;
          }>("/auth/challenge", { walletAddress: address });

      // Keep challenge until verify succeeds so a failed attempt can retry
      // without getting stuck on "Preparing signature…".
      challengeRef.current = { ...challenge, walletAddress: address };
      setChallengeReady(true);

      const typedData = buildPhiloxeniaAuthTypedData({
        nonce: challenge.nonce,
        chainId: snip12ChainId,
      });

      let signature: unknown;
      try {
        // On mobile WC, starknetkit opens argent://app/wc/request. After an
        // await (challenge fetch), iOS may block that — reopen explicitly.
        openReadyForSignRequest();
        const signPromise = account.signMessage(typedData);
        const retry = window.setTimeout(() => openReadyForSignRequest(), 500);
        try {
          signature = await signPromise;
        } finally {
          window.clearTimeout(retry);
        }
      } catch (err) {
        throw new Error(formatWalletError(err));
      }

      let sigArray: string[];
      try {
        sigArray = normalizeWalletSignature(signature);
      } catch (err) {
        throw new Error(formatWalletError(err));
      }

      try {
        const session = await api.post<{ token: string; user: User }>(
          "/auth/verify",
          {
            walletAddress: address,
            signature: sigArray,
            displayName,
          }
        );

        challengeRef.current = null;
        setChallengeReady(false);
        setToken(session.token);
        setUser(session.user);
        api.setToken(session.token);
        persistSession(session.token, session.user);
        setSignInOpen(false);
      } catch (err) {
        // Consume used/invalid challenge and mint a fresh one for the next tap.
        challengeRef.current = null;
        setChallengeReady(false);
        try {
          const next = await api.post<{
            message: string;
            nonce: string;
            expiresAt: string;
          }>("/auth/challenge", { walletAddress: address });
          challengeRef.current = { ...next, walletAddress: address };
          setChallengeReady(true);
        } catch {
          // leave challengeReady false; UI will show Preparing until address effect retries
        }
        throw new Error(formatWalletError(err));
      }
    },
    [address, account]
  );

  const disconnect = useCallback(() => {
    disconnectWallet();
    setToken(null);
    setUser(null);
    api.setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setSignInOpen(true);
  }, [disconnectWallet]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      challengeReady,
      signInOpen,
      openSignIn,
      closeSignIn,
      connectWallet,
      disconnect,
      signIn,
      refreshUser,
      updateDisplayName,
    }),
    [
      user,
      token,
      isLoading,
      challengeReady,
      signInOpen,
      openSignIn,
      closeSignIn,
      connectWallet,
      disconnect,
      signIn,
      refreshUser,
      updateDisplayName,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
