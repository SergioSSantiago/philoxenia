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
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
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
import { transferToFriend } from "@/lib/payments/peer-transfer";

type DisplayMessage = ChatMessage & {
  displayBody: string;
  sealed: boolean;
  decryptFailed?: boolean;
};

export default function ChatThreadPage() {
  const params = useParams<{ friendId: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const { account } = useAccount();
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
  const [showPay, setShowPay] = useState(false);
  const [anchorOnChain, setAnchorOnChain] = useState(false);
  const [onChainNote, setOnChainNote] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const mailboxReady = Boolean(messageMailboxAddress());

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
            displayBody: "Sealed message",
            sealed: true,
            decryptFailed: true,
          });
          continue;
        }
        const plain = await unsealMessage(wallet, m.body);
        next.push({
          ...m,
          displayBody: plain ?? "Unable to decrypt on this device",
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
    load().catch(() => setError("Conversation unavailable."));
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
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendTransfer(e: FormEvent) {
    e.preventDefault();
    if (!conversation || !account) {
      setError("Connect your wallet to send tokens.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const txHash = await transferToFriend(
        account,
        conversation.friend.walletAddress,
        amount,
        asset
      );
      await api.post(`/messages/${params.friendId}/transfer`, {
        amount,
        asset,
        txHash,
      });
      setAmount("");
      setShowPay(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setBusy(false);
    }
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
        <p className="text-muted">{error || "Opening sealed thread…"}</p>
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
            aria-label="Back to messages"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl leading-tight text-foreground sm:text-2xl">
              {conversation.friend.displayName}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
              <span className="inline-flex items-center gap-1 text-accent">
                <LockIcon />
                {canSeal ? "Sealed channel" : "Waiting for friend’s key"}
              </span>
              <span className="hidden sm:inline" aria-hidden>
                ·
              </span>
              <span className="truncate font-mono text-[10px] opacity-80 sm:text-xs">
                {conversation.friend.walletAddress.slice(0, 6)}…
                {conversation.friend.walletAddress.slice(-4)}
              </span>
            </p>
          </div>
          <Button
            variant="secondary"
            className="shrink-0 !px-3 !py-2 text-xs sm:text-sm"
            onClick={() => setShowPay((v) => !v)}
          >
            {showPay ? "Close" : "Pay"}
          </Button>
        </header>

        {showPay && (
          <div className="border-b border-border bg-background/80 px-4 py-4">
            <form onSubmit={sendTransfer} className="space-y-3">
              <p className="text-sm text-muted">
                Public on-chain transfer to{" "}
                <span className="font-medium text-foreground">
                  {conversation.friend.displayName}
                </span>
                . For private amounts, use a privacy-pool withdraw (coming with
                mailbox Phase B).
              </p>
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
              <Button type="submit" disabled={busy || !amount}>
                {busy ? "Sending…" : `Send ${asset}`}
              </Button>
            </form>
          </div>
        )}

        {/* Transcript */}
        <div className="relative flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--accent-soft)_0%,_transparent_55%)] px-3 py-4 sm:px-5">
          {messages.length === 0 && (
            <div className="mx-auto mt-8 max-w-sm text-center">
              <p className="text-lg text-foreground">Say hello — sealed</p>
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
                ? "Finishing your sealed keys…"
                : "Ask your friend to open Messages once so their sealed key is published."}
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
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                className="rounded border-border"
                checked={anchorOnChain}
                onChange={(e) => setAnchorOnChain(e.target.checked)}
              />
              Also anchor ciphertext hash on-chain (Ready Private · MessageMailbox)
            </label>
          )}
          <div className="mt-1.5 flex justify-between gap-2 text-[10px] text-muted">
            <span>Enter to send · Shift+Enter for newline</span>
            <span>
              {text.length}/{SEALED_PLAINTEXT_MAX}
            </span>
          </div>
          {onChainNote && (
            <p className="mt-1 truncate text-[10px] text-accent">{onChainNote}</p>
          )}
        </form>
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
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
            View booking
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
