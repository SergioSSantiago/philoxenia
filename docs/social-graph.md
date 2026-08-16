<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Social graph

Friendships are **entirely off-chain**. They gate listing visibility and sharing permissions.

## Model

- Users are identified by Starknet wallet address (normalized) and a display name.
- Display names are shown to friends but **are not searchable**. Add someone by wallet address only.
- Friendships are **mutual** — created when a friend request is accepted.
- Stored as ordered pairs `(userAId, userBId)` to prevent duplicates.

## Friend requests

| Status | Meaning |
|--------|---------|
| `pending` | Sent, awaiting response |
| `accepted` | Becomes a friendship |
| `rejected` | Closed; sender may request again later |

Users cannot send duplicate pending requests to the same person or request themselves. The sender can **cancel** a pending request (`POST /friends/cancel/:id`). Incoming Accept/Reject update both parties via notifications.

## Notifications

In-app notifications (polled ~2.5s while the tab is visible) for friend request lifecycle:

| Type | Recipient |
|------|-----------|
| `friend_request` | Target user |
| `friend_accepted` | Original sender |
| `friend_rejected` | Original sender |
| `friend_cancelled` | Target user |

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications` | List + unread count |
| POST | `/notifications/:id/read` | Mark one read |
| POST | `/notifications/read-all` | Mark all read |

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/friends` | Friends + pending incoming/outgoing |
| GET | `/friends/search?q=` | Search by **wallet address only** (min 2 chars) |
| GET | `/friends/:id` | Friend profile + their listings (must be friends) |
| PATCH | `/users/me` | Update display name (1–64 chars) |
| POST | `/friends/request` | Send request `{ toUserId }` |
| POST | `/friends/accept/:id` | Accept incoming request |
| POST | `/friends/reject/:id` | Reject incoming request |
| POST | `/friends/cancel/:id` | Cancel outgoing pending request |
| POST | `/friends/remove/:id` | Remove friendship |
| DELETE | `/friends/:id` | Remove friendship (legacy) |

## Friend profile (web)

`/friends/[id]` — identity, wallet, listings from that friend, and **Share invite & earn** when the listing has a connector %.

Opened by tapping **name** or **wallet** on:

- `/friends` (accepted friends)
- `/messages` inbox
- `/messages/[friendId]` chat header

Chat remains available via Message buttons / preview / ›.

## Authorization rules

Defined in `apps/api/src/lib/authorization.ts`:

| Action | Rule |
|--------|------|
| View listing | Host, or friend of host |
| Share listing | Host, or friend of host |
| Book listing | Must be able to view listing |
| Connector for booking | Last invite opened for that listing; null if host shared or connector no longer friend of host |

## Discovery

- **Network listings** (`GET /my-network/listings`) — listings from friends only.
- **Friend listings** (`GET /friends/:id`) — one friend’s places (same visibility rule).
- **No global directory** — there is no endpoint to browse all listings.

## Invitation interaction

When a guest opens an invite but is not yet friends with the host:

1. A `share_introductions` row links guest → listing (connector if a friend shared; null if the host shared).
2. Guest must send (and host must accept) a friend request before viewing/booking.
3. After friendship, attribution from the last opened link persists for booking reward calculation.

## Implementation status

| Feature | Status |
|---------|--------|
| Friend requests + friendships | Implemented |
| Search users | Implemented (wallet address only) |
| Friend profile + listings | Implemented (`/friends/[id]`) |
| Connector share from social surfaces | Implemented |
| On-chain social graph | Not planned for MVP |
| Block lists / privacy controls | Not implemented |

## Related

- [connectors.md](./connectors.md) — earn by introducing guests
- [listings.md](./listings.md) — visibility rules
- [invitations.md](./invitations.md) — connector flow
- [messages.md](./messages.md) — friend chat + peer transfers
