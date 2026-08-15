"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAccount } from "@starknet-react/core";
import type {
  ChatConversation,
  ChatMessage,
  PaymentAsset,
} from "@philoxenia/shared";
import { formatTokenAmount } from "@philoxenia/shared";
import { Shell, Button, Card, TextInput } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { transferToFriend } from "@/lib/payments/peer-transfer";

export default function ChatThreadPage() {
  const params = useParams<{ friendId: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const { account } = useAccount();
  const [conversation, setConversation] = useState<ChatConversation | null>(
    null
  );
  const [text, setText] = useState("");
  const [amount, setAmount] = useState("");
  const [asset, setAsset] = useState<PaymentAsset>("STRK");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const data = await api.get<ChatConversation>(
      `/messages/${params.friendId}`
    );
    setConversation(data);
  }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, params.friendId, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages.length]);

  async function sendText(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api.post(`/messages/${params.friendId}`, { body: text });
      setText("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendTransfer(e: React.FormEvent) {
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

  if (!conversation) {
    return (
      <Shell>
        <p className="text-muted">{error || "Loading…"}</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <Link
            href="/messages"
            className="text-sm text-muted hover:text-foreground"
          >
            ← Messages
          </Link>
          <h1 className="mt-2 text-3xl">{conversation.friend.displayName}</h1>
        </div>
        <Button
          variant="secondary"
          onClick={() => setShowPay((v) => !v)}
        >
          {showPay ? "Hide pay" : "Send DAI / STRK"}
        </Button>
      </div>

      {showPay && (
        <Card className="mb-4">
          <form onSubmit={sendTransfer} className="space-y-3">
            <p className="text-sm text-muted">
              Public on-chain transfer to{" "}
              <span className="font-medium text-foreground">
                {conversation.friend.displayName}
              </span>
              ’s wallet. Either direction — they can send back from their chat.
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
        </Card>
      )}

      <Card className="flex max-h-[55vh] flex-col overflow-hidden p-0 sm:max-h-[60vh]">
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {conversation.messages.length === 0 && (
            <p className="text-sm text-muted">No messages yet. Say hello.</p>
          )}
          {conversation.messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              mine={m.senderId === user?.id}
            />
          ))}
          <div ref={bottomRef} />
        </div>
        <form
          onSubmit={sendText}
          className="flex gap-2 border-t border-border p-3"
        >
          <input
            className="min-h-[44px] flex-1 rounded-full border border-border bg-background px-4 text-sm"
            placeholder="Write a message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
          />
          <Button type="submit" disabled={busy || !text.trim()}>
            Send
          </Button>
        </form>
      </Card>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </Shell>
  );
}

function MessageBubble({
  message,
  mine,
}: {
  message: ChatMessage;
  mine: boolean;
}) {
  const isSystem = message.kind === "booking";
  const isTransfer = message.kind === "transfer";

  if (isSystem) {
    return (
      <div className="mx-auto max-w-md rounded-xl bg-accent-soft/50 px-4 py-3 text-center text-sm text-muted">
        <p>{message.body}</p>
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
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          mine
            ? "bg-accent text-white"
            : "border border-border bg-background text-foreground"
        }`}
      >
        {isTransfer ? (
          <>
            <p className="font-medium">
              {mine ? "You sent" : "Received"}{" "}
              {message.amount && message.asset
                ? formatTokenAmount(message.amount) + ` ${message.asset}`
                : message.body}
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
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
        )}
        <p
          className={`mt-1 text-[10px] ${mine ? "text-white/70" : "text-muted"}`}
        >
          {new Date(message.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
