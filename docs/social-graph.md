<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Social graph

Friendships are **entirely off-chain**. They gate place visibility and sharing permissions.

## Model

- Users are identified by Starknet wallet address (normalized) and a display name.
- Display names are shown to friends but **are not searchable**. Add someone by **Ready X wallet** address only. `WalletAddress` label is **Ready X wallet**; Share text is `My Philoxenia Ready X wallet`; native share title **My Philoxenia Ready X wallet**; **Copy** flashes **Copied!** for 2s. `/friends` CTA is **Add friend by Ready X wallet**. Search miss: they must **Connect Ready X** once.
- Friendships are **mutual** — created when a friend request is accepted.
- Stored as ordered pairs `(userAId, userBId)` to prevent duplicates.

## Friend requests

| Status | Meaning |
|--------|---------|
| `pending` | Sent, awaiting response |
| `accepted` | Becomes a friendship |
| `rejected` | Closed; sender may request again later |

Incoming empty: “They appear when someone adds your Ready X wallet.” Outgoing empty explains Cancel. Friends empty: add by **Ready X wallet** address (0x optional) — they must **Connect Ready X** once, then you can **Book & pay** their places. List subtitle: tap name or Ready X wallet to see places you can **Book & pay**. Search miss fallback: **Could not find that Ready X wallet**. Send fail: **Could not send friend request**. Accept/reject fail: **Could not update this friend request**. Remove fail: **Could not remove this friend**. Missing request: **That friend request isn’t available.** Not pending: **That friend request is no longer pending.** Already pending: **A friend request is already pending — Book & pay their places after they accept.** Already friends: **You’re already friends — Book & pay their places from Friends.** Self-request: **You can’t send a friend request to yourself.** Remove miss: **That friendship isn’t available.** Friends list load fail: **Could not load friends to Book & pay.** Friend profile load fail: **Could not load this friend’s places to Book & pay**. Friends page loader: **Loading friends to Book & pay…**.

## Notifications

Bell empty: friend requests, **sealed notes**, and **Book & pay** stays (UI: **sealed notes**, not “sealed messages”). Footer links: **Friends**, **Messages**, **Bookings**, **Earnings**. Polled ~2.5s while the tab is visible. Friend-request body: **wants to be friends so you can Book & pay** (not “wants to connect”). Message bell: **New sealed note** / **New note** (not “New message”); helper **open Messages to read this sealed note**. Social-cancel bell: **Nights freed** (not “Booking cancelled”); body **Stay at “…”: nights are free again**.

| Type | Recipient |
|------|-----------|
| `friend_request` | Target user |
| `friend_accepted` | Original sender |
| `friend_rejected` | Original sender |
| `friend_cancelled` | Target user |
| `friend_removed` | Other party |
| `message` | Friend who received a sealed note |
| `transfer` | Friend who received a peer STRK/DAI send |
| `booking` | Host and guest on a new **Book & pay**; the other party on social cancel (Messages: **Send STRK or DAI**) |

| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications` | List + unread count |
| POST | `/notifications/:id/read` | Mark one read. Missing: **That notification isn’t available.** |
| POST | `/notifications/read-all` | Mark all read |

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/friends` | Friends + pending incoming/outgoing |
| GET | `/friends/search?q=` | Search by **Ready X wallet** only. Client prepends `0x` if missing and requires ≥4 hex chars of a **Ready X wallet** (normalized length ≥ 6). API minimum is 2 chars. |
| GET | `/friends/:id` | Friend profile + their places (must be friends). Not friends: **you must be friends to Book & pay their places**. Missing user: **they must Connect Ready X once** |
| PATCH | `/users/me` | Update display name (1–64 chars) and/or sealed Messages keys. Empty body: **Enter a display name or sealed Messages keys**. Too short/long: **Enter a display name (1–64 characters). Friends add you by Ready X wallet.** Save fail: **Could not save your display name**. Bad key: **Could not save sealed Messages keys** |
| POST | `/friends/request` | Send request `{ toUserId }` |
| POST | `/friends/accept/:id` | Accept incoming request |
| POST | `/friends/reject/:id` | Reject incoming request |
| POST | `/friends/cancel/:id` | Cancel outgoing pending request |
| POST | `/friends/remove/:id` | Remove friendship |
| DELETE | `/friends/:id` | Remove friendship (legacy) |

## Friend profile (web)

`/friends/[id]` — identity, **Ready X wallet**, heading **Places to Book & pay**. Intro: open one to **Book & pay**, or **share a place invite** to earn (same asset they Book & pay). Profile CTA **Messages** (not Message). Empty places: **You can still open Messages**; Book & pay when they list a place. **Share place invite & earn** when the place has a connector %.

Opened by tapping **name** or **Ready X wallet** on:

- `/friends` (accepted friends) — empty list: add by **Ready X wallet** (0x optional)
- `/messages` inbox
- `/messages/[friendId]` chat header

Chat remains available via Message buttons / preview / ›.

## Authorization rules

Defined in `apps/api/src/lib/authorization.ts`:

| Action | Rule |
|--------|------|
| View place | Host, or friend of host |
| Share place | Host, or friend of host |
| Book & pay place | Must be able to view the place |
| Connector for stay | Last invite opened for that place; null if host shared or connector no longer friend of host |

## Discovery

- **Network places** (`GET /my-network/listings`) — places from friends only.
- **Friend places** (`GET /friends/:id`) — one friend’s places (same visibility rule).
- **No global directory** — there is no endpoint to browse all places.

## Invitation interaction

When a guest opens an invite but is not yet friends with the host:

1. A `share_introductions` row links guest → place (connector if a friend shared; null if the host shared).
2. Guest must send (and host must accept) a friend request before viewing / Book & pay.
3. After friendship, attribution from the last opened link persists for stay reward calculation.

## Implementation status

| Feature | Status |
|---------|--------|
| Friend requests + friendships | Implemented |
| Search users | Implemented (**Ready X wallet** only) |
| Friend profile + places | Implemented (`/friends/[id]`) |
| Connector share from social surfaces | Implemented |
| On-chain social graph | Not planned for MVP |
| Block lists / privacy controls | Not implemented |

## Related

- [connectors.md](./connectors.md) — earn by introducing guests
- [listings.md](./listings.md) — visibility rules
- [invitations.md](./invitations.md) — connector flow
- [messages.md](./messages.md) — friend chat + peer transfers
