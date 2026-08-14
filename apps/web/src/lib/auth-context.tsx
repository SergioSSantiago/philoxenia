"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import type { User } from "@philoxenia/shared";
import { api } from "./api";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  connectWallet: () => Promise<void>;
  disconnect: () => void;
  signIn: (displayName?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "philoxenia_token";
const USER_KEY = "philoxenia_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, account } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect: disconnectWallet } = useDisconnect();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      api.setToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  const connectWallet = useCallback(async () => {
    const connector = connectors[0];
    if (connector) {
      await connect({ connector });
    }
  }, [connect, connectors]);

  const signIn = useCallback(
    async (displayName?: string) => {
      if (!address || !account) {
        throw new Error("Wallet not connected");
      }

      const challenge = await api.post<{
        message: string;
        nonce: string;
        expiresAt: string;
      }>("/auth/challenge", { walletAddress: address });

      const typedData = {
        domain: { name: "Philoxenia", chainId: "SN_SEPOLIA", version: "1" },
        primaryType: "Authentication",
        types: {
          StarkNetDomain: [
            { name: "name", type: "felt" },
            { name: "chainId", type: "felt" },
            { name: "version", type: "felt" },
          ],
          Authentication: [{ name: "message", type: "felt" }],
        },
        message: { message: challenge.message },
      };

      const signature = await account.signMessage(typedData);

      const sigArray = Array.isArray(signature)
        ? signature.map(String)
        : [String(signature.r), String(signature.s)];

      const session = await api.post<{ token: string; user: User }>(
        "/auth/verify",
        {
          walletAddress: address,
          signature: sigArray,
          displayName,
        }
      );

      setToken(session.token);
      setUser(session.user);
      api.setToken(session.token);
      localStorage.setItem(TOKEN_KEY, session.token);
      localStorage.setItem(USER_KEY, JSON.stringify(session.user));
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
  }, [disconnectWallet]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      connectWallet,
      disconnect,
      signIn,
    }),
    [user, token, isLoading, connectWallet, disconnect, signIn]
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
