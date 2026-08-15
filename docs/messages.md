<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# Messages

Friends can chat in-app. Threads are 1:1. Peer token sends and booking events appear in the same conversation.

## Features

| Kind | Description |
|------|-------------|
| `text` | Plain message (1–2000 chars) |
| `transfer` | Public ERC-20 transfer of STRK or DAI to the friend’s wallet, then recorded in chat |
| `booking` | System notice when a guest books the host’s listing (both get a notification) |

Only friends can message each other.

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/messages` | Yes | Threads (friends + last message) |
| GET | `/messages/:friendId` | Yes | Conversation |
| POST | `/messages/:friendId` | Yes | Send text `{ body }` |
| POST | `/messages/:friendId/transfer` | Yes | Record transfer `{ amount, asset, txHash }` after on-chain send |

## Web

- `/messages` — thread list
- `/messages/[friendId]` — chat + “Send DAI / STRK”
- Friends list → **Message**

## Related

- [social-graph.md](./social-graph.md)
- [bookings.md](./bookings.md)
- [payments.md](./payments.md)
