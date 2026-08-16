# Private Messaging (STRK20 RFP) — Philoxenia Plan

## Overview

Upgrade Philoxenia chat UI/UX and add a **sealed messaging** path aligned with
[Encrypted on-chain messaging via the privacy pool](https://strk20.starknet.io/rfp/private-messaging).

## Goals

- Modern chat UX (threads + conversation).
- **Sealed** messages: ciphertext only on the API; decrypt on device.
- On-chain **MessageMailbox** helper (`privacy_invoke`) for sealed payloads.
- Honest labeling vs full RFP anonymity.

## Non-goals (this phase)

- Full pool ECDH / viewing-key `discoverMessages` (needs Privacy SDK or Wallet API extensions Philoxenia must not custody).
- Replacing friend graph with anonymous channels.
- Modifying the STRK20 pool contract.

## Phases

### Phase A — shipped in this change set

1. Chat UI redesign (list + thread).
2. Client E2E keys (Web Crypto); publish encryption public key on profile.
3. Sealed send: encrypt to friend pubkey; API stores ciphertext (`phx1:…`).
4. Cairo `MessageMailbox` helper + unit test (store/emit via `privacy_invoke`).
5. Docs: what is sealed vs RFP-complete.

### Phase B — follow-up

1. ✅ Deploy MessageMailbox mainnet (`0x00db59…3691`); env `NEXT_PUBLIC_MESSAGE_MAILBOX_ADDRESS`.
2. ✅ Optional Ready invoke checkbox to post ciphertext hash on-chain.
3. Event indexer (ciphertext-only) for recovery without API — still open.

### Phase C — RFP complete

1. Reuse pool channel ECDH via Privacy SDK / future Wallet API.
2. `sendMessage` / `discoverMessages` without Philoxenia holding viewing keys.
3. Payment memos attached to private transfers in one tx.

## Hidden vs visible (Phase A)

| Element | Phase A | Full RFP |
|---------|---------|----------|
| Message content | Hidden from API (E2E) | Hidden |
| Friend relationship | Visible to API | Hidden |
| Sender on-chain | N/A until Phase B | Pool = msg.sender |
| Recipient | Friend id off-chain | Viewing key only |

## Verification

- [x] Sealed message: API row is not readable plaintext; friend device decrypts.
- [x] Standard legacy plaintext still renders if present.
- [x] `scarb test` includes mailbox helper.
- [x] Docs state Phase A vs RFP gaps.
- [x] Phase B: deploy mailbox + optional Ready invoke.
- [ ] Phase C: pool ECDH discoverMessages.
