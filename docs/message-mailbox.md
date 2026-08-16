<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="64" height="64" />
</p>

# MessageMailbox (STRK20 sealed messaging helper)

Cairo helper callable by the privacy pool via `privacy_invoke`. Stores a payload commitment per message and emits `MessagePosted`. Does **not** modify the pool contract.

## Mainnet

| Piece | Address / class |
|-------|-----------------|
| MessageMailbox | [`0x00db59cc85293629eacd959ea17faaa13c6e9116afa68274c465738692e53691`](https://voyager.online/contract/0x00db59cc85293629eacd959ea17faaa13c6e9116afa68274c465738692e53691) |
| Class | [`0x06018bd…82e3`](https://voyager.online/class/0x06018bd09da22d5a3313d79c3901830d74013ce098bbb8776a2b05ba022d82e3) |
| Privacy pool (constructor) | [`0x040337b1…812a`](https://voyager.online/contract/0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a) |

## Entrypoint

`privacy_invoke(channel_id, payload_hash, chunk_count, note_id) → empty OpenNoteDeposit span`

Caller must be the privacy pool (when pool is set in storage).

## App wiring

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_MESSAGE_MAILBOX_ADDRESS` | mailbox address above (also defaulted in web code) |

Chat seals E2E off-chain first. Optional UI checkbox **Also anchor on-chain** posts the ciphertext hash via Ready `strk20InvokeTransaction` → pool → mailbox.

## Related

- [PRIVATE_MESSAGING_PLAN.md](../PRIVATE_MESSAGING_PLAN.md)
- [messages.md](./messages.md)
- [booking-escrow-anonymizer.md](./booking-escrow-anonymizer.md)
