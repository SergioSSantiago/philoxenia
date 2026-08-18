"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "@starknet-react/core";
import type {
  ChatConversation,
  ChatMessage,
  PaymentAsset,
} from "@philoxenia/shared";
import { formatTokenAmount } from "@philoxenia/shared";
import { Shell, Button, TextInput } from "@/components/ui";
import { ActionNotice } from "@/components/action-notice";
import { useAuth } from "@/lib/auth-context";
import { api, API_GENERIC_ERROR } from "@/lib/api";
import { formatWalletError } from "@/lib/wallet-errors";
import {
  isSealedBody,
  sealMessage,
  SEALED_PLAINTEXT_MAX,
  unsealMessage,
} from "@/lib/chat-crypto";
import { useSealedMessaging } from "@/lib/use-sealed-messaging";
import {
  messageMailboxAddress,
  tryPostSealedOnChain,
} from "@/lib/payments/message-mailbox";
import {
  transferToFriend,
  transferToFriendPrivate,
} from "@/lib/payments/peer-transfer";

type DisplayMessage = ChatMessage & {
  displayBody: string;
  sealed: boolean;
  decryptFailed?: boolean;
};

export default function ChatThreadPage() {
  const params = useParams<{ friendId: string }>();
  const router = useRouter();
  const { token, user, reconnectWallet } = useAuth();
  const { account, address } = useAccount();
  const { ready: sealedReady, ensure: ensureSealed } = useSealedMessaging();
  const [conversation, setConversation] = useState<ChatConversation | null>(
    null
  );
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState<PaymentAsset>("STRK");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [payMode, setPayMode] = useState<"private" | "public">("private");
  const [anchorOnChain, setAnchorOnChain] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [onChainNote, setOnChainNote] = useState("");
  const [notice, setNotice] = useState<{
    title: string;
    body: string;
    tone: "warn" | "error" | "info";
    primaryLabel?: string;
  } | null>(null);
  const pendingPayRef = useRef<{
    amount: string;
    asset: PaymentAsset;
    mode: "private" | "public";
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const mailboxReady = Boolean(messageMailboxAddress());
  const walletReady = Boolean(account && address);

  const decryptConversation = useCallback(
    async (data: ChatConversation) => {
      const wallet = user?.walletAddress;
      const next: DisplayMessage[] = [];
      for (const m of data.messages) {
        if (m.kind !== "text" || !isSealedBody(m.body)) {
          next.push({
            ...m,
            displayBody: m.body,
            sealed: false,
          });
          continue;
        }
        if (!wallet) {
          next.push({
            ...m,
            displayBody: "Sealed note",
            sealed: true,
            decryptFailed: true,
          });
          continue;
        }
        const plain = await unsealMessage(wallet, m.body);
        next.push({
          ...m,
          displayBody: plain ?? "Unable to decrypt this sealed note on this device",
          sealed: true,
          decryptFailed: plain === null,
        });
      }
      setMessages(next);
    },
    [user?.walletAddress]
  );

  const load = useCallback(async () => {
    const data = await api.get<ChatConversation>(
      `/messages/${params.friendId}`
    );
    setConversation(data);
    await decryptConversation(data);
  }, [params.friendId, decryptConversation]);

  useEffect(() => {
    if (!token) {
      router.replace("/home");
      return;
    }
    load().catch((err) =>
      setError(
        err instanceof Error &&
          err.message &&
          err.message !== API_GENERIC_ERROR
          ? err.message
          : "This Messages thread isn’t available."
      )
    );
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        load().catch(() => undefined);
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [token, router, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendText(e: FormEvent) {
    e.preventDefault();
    const plain = text.trim();
    if (!plain || !user?.walletAddress || !conversation) return;
    setBusy(true);
    setError("");
    try {
      await ensureSealed();
      const friendKey = conversation.friend.messagePublicKey;
      if (!friendKey) {
        setError(
          `${conversation.friend.displayName} hasn’t opened Messages yet — they need to publish a sealed key first.`
        );
        return;
      }
      const sealed = await sealMessage(
        user.walletAddress,
        friendKey,
        plain
      );
      await api.post(`/messages/${params.friendId}`, { body: sealed });
      setText("");
      setOnChainNote("");
      composerRef.current?.focus();

      if (anchorOnChain && account && conversation.friend.walletAddress) {
        const posted = await tryPostSealedOnChain({
          account: account as never,
          myWallet: user.walletAddress,
          friendWallet: conversation.friend.walletAddress,
          sealedBody: sealed,
        });
        if (posted.txHash) {
          setOnChainNote(`Anchored on-chain · ${posted.txHash.slice(0, 10)}…`);
        } else if (posted.reason && posted.reason !== "mailbox not configured") {
          setOnChainNote(`Sealed delivered; on-chain skip: ${posted.reason}`);
        }
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send this sealed note");
    } finally {
      setBusy(false);
    }
  }

  async function reconnectReady() {
    setReconnecting(true);
    setError("");
    setNotice({
      title: "Connecting Ready X",
      body: "Approve in Ready X (Chrome extension or iPhone app). Private and public sends both need a live signing session — Philoxenia login alone is not enough.",
      tone: "info",
    });
    try {
      await reconnectWallet();
      setNotice({
        title: "Ready X connected",
        body: pendingPayRef.current
          ? "Finishing Send STRK or DAI…"
          : "Ready X is ready to sign. You can Send STRK or DAI now.",
        tone: "info",
        primaryLabel: "Got it",
      });
    } catch (err) {
      pendingPayRef.current = null;
      setNotice({
        title: "Could not connect Ready X",
        body: formatWalletError(err),
        tone: "error",
        primaryLabel: "Try again",
      });
    } finally {
      setReconnecting(false);
    }
  }

  const executeTransfer = useCallback(
    async (
      liveAccount: NonNullable<typeof account>,
      payAmount: string,
      payAsset: PaymentAsset,
      mode: "private" | "public"
    ) => {
      if (!conversation) return;
      setBusy(true);
      setError("");
      try {
        const txHash =
          mode === "private"
            ? await transferToFriendPrivate(
                liveAccount,
                conversation.friend.walletAddress,
                payAmount,
                payAsset
              )
            : await transferToFriend(
                liveAccount,
                conversation.friend.walletAddress,
                payAmount,
                payAsset
              );
        await api.post(`/messages/${params.friendId}/transfer`, {
          amount: payAmount,
          asset: payAsset,
          txHash,
          privacyMode: mode,
        });
        setAmount("");
        setShowPay(false);
        pendingPayRef.current = null;
        setNotice(null);
        await load();
      } catch (err) {
        const msg = formatWalletError(err);
        const needsReconnect =
          /not connected|reconnect|wallet api|Ready X|STRK20|privacy|signing|session/i.test(
            msg
          );
        setNotice({
          title: needsReconnect ? "Ready X session needed" : "Could not send STRK or DAI",
          body: msg,
          tone: "error",
          primaryLabel: needsReconnect ? "Connect Ready X" : "Dismiss",
        });
        setError(msg);
      } finally {
        setBusy(false);
      }
    },
    [conversation, load, params.friendId]
  );

  useEffect(() => {
    const pending = pendingPayRef.current;
    if (!pending || !account || !conversation) return;
    pendingPayRef.current = null;
    setNotice({
      title: "Sending STRK or DAI…",
      body: "Ready X is connected — finishing Send STRK or DAI. Approve in Ready X if prompted.",
      tone: "info",
    });
    void executeTransfer(account, pending.amount, pending.asset, pending.mode);
  }, [account, conversation, executeTransfer]);

  async function sendTransfer(e: FormEvent) {
    e.preventDefault();
    if (!conversation) return;
    const payAmount = amount.trim();
    if (!payAmount) return;

    if (!account) {
      pendingPayRef.current = {
        amount: payAmount,
        asset,
        mode: payMode,
      };
      await reconnectReady();
      return;
    }

    await executeTransfer(account, payAmount, asset, payMode);
  }

  function onComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendText(e as unknown as FormEvent);
    }
  }

  if (!conversation) {
    return (
      <Shell>
        <p className="text-muted">{error || "Opening sealed Messages…"}</p>
      </Shell>
    );
  }

  const canSeal = Boolean(conversation.friend.messagePublicKey) && sealedReady;

  return (
    <Shell>
      <div className="-mx-1 flex min-h-[min(72vh,720px)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm sm:-mx-0">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-accent-soft/40 via-surface to-surface px-3 py-3 sm:px-4">
          <Link
            href="/messages"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-accent-soft/60 hover:text-foreground touch-manipulation"
            aria-label="Back to Messages"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/friends/${conversation.friend.id}`}
              className="block truncate text-xl leading-tight text-foreground underline-offset-2 hover:underline touch-manipulation sm:text-2xl"
            >
              {conversation.friend.displayName}
            </Link>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
              <span className="inline-flex items-center gap-1 text-accent">
                <LockIcon />
                {canSeal ? "Sealed Messages" : "Waiting for friend’s sealed key"}
              </span>
              <span className="hidden sm:inline" aria-hidden>
                ·
              </span>
              <Link
                href={`/friends/${conversation.friend.id}`}
                className="truncate font-mono text-[10px] opacity-80 underline-offset-2 hover:underline touch-manipulation sm:text-xs"
                title={`${conversation.friend.displayName}'s places`}
              >
                {conversation.friend.walletAddress.slice(0, 6)}…
                {conversation.friend.walletAddress.slice(-4)}
              </Link>
            </p>
          </div>
          <Button
            variant="secondary"
            className="shrink-0 !px-3 !py-2 text-xs sm:text-sm"
            onClick={() => setShowPay((v) => !v)}
          >
            {showPay ? "Close" : "Send STRK or DAI"}
          </Button>
        </header>

        {showPay && (
          <div className="border-b border-border bg-background/80 px-4 py-4">
            <form onSubmit={sendTransfer} className="space-y-3">
              <p className="text-sm text-muted">
                Send{" "}
                <span className="font-medium text-foreground">
                  {conversation.friend.displayName}
                </span>{" "}
                STRK or DAI from Messages — same friend wallet as Book & pay.
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPayMode("private")}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    payMode === "private"
                      ? "bg-accent text-white"
                      : "border border-border bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  Private
                </button>
                <button
                  type="button"
                  onClick={() => setPayMode("public")}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    payMode === "public"
                      ? "bg-accent text-white"
                      : "border border-border bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  Public
                </button>
              </div>

              <p className="text-xs leading-relaxed text-muted">
                {payMode === "private"
                  ? "From your shielded STRK or DAI via STRK20 (Ready X · Smart Wallet + Private). Amount stays private; shield that asset on Profile first."
                  : "Send STRK or DAI on-chain via Ready X. Amount and both wallets are visible on explorers."}
              </p>

              {!walletReady && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
                  Philoxenia is signed in, but Ready X is not connected for
                  signing. Connect Ready X (Chrome or iPhone) before sending
                  (Public or Private).
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  Amount
                  <TextInput
                    className="mt-1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </label>
                <label className="block text-sm">
                  Asset
                  <select
                    className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5"
                    value={asset}
                    onChange={(e) => setAsset(e.target.value as PaymentAsset)}
                  >
                    <option value="STRK">STRK</option>
                    <option value="DAI">DAI</option>
                  </select>
                </label>
              </div>
              {!walletReady ? (
                <Button
                  type="button"
                  disabled={reconnecting || !amount.trim()}
                  onClick={() => {
                    if (!amount.trim()) return;
                    pendingPayRef.current = {
                      amount: amount.trim(),
                      asset,
                      mode: payMode,
                    };
                    void reconnectReady();
                  }}
                >
                  {reconnecting ? "Connecting Ready X…" : "Connect Ready X to Send STRK or DAI"}
                </Button>
              ) : (
                <Button type="submit" disabled={busy || !amount.trim()}>
                  {busy
                    ? "Sending STRK or DAI…"
                    : payMode === "private"
                      ? `Send ${asset} · Private`
                      : `Send ${asset} · Public`}
                </Button>
              )}
            </form>
          </div>
        )}

        {/* Transcript */}
        <div className="relative flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--accent-soft)_0%,_transparent_55%)] px-3 py-4 sm:px-5">
          {messages.length === 0 && (
            <div className="mx-auto mt-8 max-w-sm text-center">
              <p className="text-lg text-foreground">Say hello — sealed note</p>
              <p className="mt-2 text-sm text-muted">
                Your first note is encrypted before it leaves this browser.
              </p>
            </div>
          )}
          <div className="mx-auto flex max-w-2xl flex-col gap-2.5">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                mine={m.senderId === user?.id}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Composer */}
        <form
          onSubmit={sendText}
          className="border-t border-border bg-surface px-3 py-3 sm:px-4"
        >
          {!canSeal && (
            <p className="mb-2 text-xs text-amber-800">
              {conversation.friend.messagePublicKey
                ? "Preparing sealed Messages keys…"
            : "Ask your friend to open Messages once so their sealed Messages key is published."}
            </p>
          )}
          <div className="flex items-end gap-2">
            <textarea
              ref={composerRef}
              rows={1}
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-snug outline-none ring-accent/30 focus:ring-2"
              placeholder="Write a sealed note…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onComposerKeyDown}
              maxLength={SEALED_PLAINTEXT_MAX}
              disabled={!canSeal || busy}
            />
            <Button
              type="submit"
              disabled={busy || !text.trim() || !canSeal}
              className="shrink-0 !rounded-2xl"
            >
              Send
            </Button>
          </div>
          {mailboxReady && (
            <details
              className="mt-2 text-xs text-muted"
              open={showAdvanced}
              onToggle={(e) =>
                setShowAdvanced((e.target as HTMLDetailsElement).open)
              }
            >
              <summary className="cursor-pointer select-none text-muted hover:text-foreground">
                Advanced
              </summary>
              <label className="mt-2 flex cursor-pointer items-start gap-2 leading-snug">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-border"
                  checked={anchorOnChain}
                  onChange={(e) => setAnchorOnChain(e.target.checked)}
                />
                <span>
                  Anchor ciphertext hash on-chain (MessageMailbox). Optional
                  proof-of-existence — not needed for a sealed note.
                </span>
              </label>
            </details>
          )}
          <div className="mt-1.5 flex justify-between gap-2 text-[10px] text-muted">
            <span>Enter to send this sealed note · Shift+Enter for newline</span>
            <span>
              {text.length}/{SEALED_PLAINTEXT_MAX}
            </span>
          </div>
          {onChainNote && (
            <p className="mt-1 truncate text-[10px] text-accent">{onChainNote}</p>
          )}
        </form>
      </div>

      {error && !notice && (
        <p className="mt-3 text-sm text-red-700">{error}</p>
      )}

      <ActionNotice
        open={Boolean(notice)}
        title={notice?.title ?? ""}
        body={notice?.body ?? ""}
        tone={notice?.tone ?? "warn"}
        busy={reconnecting || busy}
        primaryLabel={notice?.primaryLabel}
        onPrimary={() => {
          if (notice?.primaryLabel === "Connect Ready" || notice?.primaryLabel === "Connect Ready X" || notice?.primaryLabel === "Try again") {
            void reconnectReady();
            return;
          }
          setNotice(null);
        }}
        onSecondary={() => setNotice(null)}
      />
    </Shell>
  );
}

function MessageBubble({
  message,
  mine,
}: {
  message: DisplayMessage;
  mine: boolean;
}) {
  const isSystem = message.kind === "booking";
  const isTransfer = message.kind === "transfer";

  if (isSystem) {
    return (
      <div className="mx-auto max-w-md rounded-xl bg-accent-soft/60 px-4 py-3 text-center text-sm text-muted">
        <p>{message.displayBody}</p>
        {message.bookingId && (
          <Link
            href={`/bookings/${message.bookingId}`}
            className="mt-1 inline-block text-accent underline-offset-2 hover:underline"
          >
            View stay
          </Link>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex ${mine ? "justify-end" : "justify-start"} animate-[fadeUp_0.28s_ease-out]`}
    >
      <div
        className={`max-w-[min(85%,28rem)] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
          mine
            ? "rounded-br-md bg-accent text-white"
            : "rounded-bl-md border border-border bg-surface text-foreground"
        }`}
      >
        {isTransfer ? (
          <>
            {message.body.includes("(private)") && (
              <p
                className={`mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide ${
                  mine ? "text-white/70" : "text-accent"
                }`}
              >
                <LockIcon />
                Private transfer
              </p>
            )}
            <p className="font-medium">
              {mine ? "You sent" : "Received"}{" "}
              {message.amount && message.asset
                ? formatTokenAmount(message.amount) + ` ${message.asset}`
                : message.displayBody}
            </p>
            {message.txHash && (
              <a
                href={`https://voyager.online/tx/${message.txHash}`}
                target="_blank"
                rel="noreferrer"
                className={`mt-1 block truncate text-xs underline-offset-2 hover:underline ${
                  mine ? "text-white/80" : "text-muted"
                }`}
              >
                View transaction
              </a>
            )}
          </>
        ) : (
          <>
            {message.sealed && (
              <p
                className={`mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide ${
                  mine ? "text-white/70" : "text-accent"
                }`}
              >
                <LockIcon />
                Sealed
                {message.decryptFailed ? " · locked" : ""}
              </p>
            )}
            <p className="whitespace-pre-wrap break-words">
              {message.displayBody}
            </p>
          </>
        )}
        <p
          className={`mt-1 text-[10px] tabular-nums ${
            mine ? "text-white/65" : "text-muted"
          }`}
        >
          {new Date(message.createdAt).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
