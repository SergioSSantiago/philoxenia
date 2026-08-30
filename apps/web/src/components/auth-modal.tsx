"use client";

import { useEffect, useState } from "react";
import { useConnect } from "@starknet-react/core";
import { Button, TextInput } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { formatWalletError } from "@/lib/wallet-errors";
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
 * Sign-in modal — one step with Ready X (connect + approve).
 * Wallet API / STRK20 privacy stays inside Ready; Philoxenia never holds keys.
 */
export function AuthModal() {
  const { isPending: isConnecting } = useConnect();
  const { user, continueWithReadyX, isLoading, signInOpen, closeSignIn } =
    useAuth();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [onMobile, setOnMobile] = useState(false);
  const [inReadyApp, setInReadyApp] = useState(false);
  const [storeHref, setStoreHref] = useState(readyMobileStoreHref());
  const [openUrl, setOpenUrl] = useState(philoxeniaOpenUrl());
  const [copied, setCopied] = useState(false);

  const open = signInOpen && !user;
  const mobileOutsideWallet = onMobile && !inReadyApp;
  const waiting = busy || isConnecting || isLoading;

  useEffect(() => {
    setOnMobile(isMobileBrowser());
    setInReadyApp(isReadyInAppBrowser());
    setStoreHref(readyMobileStoreHref());
    setOpenUrl(philoxeniaOpenUrl());
  }, [open]);

  async function handleContinueWithReadyX() {
    setError("");
    setBusy(true);
    try {
      await continueWithReadyX(displayName || undefined);
    } catch (err) {
      setError(formatWalletError(err));
    } finally {
      setBusy(false);
    }
  }

  async function copyOpenUrl() {
    try {
      await navigator.clipboard.writeText(openUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(
        "Could not copy Philoxenia link for Ready X. Paste this URL in Ready X: " +
          openUrl
      );
    }
  }

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
      setCopied(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
        onClick={closeSignIn}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="relative z-10 max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface px-5 pb-8 pt-6 shadow-xl sm:rounded-3xl sm:p-8"
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="auth-modal-title" className="text-2xl sm:text-3xl">
              Continue with Ready X
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              One step to join Philoxenia. Private Book &amp; pay uses STRK20
              inside Ready X — we never see your viewing key.
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
          <Button
            className="w-full"
            disabled={waiting}
            onClick={() => void handleContinueWithReadyX()}
          >
            {waiting ? "Opening Ready X…" : "Continue with Ready X"}
          </Button>

          {mobileOutsideWallet ? (
            <div className="space-y-2 text-center text-sm">
              <a
                href={storeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="block font-medium text-accent underline-offset-2 hover:underline"
              >
                Get Ready X wallet app
              </a>
              <p className="text-xs text-muted leading-relaxed">
                For private Book &amp; pay on a phone, open this page inside the
                Ready X browser.
              </p>
              <button
                type="button"
                onClick={() => void copyOpenUrl()}
                className="text-xs text-accent underline-offset-2 hover:underline"
              >
                {copied ? "Copied link for Ready X" : "Copy link for Ready X"}
              </button>
              {waiting ? (
                <>
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
                </>
              ) : null}
            </div>
          ) : null}

          <details className="text-sm text-muted">
            <summary className="cursor-pointer select-none text-foreground">
              Display name (optional)
            </summary>
            <label className="mt-3 block">
              <span className="text-xs text-muted">
                Friends add you by Ready X wallet — name is cosmetic
              </span>
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
          </details>

          <details className="text-sm text-muted">
            <summary className="cursor-pointer select-none text-foreground">
              Need help with Ready X?
            </summary>
            <div className="mt-3">
              <ReadyWalletNotice compact />
            </div>
          </details>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
