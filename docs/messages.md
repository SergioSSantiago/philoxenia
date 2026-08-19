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
| `transfer` | Public **or** private **Send STRK or DAI** to the friend’s Ready X wallet, then recorded in Messages. Public copy: both Ready X wallets visible on-chain. Thread body **Sent STRK · Private** / **Sent STRK · Public**. Bubble **Sent STRK or DAI** / **Received STRK or DAI** (not “You sent”). Tx **View on Voyager**. Private eyebrow **Private Send STRK or DAI** (not “Private transfer”). Bell: **A friend used Send STRK or DAI in Messages** (not “tokens in chat”) |
| `booking` | System notice after a guest **Book & pay** on the host’s place (`Book & pay for “…”`). Bell titles: **New Book & pay** (host), **Book & pay complete** (guest). Social cancel: **Nights freed** (not “Booking cancelled”) |

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

- `/messages` — sealed inbox list. Eyebrow **Sealed Messages** (not “Private inbox”). Empty inbox means **no friends** (API returns one thread per friend even before the first note). Copy points to adding by **Ready X wallet** on Friends; **Send STRK or DAI in Messages**; **Book & pay** updates show up on the thread. Intro: tap name or Ready X wallet to see places and **share a place invite**. Banner: **Sealed Messages is on** / **Preparing sealed Messages keys…**; same thread for Book & pay updates and Send STRK or DAI. Tap **name** or **Ready X wallet** → friend’s places (`/friends/[id]`); avatar title **View places to Book & pay**; avatar aria **View places to Book & pay for {name}** (not “View {name}’s places”); tap preview or › → **Messages** (aria **Open Messages with …**, not “Open chat”). Lock title **Sealed note**. Banner helper: **Who you send sealed notes to** (not “Who you chat with”). Keys fail: **Could not enable sealed Messages**. Fallback previews: **Start a sealed note to Book & pay**, **Send STRK or DAI**, **Book & pay update**. Load fail: **Could not load sealed Messages.** (not “Could not load Messages.”). Self-message: **You can’t send a sealed note to yourself.** Not friends: **You can only send sealed notes to friends — add them by Ready X wallet first.**
- `/messages/[friendId]` — sealed composer + pay sheet (Private default: shielded STRK/DAI; public send helper **Send STRK or DAI on-chain via Ready X**). Header button is **Send STRK or DAI**; when the sheet is open **Close Send STRK or DAI** (not “Close”). Sheet copy: **STRK or DAI from Messages** — same friend wallet as **Book & pay**. Empty thread: **Start a sealed note to Book & pay** (not “Say hello — sealed note”). Placeholder **Write a sealed note to Book & pay** (not “Write a sealed note…”). Submit **Send sealed note** (not “Send”). Missing friend key: **Ask them to open sealed Messages once** (not “Ask your friend to open Messages”). Composer hint **Enter to send this sealed note**. Anchor helper: **not needed for a sealed note** (not “normal chat”). Pay CTA when disconnected: **Connect Ready X to Send STRK or DAI**; when connected: **Send STRK · Private** / **Send STRK · Public** (or DAI). Mode toggles **Private send** / **Public send**. Unsealed API limit: **This note must be 1–2000 characters**. Client seal limit: **This sealed note must be at most … characters**. System stay messages link **View stay**. Load fail surfaces the API (fallback **This Messages thread isn’t available.**). Opening: **Opening sealed Messages…**. Header: **Sealed Messages** / **Waiting for friend’s sealed key**. Thread wallet title **Places to Book & pay for {name}** (not “{name}’s places”). Decrypt miss: **Could not open this sealed note on this device** (not “Unable to decrypt…”). Note fail: **Could not send this sealed note**. Keys missing: **Generate your sealed Messages keys first**. Preview without keys: **Sealed note**. Too large: **This sealed note is too large**. After reconnect: **finishing Send STRK or DAI**. Busy send: **Sending STRK or DAI…**. Preparing keys: **Preparing sealed Messages keys…**. Pay-sheet fail: **Could not send STRK or DAI**. Ready X reconnect: **Ready X is ready to sign. You can Send STRK or DAI now.** After pay: **Finishing Send STRK or DAI…**. Missing tx: **Send STRK or DAI needs a transaction hash.** Amount parse: **Enter a valid STRK or DAI amount**. If JWT is live but the wallet is not, notices say **Connect Ready X** (Chrome or iPhone) — not a generic Ready extension. Reconnect errors: **Ready X session needed**. Header name/wallet → friend profile. Optional **Anchor this sealed note** (not “Advanced”) posts a ciphertext hash to MessageMailbox. Keys: **Ready X is required for sealed Messages**.
- Keys live in `localStorage` per wallet (`philoxenia_msg_priv_*`); never uploaded

## On-chain (Phase B)

Optional checkbox in the thread UI anchors a ciphertext hash via Ready X → privacy pool → [MessageMailbox](./message-mailbox.md).

| Piece | Address |
|-------|---------|
| MessageMailbox | `0x00db59cc85293629eacd959ea17faaa13c6e9116afa68274c465738692e53691` |

## Related

- [social-graph.md](./social-graph.md)
- [connectors.md](./connectors.md) — share that friend’s places and earn
- [bookings.md](./bookings.md)
- [payments.md](./payments.md)
- [message-mailbox.md](./message-mailbox.md)
- [PRIVATE_MESSAGING_PLAN.md](../PRIVATE_MESSAGING_PLAN.md)
