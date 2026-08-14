"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { InviteResolution } from "@philoxenia/shared";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { user, token, connectWallet, signIn } = useAuth();
  const [invite, setInvite] = useState<InviteResolution | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<InviteResolution>(`/invite/${params.token}`)
      .then(setInvite)
      .catch(() => setError("Invitation unavailable."))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function requestFriendship() {
    if (!token) {
      await connectWallet();
      await signIn();
    }
    await api.post("/friends/request", { toUserId: invite!.hostId });
    const updated = await api.get<InviteResolution>(`/invite/${params.token}`);
    setInvite(updated);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading invitation…</p>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <Card className="max-w-md text-center">
          <p className="text-muted">{error || "Invitation unavailable."}</p>
        </Card>
      </div>
    );
  }

  if (invite.canViewListing) {
    router.replace(`/listings/${invite.listingId}`);
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <Card className="w-full max-w-lg">
        <p className="text-sm uppercase tracking-widest text-muted">
          Invitation
        </p>
        <h1 className="mt-4 text-3xl">
          You&apos;ve been invited to view a place on Philoxenia.
        </h1>
        <p className="mt-4 text-muted leading-relaxed">
          {invite.connector.displayName} shared a private listing hosted by{" "}
          {invite.host.displayName}. Request friendship with the host to view
          and book.
        </p>

        {!user ? (
          <div className="mt-8 space-y-3">
            <Button
              className="w-full"
              onClick={async () => {
                await connectWallet();
                await signIn();
              }}
            >
              Create account & connect wallet
            </Button>
          </div>
        ) : invite.friendshipPending ? (
          <p className="mt-8 text-sm text-muted">
            Friendship request pending. The host must accept before you can
            view the listing.
          </p>
        ) : (
          <Button className="mt-8 w-full" onClick={requestFriendship}>
            Request friendship with {invite.host.displayName}
          </Button>
        )}
      </Card>
    </div>
  );
}
