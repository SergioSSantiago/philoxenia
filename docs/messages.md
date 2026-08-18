<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Messages

Friends chat 1:1. **Text is sealed end-to-end** (Phase A): ciphertext only on the API; decrypt on device. Peer token sends and booking events share the same thread.

## Privacy model (honest)

| Element | Phase A (now) | Full STRK20 RFP |
|---------|---------------|-----------------|
| Message content | Hidden from API (E2E) | Hidden |
| Friend relationship | Visible to API | Hidden (channel via viewing key) |
| On-chain sender anonymity | Not yet | Pool is `msg.sender` via `privacy_invoke` |
| Discovery | Friend id + API | `discoverMessages(viewingKey)` |

See [PRIVATE_MESSAGING_PLAN.md](../PRIVATE_MESSAGING_PLAN.md) and the Cairo `MessageMailbox` helper.

## Features

| Kind | Description |
|------|-------------|
| `text` | Sealed body (`phx1.…`). Plaintext never stored. Limit ~900 chars plaintext. |
| `transfer` | Public ERC-20 **or** private STRK20 send of **STRK or DAI** to the friend’s Ready X wallet, then recorded in chat. Public copy: both Ready X wallets visible on-chain |
| `booking` | System notice after a guest **Book & pay** on the host’s listing (`Book & pay for “…”`). Bell titles: **New Book & pay** (host), **Book & pay complete** (guest) |

Only friends can message each other. Each user publishes `messagePublicKey` (device ECDH P-256) via `PATCH /users/me` when they open Messages.

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/messages` | Yes | Threads (friends + last message) |
| GET | `/messages/:friendId` | Yes | Conversation (ciphertext for sealed texts) |
| POST | `/messages/:friendId` | Yes | Send `{ body }` — prefer sealed `phx1.…` (max 8000) |
| POST | `/messages/:friendId/transfer` | Yes | Record transfer after on-chain send |
| PATCH | `/users/me` | Yes | `{ messagePublicKey }` and/or `{ displayName }` |

## Web

- `/messages` — sealed inbox list. Empty inbox means **no friends** (API returns one thread per friend even before the first note). Copy points to adding by **Ready X wallet** on Friends; you can also send STRK or DAI in chat. Tap **name** or **Ready X wallet** → friend’s listings (`/friends/[id]`); tap preview or › → chat. Fallback previews: **STRK or DAI sent**, **Book & pay update**.
- `/messages/[friendId]` — sealed composer + pay sheet (Private default: shielded STRK/DAI; Public ERC-20). Header button is **Send STRK or DAI**. Sheet copy: same friend wallet as **Book & pay**. System stay messages link **View stay**. If JWT is live but the wallet is not, notices say **Connect Ready X** (Chrome or iPhone) — not a generic Ready extension. Header name/wallet → friend profile. Optional **Also anchor on-chain** posts a ciphertext hash to MessageMailbox.
- Keys live in `localStorage` per wallet (`philoxenia_msg_priv_*`); never uploaded

## On-chain (Phase B)

Optional checkbox in the thread UI anchors a ciphertext hash via Ready → privacy pool → [MessageMailbox](./message-mailbox.md).

| Piece | Address |
|-------|---------|
| MessageMailbox | `0x00db59cc85293629eacd959ea17faaa13c6e9116afa68274c465738692e53691` |

## Related

- [social-graph.md](./social-graph.md)
- [connectors.md](./connectors.md) — share that friend’s listings and earn
- [bookings.md](./bookings.md)
- [payments.md](./payments.md)
- [message-mailbox.md](./message-mailbox.md)
- [PRIVATE_MESSAGING_PLAN.md](../PRIVATE_MESSAGING_PLAN.md)
