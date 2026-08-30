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
  /** Disconnect then connect again — use when Private/STRK20 needs a live API session. */
  reconnectWallet: () => Promise<void>;
  disconnect: () => void;
  signIn: (displayName?: string) => Promise<void>;
  /** Connect Ready X (if needed) then sign in — one user-facing step. */
  continueWithReadyX: (displayName?: string) => Promise<void>;
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
  const addressRef = useRef<string | undefined>(undefined);
  const accountRef = useRef(account);

  useEffect(() => {
    addressRef.current = address;
    accountRef.current = account;
  }, [address, account]);

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
          throw new Error("Saved Ready X session is invalid. Connect Ready X again.");
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
    if (!connector) {
      throw new Error(
        "Ready X not found. Chrome with the Ready X wallet extension is recommended, or download the Ready X wallet app and open Philoxenia in the Ready X browser."
      );
    }
    await connectAsync({ connector });
  }, [connectAsync, connectors]);

  /**
   * Force a fresh Ready session. Plain connect is a no-op when already
   * connected — Private STRK needs a real re-approve so wallet API ≥ 0.10
   * is rediscovered.
   */
  const reconnectWallet = useCallback(async () => {
    const connector = pickReadyConnector(connectors);
    if (!connector) {
      throw new Error(
        "Ready X not found. Chrome with the Ready X wallet extension is recommended, or download the Ready X wallet app and open Philoxenia in the Ready X browser."
      );
    }
    try {
      disconnectWallet();
    } catch {
      // already disconnected
    }
    await new Promise((r) => setTimeout(r, 350));
    await connectAsync({ connector });
  }, [connectAsync, connectors, disconnectWallet]);

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
      const walletAddress = addressRef.current;
      const signingAccount = accountRef.current;
      if (!walletAddress || !signingAccount) {
        throw new Error("Ready X is not connected. Tap Continue with Ready X.");
      }

      const cached = challengeRef.current;
      const freshEnough =
        cached &&
        cached.walletAddress === walletAddress &&
        Date.parse(cached.expiresAt) - Date.now() > 8_000;

      const challenge = freshEnough
        ? cached
        : await api.post<{
            message: string;
            nonce: string;
            expiresAt: string;
          }>("/auth/challenge", { walletAddress });

      challengeRef.current = { ...challenge, walletAddress };
      setChallengeReady(true);

      const typedData = buildPhiloxeniaAuthTypedData({
        nonce: challenge.nonce,
        chainId: snip12ChainId,
      });

      let signature: unknown;
      try {
        openReadyForSignRequest();
        const signPromise = signingAccount.signMessage(typedData);
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
            walletAddress,
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
        challengeRef.current = null;
        setChallengeReady(false);
        try {
          const next = await api.post<{
            message: string;
            nonce: string;
            expiresAt: string;
          }>("/auth/challenge", { walletAddress });
          challengeRef.current = { ...next, walletAddress };
          setChallengeReady(true);
        } catch {
          // prefetch retry on next tap
        }
        throw new Error(formatWalletError(err));
      }
    },
    []
  );

  const waitForConnectedWallet = useCallback(async (timeoutMs = 12_000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (addressRef.current && accountRef.current) return;
      await new Promise((r) => setTimeout(r, 120));
    }
    throw new Error(
      "Ready X did not connect in time. Open Philoxenia in the Ready X browser or unlock the extension, then try again."
    );
  }, []);

  const continueWithReadyX = useCallback(
    async (displayName?: string) => {
      if (!addressRef.current || !accountRef.current) {
        await connectWallet();
        await waitForConnectedWallet();
      }
      await signIn(displayName);
    },
    [connectWallet, signIn, waitForConnectedWallet]
  );

  const disconnect = useCallback(() => {
    disconnectWallet();
    setToken(null);
    setUser(null);
    api.setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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
      reconnectWallet,
      disconnect,
      signIn,
      continueWithReadyX,
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
      reconnectWallet,
      disconnect,
      signIn,
      continueWithReadyX,
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
