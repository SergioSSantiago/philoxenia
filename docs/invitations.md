<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Invitations

Connectors introduce guests to host listings via **opaque share links**. Several people can share the same listing; each link carries its own connector.

Introductions are the growth engine of Philoxenia — see **[connectors.md](./connectors.md)** for why earning as a connector matters and where to share in the UI.

## Flow

```
Host or friend of host
      │
      ├── POST /listings/:id/share
      │     host share  → connectorId = null (shareable, no reward)
      │     friend share → connectorId = sharer (reward wallet)
      │
      └── /invite/:token ──► guest
                               │
                               ├── must be friend of host (or request friendship)
                               ├── records share_introduction (last link wins)
                               └── after friendship → view + Book & pay (STRK or DAI)
```

## Multi-connector attribution

- Many active shares can exist for one listing (one per share action).
- When a logged-in guest opens a link, `share_introductions` for `(guest, listing)` is **upserted** to that share’s connector (last-touch).
- At booking, `resolveConnectorForBooking` reads that introduction:
  - `connectorId` null (host link) → direct booking, 0% connector
  - connector still friends with host → that connector earns the reward on settle
  - connector no longer friends with host → treated as no connector

## Share link properties

| Property | Value |
|----------|-------|
| Token | Cryptographically opaque |
| Expiry | 30 days |
| Status | `active`, `expired`, or `revoked` |
| URL | `/invite/{token}` |

## Where users create shares (web)

| Route | Action |
|-------|--------|
| `/connector` | Share any friend listing with earn % highlighted |
| `/friends/[id]` | Share that friend’s listings |
| `/listings/[id]` | Friend + % > 0 → **Share invite & earn**; host share has no connector reward |

Listing cards (`ListingCard`) show `{n}% connector` next to the DAI price when the host set a reward.

**Copy UX:** `CopyInviteButton` (`apps/web/src/components/copy-invite-button.tsx`) writes the `/invite/{token}` URL via `copyText` in `lib/share-invite.ts` (Clipboard API, then `execCommand` fallback). On success the button reads **Copied!** for 2s and the status line says the invite is ready to paste (connector copy: you earn if they **Book & pay**). If both copy paths fail, the URL stays visible so the user can select it.

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/listings/:id/share` | Yes | Create share; returns `hasConnector` |
| GET | `/invite/:token` | Optional | Resolve invite; records introduction if logged in |
| GET | `/connector/earnings` | Yes | Connector reward history |
| GET | `/friends/:id` | Yes | Friend + their listings (share from profile) |

## Invite gate

1. Guest opens link.
2. If already friends with host → listing opens (**Opening listing to Book & pay…**). First paint while resolving the token: **Opening invite to Book & pay…**.
3. If not → request friendship with host; after accept, listing unlocks. While pending, `/invite/[token]` polls every **3s** and redirects when `canViewListing` becomes true (copy: open the listing so you can **Book & pay**).
4. Display name is cosmetic; rewards always go to the connector **Ready X wallet**. Unsigned guests tap **Connect Ready X to Book & pay** on `/invite/[token]`. Connector badge: **Connector (Ready X payout)**. Invite body: friends with the host to **Book & pay (STRK or DAI)**; if they **Book & pay** through the link, the reward goes to the connector’s Ready X wallet.

## Related

- [connectors.md](./connectors.md) — earn as a connector
- [social-graph.md](./social-graph.md)
- [bookings.md](./bookings.md)
