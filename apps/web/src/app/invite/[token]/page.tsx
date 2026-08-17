"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { InviteResolution } from "@philoxenia/shared";
import { Button, Card } from "@/components/ui";
import { UserBadge } from "@/components/user-badge";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { user, token, connectWallet, signIn, openSignIn } = useAuth();
  const [invite, setInvite] = useState<InviteResolution | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function loadInvite() {
    const data = await api.get<InviteResolution>(`/invite/${params.token}`);
    setInvite(data);
    return data;
  }

  useEffect(() => {
    setLoading(true);
    loadInvite()
      .catch(() => setError("Invitation unavailable."))
      .finally(() => setLoading(false));
    // Re-resolve when the guest signs in so introduction + friendship state update
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token, token]);

  useEffect(() => {
    if (invite?.canViewListing) {
      router.replace(`/listings/${invite.listingId}`);
    }
  }, [invite, router]);

  // While waiting for host to accept friendship, poll invite status
  useEffect(() => {
    if (!invite?.friendshipPending || invite.canViewListing) return;
    const id = window.setInterval(() => {
      loadInvite().catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invite?.friendshipPending, invite?.canViewListing]);

  async function requestFriendship() {
    setBusy(true);
    setError("");
    try {
      if (!token) {
        openSignIn();
        return;
      }
      await api.post("/friends/request", { toUserId: invite!.hostId });
      await loadInvite();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-muted">Loading invitation…</p>
      </div>
    );
  }

  if ((error && !invite) || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md text-center">
          <p className="text-muted">{error || "Invitation unavailable."}</p>
        </Card>
      </div>
    );
  }

  if (invite.canViewListing) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-muted">Opening listing…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <Card className="w-full max-w-lg">
        <p className="text-sm uppercase tracking-widest text-muted">
          Invitation
        </p>
        <h1 className="mt-4 text-2xl sm:text-3xl">
          {invite.hasConnector && invite.connector
            ? `${invite.connector.displayName} invited you`
            : `${invite.host.displayName} shared a place with you`}
        </h1>
        <p className="mt-4 text-sm text-muted leading-relaxed sm:text-base">
          Private listing hosted by{" "}
          <span className="font-medium text-foreground">
            {invite.host.displayName}
          </span>
          . You must be friends with the host to view and Book & pay (STRK or
          DAI).
          {invite.hasConnector && invite.connector
            ? " If you book through this link, the connector reward goes to their Ready X wallet."
            : " This host link has no connector reward."}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {invite.hasConnector && invite.connector ? (
            <UserBadge user={invite.connector} role="Connector (Ready X payout)" />
          ) : (
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Connector
              </p>
              <p className="mt-1 text-sm text-muted">None — host shared link</p>
            </div>
          )}
          <UserBadge user={invite.host} role="Host" />
        </div>

        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

        {!user ? (
          <div className="mt-8 space-y-3">
            <Button
              className="w-full"
              onClick={async () => {
                await connectWallet();
                await signIn();
              }}
            >
              Connect Ready X to continue
            </Button>
          </div>
        ) : invite.friendshipPending ? (
          <p className="mt-8 text-sm text-muted leading-relaxed">
            Friendship request sent to{" "}
            <span className="font-medium text-foreground">
              {invite.host.displayName}
            </span>
            . When they accept, this page will open the listing automatically.
          </p>
        ) : (
          <Button
            className="mt-8 w-full"
            disabled={busy}
            onClick={requestFriendship}
          >
            {busy
              ? "Sending…"
              : `Request friendship with ${invite.host.displayName}`}
          </Button>
        )}
      </Card>
    </div>
  );
}
