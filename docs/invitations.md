<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Invitations

Connectors introduce guests to host places via **opaque place invites**. Several people can share the same place; each invite carries its own connector.

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
- When a logged-in guest opens a place invite, `share_introductions` for `(guest, listing)` is **upserted** to that share’s connector (last-touch).
- At booking, `resolveConnectorForBooking` reads that introduction:
  - `connectorId` null (host place invite) → direct booking, 0% connector
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
| `/connector` | Share any friend place with earn % highlighted |
| `/friends/[id]` | Share that friend’s places |
| `/listings/[id]` | Friend + % > 0 → **Share place invite & earn**; host share has no connector reward |

Listing cards (`ListingCard`) show `{n}% connector reward` next to the DAI price when the host set a reward. Helper **Book & pay: STRK or DAI** (not “Guest Book & pay”). Empty photo: **No place photo**.

**Copy UX:** `CopyInviteButton` (`apps/web/src/components/copy-invite-button.tsx`) writes the `/invite/{token}` URL via `copyText` in `lib/share-invite.ts` (Clipboard API, then `execCommand` fallback). Default label **Copy place invite**. On success the button reads **Place invite copied** for 2s (not “Copied!”) and the status line is **Place invite copied** (connector: you earn if they **Book & pay**) or **Place invite ready** if copy failed. Native share success: **Place invite shared**. If both copy paths fail, the URL stays visible so the user can select it.

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/listings/:id/share` | Yes | Create share; returns `hasConnector` |
| GET | `/invite/:token` | Optional | Resolve place invite; records introduction if logged in. Missing/expired: **This place invite isn’t available to Book & pay.** (not “Invitation unavailable.”). The invite page surfaces that API error (not a silent generic catch). |
| GET | `/connector/earnings` | Yes | Connector reward history |
| GET | `/friends/:id` | Yes | Friend + their places (share from profile) |

## Invite gate

1. Guest opens the **place invite**.
2. If already friends with host → the place opens (**Opening place to Book & pay…**). First paint while resolving the token: **Opening place invite to Book & pay…**. Pending friendship: open the **place** so you can Book & pay. Invite eyebrow: **Place invite**. Invalid/expired token (API + page): **This place invite isn’t available to Book & pay.** Invite body: **Place hosted by** (not “Private place hosted by”). Already friends when requesting: **You’re already friends — Book & pay their places from Friends.** Connector empty: **None — host place invite**. Host share: **This host place invite has no connector reward.** Connector share: **If you Book & pay through this place invite**, the reward goes to their Ready X wallet.
3. If not → **Request friendship to Book & pay with {name}** (not “Request friendship with”); after accept, the place unlocks. Friend-request fail: **Could not send the friend request to Book & pay.** Busy: **Sending friend request to Book & pay…** (not “Sending…”). While pending, `/invite/[token]` polls every **3s** and redirects when `canViewListing` becomes true (copy: open the place so you can **Book & pay**).
4. Display name is cosmetic; rewards always go to the connector **Ready X wallet**. Unsigned guests tap **Connect Ready X to Book & pay** on `/invite/[token]`. Connector badge: **Connector (Ready X payout)**. Invite body: friends with the host to **Book & pay (STRK or DAI)**; if they **Book & pay** through the place invite, the reward goes to the connector’s Ready X wallet.

## Related

- [connectors.md](./connectors.md) — earn as a connector
- [social-graph.md](./social-graph.md)
- [bookings.md](./bookings.md)
