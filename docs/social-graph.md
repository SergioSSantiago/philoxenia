<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Social graph

Friendships are **entirely off-chain**. They gate place visibility and sharing permissions.

## Model

- Users are identified by Starknet wallet address (normalized) and a display name.
- Display names are shown to friends but **are not searchable**. Add someone by **Ready X wallet** address only. `WalletAddress` label is **Ready X wallet**; Share text is `My Philoxenia Ready X wallet`; native share title **My Philoxenia Ready X wallet**; **Copy** flashes **Copied Ready X wallet** for 2s (not “Copied!”). `/friends` CTA is **Add by Ready X wallet** (not “Add friend by Ready X wallet”). Wallet card: **Friends add you by Ready X wallet** (not “Share this so friends can add you”). Page subtitle **Add by Ready X wallet only** (not “Add people by Ready X wallet address only”). Add form heading **Add by Ready X wallet** (not “Add someone you trust”); result **Add by Ready X wallet** (not “Add friend”); search **Search Ready X wallet** (not “Search”); dismiss **Close add by Ready X wallet**. Sent: **Friend request sent — Book & pay after they accept.** Send busy **Sending friend request…**. Accept idle **Accept to Book & pay**; busy **Accepting…**. Reject **Reject to Book & pay**. Cancel **Cancel friend request to Book & pay**; subtitle **Cancel before they can Book & pay**. Search miss: they must **Connect Ready X** once. Empty search: **No one on Philoxenia with that Ready X wallet** (not “No Philoxenia user”). Cancel busy **Cancelling friend request…** (not “Cancelling…”).
- Friendships are **mutual** — created when a friend request is accepted.
- Stored as ordered pairs `(userAId, userBId)` to prevent duplicates.

## Friend requests

| Status | Meaning |
|--------|---------|
| `pending` | Sent, awaiting response |
| `accepted` | Becomes a friendship |
| `rejected` | Closed; sender may request again later |

Incoming **Friend requests to Book & pay** (not “Incoming requests”); empty **No friend requests to Book & pay yet.** Outgoing **Sent requests to Book & pay**; empty **No sent requests to Book & pay yet.** Friends heading **Friends to Book & pay** (not “Your friends”). Page title **Friends to Book & pay** (not “Friends”; nav stays **Friends**). Incoming empty: “They appear when someone adds your Ready X wallet.” Outgoing empty explains Cancel. Friends empty: **Add by Ready X wallet (0x optional)** (not “Add someone by Ready X wallet”). List subtitle: tap name or Ready X wallet to see places you can **Book & pay**; **End friendship ends it for both of you** (not “Remove ends the friendship”). Success **Friendship ended — you can no longer Book & pay their places** (not “Friend removed”). Search miss fallback: **Could not find that Ready X wallet**. Empty search: **No one on Philoxenia with that Ready X wallet** (not “No Philoxenia user”). Send fail: **Could not send friend request to Book & pay**. Duplicate incoming: **check Friend requests to Book & pay** (not “Incoming requests”). Accept/reject fail: **Could not update this friend request to Book & pay**. Accept ok: **Friend request accepted — Book & pay their places.** Reject ok: **Friend request rejected — they cannot Book & pay your places.** Cancel ok: **Friend request cancelled — they cannot Book & pay yet.** Incoming subtitle **Accept so you can Book & pay**. List CTA **Messages** (not Message). Remove CTA **End friendship** (busy **Ending friendship…**); ok **Friend removed — you can no longer Book & pay their places.** Remove fail: **Could not end this friendship to Book & pay**. Missing request: **That friend request to Book & pay isn’t available.** Not pending: **That friend request to Book & pay is no longer pending.** Already pending: **A friend request is already pending — Book & pay their places after they accept.** Already friends: **You’re already friends — Book & pay their places from Friends.** Self-request: **You can’t send a friend request to yourself.** Remove miss: **That friendship isn’t available.** Friends list load fail: **Could not load friends to Book & pay.** Friend profile load fail: **Could not load this friend’s places to Book & pay**. Friends page loader: **Loading friends to Book & pay…**.

## Notifications

Bell heading **Friends, notes & stays** (not “Notifications”). **Mark friends, notes & stays read** (not “Mark all read”). Empty: **No friends, notes or Book & pay yet.** Friend requests, **sealed notes**, and **Book & pay** stays (UI: **sealed notes**, not “sealed messages”). Footer links: **Friends**, **Messages**, **Bookings**, **Earnings**. Polled ~2.5s while the tab is visible. Friend-request body: **wants to be friends so you can Book & pay** (not “wants to connect”). Message bell: **New sealed note** / **New note** (not “New message”); helper **open Messages to read this sealed note**. Social-cancel bell: **Nights freed** (not “Booking cancelled”); body **Stay at “…”: nights are free again**.

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
| POST | `/notifications/read-all` | Mark all read. UI: **Mark friends, notes & stays read** |

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/friends` | Friends + pending incoming/outgoing |
| GET | `/friends/search?q=` | Search by **Ready X wallet** only. Client prepends `0x` if missing and requires ≥4 hex chars of a **Ready X wallet** (normalized length ≥ 6). API minimum is 2 chars. |
| GET | `/friends/:id` | Friend profile + their places (must be friends). Not friends: **Not friends with this person — you must be friends to Book & pay their places** (not “this user”). Missing user: **they must Connect Ready X once** |
| PATCH | `/users/me` | Update display name (1–64 chars) and/or sealed Messages keys. Empty body: **Enter a display name or sealed Messages keys**. Too short/long: **Enter a display name (1–64 characters). Friends add you by Ready X wallet.** Save fail: **Could not save your display name**. Bad key: **Could not save sealed Messages keys** |
| POST | `/friends/request` | Send request `{ toUserId }` |
| POST | `/friends/accept/:id` | Accept incoming request |
| POST | `/friends/reject/:id` | Reject incoming request |
| POST | `/friends/cancel/:id` | Cancel outgoing pending request |
| POST | `/friends/remove/:id` | End friendship. Fail: **Could not end this friendship to Book & pay**. Missing: **That friendship to Book & pay isn’t available.** Self: **You can’t end friendship with yourself.** (not “You can’t remove yourself.”) |
| DELETE | `/friends/:id` | Remove friendship (legacy) |

## Friend profile (web)

`/friends/[id]` — identity, **Ready X wallet**, heading **Places to Book & pay**. Intro: open one to **Book & pay**, or **share a place invite** to earn (same asset they Book & pay). Profile CTA **Messages** (not Message). Empty places: **You can still open Messages**; Book & pay when they **publish a place**; empty heading **They haven’t published a place yet** (not “This friend hasn’t”). **Share place invite & earn** when the place has a connector %.

Opened by tapping **name** or **Ready X wallet** on:

- `/friends` (accepted friends) — empty list: add by **Ready X wallet** (0x optional)
- `/messages` inbox
- `/messages/[friendId]` chat header

Chat remains available via **Messages** buttons / preview / ›.

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
