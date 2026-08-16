"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  useConnect,
  type Connector,
} from "@starknet-react/core";
import {
  useStarknetkitConnectModal,
  type StarknetkitConnector,
} from "starknetkit";
import { isInArgentMobileAppBrowser } from "starknetkit/argentMobile";
import { Button, TextInput } from "@/components/ui";
import { WalletAddress } from "@/components/wallet-address";
import { useAuth } from "@/lib/auth-context";
import { formatWalletError } from "@/lib/wallet-errors";
import { pickReadyConnector } from "@/lib/wallet-connectors";
import { ReadyWalletNotice } from "@/components/ready-wallet-notice";
import {
  isMobileBrowser,
  isReadyInAppBrowser,
  philoxeniaOpenUrl,
  readyLegacySignRequestHref,
  readyMobileStoreHref,
  readySignRequestHref,
} from "@/lib/ready-mobile";

/**
 * Standard StarknetKit connect flow (official demo pattern).
 * iPhone Safari/Chrome: do NOT WalletConnect — that opens legacy Ready via argent://.
 * Supported path: open Philoxenia inside the Ready X in-app browser, then connect.
 */
export function AuthModal() {
  const { address, account, isConnected } = useAccount();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();
  const {
    user,
    signIn,
    isLoading,
    challengeReady,
    signInOpen,
    closeSignIn,
  } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [onMobile, setOnMobile] = useState(false);
  const [inReadyApp, setInReadyApp] = useState(false);
  const [storeHref, setStoreHref] = useState(readyMobileStoreHref());
  const [openUrl, setOpenUrl] = useState(philoxeniaOpenUrl());
  const [copied, setCopied] = useState(false);
  const [signing, setSigning] = useState(false);

  const { starknetkitConnectModal } = useStarknetkitConnectModal({
    connectors: connectors as StarknetkitConnector[],
    dappName: "Philoxenia",
  });

  const open = signInOpen && !user;
  /** Safari / system Chrome on phone — WC deep-links to legacy Ready, not Ready X. */
  const mobileOutsideWallet = onMobile && !inReadyApp;

  useEffect(() => {
    setOnMobile(isMobileBrowser());
    setInReadyApp(isReadyInAppBrowser());
    setStoreHref(readyMobileStoreHref());
    setOpenUrl(philoxeniaOpenUrl());
  }, [open]);

  async function connectWallet() {
    setError("");
    if (isMobileBrowser() && !isReadyInAppBrowser()) {
      setError(
        "On iPhone, open Philoxenia inside the Ready X app browser — Safari cannot complete login."
      );
      return;
    }
    setBusy(true);
    try {
      if (isInArgentMobileAppBrowser()) {
        const connector = pickReadyConnector(connectors);
        if (!connector) throw new Error("Ready connector not available");
        await connectAsync({ connector });
        return;
      }

      const { connector } = await starknetkitConnectModal();
      if (!connector) return;
      await connectAsync({ connector: connector as Connector });
    } catch (err) {
      setError(formatWalletError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignIn() {
    setError("");
    setBusy(true);
    setSigning(true);
    try {
      await signIn(displayName || undefined);
    } catch (err) {
      setError(formatWalletError(err));
    } finally {
      setBusy(false);
      setSigning(false);
    }
  }

  async function copyOpenUrl() {
    try {
      await navigator.clipboard.writeText(openUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy. Paste this URL in Ready X: " + openUrl);
    }
  }

  useEffect(() => {
    if (!open || isConnected) return;
    if (isReadyInAppBrowser()) {
      void connectWallet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isConnected]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSignIn();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, closeSignIn]);

  useEffect(() => {
    if (!open) {
      setError("");
      setDisplayName("");
      setBusy(false);
      setSigning(false);
      setCopied(false);
    }
  }, [open]);

  if (!open) return null;

  const waiting = busy || isConnecting || isLoading;
  const canSign = Boolean(account) && challengeReady && !waiting;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close sign in"
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
        onClick={closeSignIn}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative z-10 w-full max-w-md rounded-t-3xl bg-surface px-5 pb-8 pt-6 shadow-xl sm:rounded-3xl sm:p-8"
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="auth-modal-title" className="text-2xl sm:text-3xl">
              Welcome
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              {mobileOutsideWallet
                ? "iPhone login only works inside the Ready X app browser — not Safari."
                : isConnected
                  ? "Approve the login signature in Ready X."
                  : "Connect Ready X to join Philoxenia."}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={closeSignIn}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-xl text-muted hover:text-foreground"
          >
            ×
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <ReadyWalletNotice compact />

          {mobileOutsideWallet && !isConnected ? (
            <>
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground">
                <li>
                  Install{" "}
                  <a
                    href={storeHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    Ready X
                  </a>{" "}
                  (not the older “Ready” / Crypto Card app).
                </li>
                <li>Open Ready X → use its in-app browser.</li>
                <li>Paste the Philoxenia link below, then Connect + Sign in there.</li>
              </ol>
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="break-all font-mono text-xs text-muted">{openUrl}</p>
                <Button
                  className="mt-3 w-full"
                  type="button"
                  onClick={() => void copyOpenUrl()}
                >
                  {copied ? "Copied!" : "Copy link for Ready X"}
                </Button>
              </div>
              <a
                href={storeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-sm text-accent underline-offset-2 hover:underline"
              >
                Get Ready X on the App Store
              </a>
              <p className="pt-1 text-center text-xs text-muted">
                Connecting from Safari opens the old Ready app and never returns
                a signature — that path is disabled on purpose.
              </p>
            </>
          ) : !isConnected ? (
            <>
              <Button
                className="w-full"
                disabled={waiting}
                onClick={() => void connectWallet()}
              >
                {waiting ? "Connecting…" : "Connect Ready X"}
              </Button>
              <p className="pt-1 text-center text-xs text-muted">
                Connecting does not sign you in yet. Philoxenia never custodies
                your funds or keys.
              </p>
            </>
          ) : (
            <>
              {address ? (
                <div className="rounded-xl border border-border bg-background p-4">
                  <WalletAddress address={address} label="Connected wallet" />
                </div>
              ) : null}
              <label className="block text-sm">
                <span className="text-muted">Display name (optional)</span>
                <TextInput
                  className="mt-1"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  maxLength={64}
                  autoComplete="nickname"
                  disabled={waiting}
                />
              </label>
              <Button
                className="w-full"
                disabled={!canSign}
                onClick={() => void handleSignIn()}
              >
                {signing || (waiting && challengeReady)
                  ? "Approve in Ready X…"
                  : !account
                    ? "Wallet loading…"
                    : !challengeReady
                      ? "Preparing signature…"
                      : "Sign in"}
              </Button>
              {onMobile && !inReadyApp && (signing || waiting) ? (
                <div className="space-y-2 text-center text-sm">
                  <p className="text-muted">
                    If Ready X did not open the approve sheet, tap below:
                  </p>
                  <a
                    href={readySignRequestHref()}
                    className="block font-medium text-accent underline-offset-2 hover:underline"
                  >
                    Open Ready X to approve
                  </a>
                  <a
                    href={readyLegacySignRequestHref()}
                    className="block text-xs text-muted underline-offset-2 hover:underline"
                  >
                    Legacy Ready deep link (unsupported)
                  </a>
                </div>
              ) : null}
              <p className="pt-1 text-center text-xs text-muted">
                Ready X will ask you to sign in. Philoxenia never custodies your
                funds or keys.
              </p>
            </>
          )}

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
