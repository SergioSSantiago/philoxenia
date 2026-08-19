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
 * StarknetKit Ready connection modes:
 * - Desktop: modal / extension
 * - Mobile system browser: WalletConnect → Ready X app redirect (ready://)
 * - Ready in-app browser: auto-connect injected
 *
 * @see https://www.starknetkit.com/docs/latest/connectors/ready
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
  const mobileOutsideWallet = onMobile && !inReadyApp;

  useEffect(() => {
    setOnMobile(isMobileBrowser());
    setInReadyApp(isReadyInAppBrowser());
    setStoreHref(readyMobileStoreHref());
    setOpenUrl(philoxeniaOpenUrl());
  }, [open]);

  async function connectWallet() {
    setError("");
    setBusy(true);
    try {
      // In-app or mobile Safari/Chrome: Ready mobile connector (redirect / inject).
      if (isInArgentMobileAppBrowser() || isMobileBrowser()) {
        const connector = pickReadyConnector(connectors);
        if (!connector) throw new Error("Ready X is not available. Chrome with the Ready X wallet extension is recommended, or download the Ready X wallet app.");
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
      setError("Could not copy Philoxenia link for Ready X. Paste this URL in Ready X: " + openUrl);
    }
  }

  useEffect(() => {
    if (!open || isConnected) return;
    // UX guidelines: auto-connect inside Ready in-app browser (no modal).
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
        aria-label="Close Connect Ready X"
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
              Connect Ready X
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              {isConnected
                ? mobileOutsideWallet
                  ? "Step 2 of 2: Approve in Ready X to sign the login."
                  : "Approve the login signature in Ready X."
                : mobileOutsideWallet
                  ? "Step 1 of 2: Connect opens Ready X. Signing comes next."
                  : "Connect Ready X to join Philoxenia."}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close Connect Ready X"
            onClick={closeSignIn}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-xl text-muted hover:text-foreground"
          >
            ×
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <ReadyWalletNotice compact />

          {!isConnected ? (
            <>
              <Button
                className="w-full"
                disabled={waiting}
                onClick={() => void connectWallet()}
              >
                {waiting ? "Connecting Ready X…" : "Connect Ready X"}
              </Button>
              {mobileOutsideWallet ? (
                <div className="space-y-2 text-center text-sm">
                  <a
                    href={storeHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block font-medium text-accent underline-offset-2 hover:underline"
                  >
                    Download Ready X wallet app
                  </a>
                  <p className="text-xs text-muted leading-relaxed">
                    On a phone, open Philoxenia in the Ready X browser. Copy
                    the link and open it in the Ready X wallet app.
                  </p>
                  <button
                    type="button"
                    onClick={() => void copyOpenUrl()}
                    className="text-xs text-accent underline-offset-2 hover:underline"
                  >
                    {copied ? "Copied Philoxenia link for Ready X" : "Copy Philoxenia link for Ready X"}
                  </button>
                </div>
              ) : null}
              <p className="pt-1 text-center text-xs text-muted">
                Connecting does not sign you in yet. Philoxenia never custodies
                your funds or keys.
              </p>
            </>
          ) : (
            <>
              {address ? (
                <div className="rounded-xl border border-border bg-background p-4">
                  <WalletAddress address={address} label="Connected Ready X" />
                </div>
              ) : null}
              <label className="block text-sm">
                <span className="text-muted">Display name (friends add you by Ready X wallet)</span>
                <TextInput
                  className="mt-1"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
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
                    ? "Connecting Ready X…"
                    : !challengeReady
                      ? "Preparing Ready X signature…"
                      : "Approve in Ready X"}
              </Button>
              {mobileOutsideWallet && (signing || waiting) ? (
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
                    Legacy Ready deep link
                  </a>
                </div>
              ) : null}
              <p className="pt-1 text-center text-xs text-muted">
                {mobileOutsideWallet
                  ? "Ready X must open a second time to Approve in Ready X."
                  : "Ready X will ask you to Approve in Ready X."}{" "}
                Philoxenia never custodies your funds or keys.
              </p>
            </>
          )}

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
