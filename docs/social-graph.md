# Social graph

Friendships are **entirely off-chain**. They gate listing visibility and sharing permissions.

## Model

- Users are identified by Starknet wallet address (normalized) and a display name.
- Friendships are **mutual** — created when a friend request is accepted.
- Stored as ordered pairs `(userAId, userBId)` to prevent duplicates.

## Friend requests

| Status | Meaning |
|--------|---------|
| `pending` | Sent, awaiting response |
| `accepted` | Becomes a friendship |
| `rejected` | Closed; sender may request again later |

Users cannot send duplicate pending requests to the same person or request themselves.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/friends` | Friends + pending incoming/outgoing |
| GET | `/friends/search?q=` | Search by display name or wallet (min 2 chars) |
| POST | `/friends/request` | Send request `{ toUserId }` |
| POST | `/friends/accept/:id` | Accept incoming request |
| POST | `/friends/reject/:id` | Reject incoming request |
| DELETE | `/friends/:id` | Remove friendship |

## Authorization rules

Defined in `apps/api/src/lib/authorization.ts`:

| Action | Rule |
|--------|------|
| View listing | Host, or friend of host |
| Share listing | Host, or friend of host |
| Book listing | Must be able to view listing |
| Connector for booking | Recorded introduction where connector is still friend of host |

## Discovery

- **Network listings** (`GET /my-network/listings`) — listings from friends only.
- **No global directory** — there is no endpoint to browse all listings.

## Invitation interaction

When a guest opens an invite but is not yet friends with the host:

1. A `share_introductions` row links guest → connector → listing.
2. Guest must send (and host must accept) a friend request before viewing/booking.
3. After friendship, the connector attribution persists for booking reward calculation.

## Implementation status

| Feature | Status |
|---------|--------|
| Friend requests + friendships | Implemented |
| Search users | Implemented |
| On-chain social graph | Not planned for MVP |
| Block lists / privacy controls | Not implemented |

## Related

- [listings.md](./listings.md) — visibility rules
- [invitations.md](./invitations.md) — connector flow
