# STRK20 Privacy Integration Plan — Philoxenia

Generated 2026-08-15 by the strk20-privacy-integration skill. **Product complete** as of 2026-08-15 (private Ready path live on mainnet). Statuses below were re-verified at close-out.

**Interview decisions (2026-08-15):** privacy of everything that STRK20 can sensibly cover, by default; **mainnet**; public ERC20 kept only as honest graceful degradation when the wallet lacks STRK20 (Ready privacy preferred).

## 1. Project snapshot

- Stack: Next.js 15 (`apps/web`), Fastify API (`apps/api`), Cairo `BookingEscrow` + `BookingEscrowAnonymizer` (`contracts/src/`), PostgreSQL off-chain social/listings/bookings. Frontend: `starknet@10.7.0` (root override), `@starknet-react/core@^5`, `starknetkit@^3.4.3`, Ready-only connectors in `apps/web/src/lib/wallet-connectors.ts`.
- Relevant code:
  - Wallet connect / auth: `apps/web/src/components/auth-modal.tsx`, `apps/web/src/components/providers.tsx`, `apps/web/src/lib/wallet-connectors.ts`
  - Public fund path: `apps/web/src/lib/payments/public-payment-provider.ts` (`approve` + `create_booking` + `fund_booking` + `settle_booking`)
  - Private fund path: `apps/web/src/lib/payments/strk20-payment-provider.ts` + `private-escrow-fund.ts` (Wallet API `withdraw` → anonymizer + `invoke` `privacy_invoke`)
  - Settle / refund helpers: `apps/web/src/lib/payments/escrow-actions.ts`
  - Booking UI: `apps/web/src/app/bookings/new/page.tsx`, `apps/web/src/app/bookings/[id]/page.tsx`
  - Flag: `NEXT_PUBLIC_STRK20_PRIVACY` in `apps/web/src/lib/tokens.ts`
  - On-chain (mainnet): STRK escrow `0x030533…e1f3`, DAI escrow `0x004c03…a712`, anonymizer `0x056a81…defb` — see [docs/deploy-escrow.md](./docs/deploy-escrow.md)
- Privacy goal: **default-private payments and balances** wherever STRK20 applies — shield / private transfer / unshield / private balance UX; private funding of bookings so the guest↔payment link is hidden from public observers as far as the pool + anonymizer allow. Discovery is already private off-chain (friend graph). Do **not** pretend the API operator cannot see booking metadata.
- Environment: **Starknet mainnet**; wallets: Ready (extension / mobile). No Braavos / Privy.

## 2. Chosen route: Privacy Wallet API (starknet.js) + BookingEscrow anonymizer

**Mixed route, shipped.** Philoxenia is a normal dapp (users connect their own wallet) **and** a protocol with its own escrow contracts. Shield / unshield / private transfer / private balances go through the **Privacy Wallet API via starknet.js**. Funding escrow **without revealing the guest as the public ERC-20 payer into escrow** uses the team-owned **anonymizer** (`privacy_invoke`). There is still **no** drop-in `packages/escrow` in the privacy monorepo — Philoxenia maintains its own helper.

**The rule this follows:** this app **never touches viewing keys** — Ready acts on the user’s behalf via starknet.js. The Privacy SDK is for **team-controlled** anonymizer/dev testing only, never for end-user flows.

## 3. What this delivers — hidden vs visible

| Private (STRK20 / anonymizer) | Still public / visible |
|---|---|
| Sender & receiver of a private transfer; transfer amounts inside the pool | Shield (deposit) and unshield (withdraw) **amounts** — the public ERC-20 legs |
| Private note ownership; private balance reads via wallet consent | That an address interacted with the pool; timing of those interactions |
| Guest address behind a **successful** anonymizer-funded escrow action (observer sees pool ↔ anonymizer, not guest→escrow) | Escrow state / amounts / host / connector / protocol splits once funds sit in `BookingEscrow` (contract storage & events) |
| Off-chain listing discovery (already: friends / invite only) | Philoxenia API booking rows (dates, parties, amounts, tx hashes) to the operator |
| — | Relayer as tx `sender` — never attribute activity by transaction sender; use pool `Deposit` event topic1 if indexing |

**Honest limit:** “Privacy by default” means **wallet-mediated private balances + private funding path when Ready supports STRK20**, not full anonymity of hospitality metadata or invisible escrow economics. Anonymizer hides the **user address** on the fund leg; amounts and app activity at the escrow may still leak. Composition: do **not** silently bundle a public shield with the private fund in one user-facing “private” step without labeling the public deposit leg ([concepts](https://strk20-by-example.org/what-is-strk20)).

## 4. Prerequisites & versions

Re-verified at close-out (2026-08-15):

- `starknet@10.7.0` (override in root `package.json`)
- `@starknet-io/get-starknet-discovery@6.0.4`, `@starknet-io/get-starknet-wallet-standard@6.0.4`, `@starknet-io/types-js@0.10.3`
- Capability detect: wallet-API **≥ 0.10** via `walletV6.supportedWalletApi` — **never** probe `strk20Balances([])` for feature detection
- Test wallet: Ready X on Chrome with Smart Wallet + Private, or Ready X app browser on iPhone (Firefox has no Ready X)
- Cairo: Scarb / Starknet Foundry for anonymizer (team-owned)
- Pool (mainnet): `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a`
- Note: `@starknet-react/core` / `starknetkit` peer-declare starknet ^8; override forces 10.7.0

## 5. Phase 1 — Wallet stack + first shielded flows ✅ done 2026-08-15

**Status:** shipped and verified on mainnet with Ready

1. ✅ Upgraded monorepo to `starknet@10.7.0` + get-starknet discovery/standard 6.0.4; root override updated.
2. ✅ `WalletAccountV6` helper: `apps/web/src/lib/payments/wallet-account-v6.ts` (createStore + `supportedWalletApi`).
3. ✅ Real `shield` / `unshield` / `strk20Balances` in `strk20-payment-provider.ts`.
4. ✅ Graceful degradation when wallet API &lt; 0.10 (panel + booking copy).
5. ✅ Profile UI: `Strk20PrivacyPanel`; booking page labels public vs private escrow fund.
6. ✅ Manual Ready verification on mainnet (shield + private book).

## 6. Phase 2 — App flows: private-by-default booking UX ✅ done 2026-08-15

**Status:** shipped

1. ✅ Booking pay: Private (default) vs Public toggle when wallet STRK20-capable; otherwise public.
2. ✅ Labels for public legs / proving wait; `privacyMode` stored from provider result.
3. ✅ Settle/refund remain public escrow calls (documented).
4. ✅ Docs: `docs/strk20.md`, `docs/booking-escrow-anonymizer.md`, `PRIVACY.md`.
5. ✅ Also: block booking nights before today (API `assertNoPastNights` + guest calendar).

## 7. Phase 3 — BookingEscrow anonymizer + private fund wiring ✅ done 2026-08-15

**Status:** live on mainnet (ABI + Voyager verified + smoke-tested)

- ✅ Cairo: `BookingEscrow` v2 + `BookingEscrowAnonymizer`
- ✅ Deploy + `voyager verify` both classes
- ✅ Env: `NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS` + current escrow addresses
- ✅ Mainnet smoke: public pay, anonymizer `privacy_invoke`, connector 5% split
- ✅ Private Ready path live: hex calldata + `withdraw`→`invoke` (no OPEN for settle-all); verified private bookings on mainnet
- ✅ `payments.privacy_mode` + booking API/UI `privacyMode`
- ✅ Hackathon `strk20.json` + commercial demo video (EN)

## 8. Phase 4 — Out of scope (product complete)

Not planned for this product release:

- Wallet-API sub-accounts / Xverse
- Escrow redesign to hide guest address in storage
- Privacy Bridge / EVM funding

## 9. Testing

- ✅ Mainnet private booking via Ready (anonymizer path)
- ✅ snforge anonymizer create/fund/settle (+ connector reward)
- Wallet test dapp for connection/API sanity when debugging wallets

## 10. Compliance & security notes

- Deposit screening is onchain; surface declines in UX.
- Selective disclosure exists for legitimate requests — not automatic compliance / endorsement; Philoxenia owns legal posture.
- Anonymizer: team owns review, audit, deploy, maintenance.
- No viewing keys, notes, or proofs in app code or env files beyond public addresses / RPC.

## 11. Checklist (closed)

- [x] `starknet` pin → **10.7.0**
- [x] get-starknet → **6.0.4**
- [x] Ready connect / SNIP-12 auth + private book
- [x] Anonymizer drives fund/settle without guest as ERC-20 payer into escrow
- [x] Honest privacy docs (guest/host/amounts still public in escrow storage)
- [x] `strk20.json` demo_url + demo_video + pool-touching txs

## 12. Links

- https://strk20-by-example.org/what-is-strk20
- https://strk20-by-example.org/starknet-wallet-api/overview
- https://strk20-by-example.org/starknet-wallet-api/starknet-js
- https://strk20-by-example.org/starknet-wallet-api/starknet-start-hook
- https://strk20-by-example.org/starknet-wallet-api/private-defi
- https://strk20-by-example.org/helpers/privacy-invoke
- https://docs.starknet.io/build/starknet-privacy/overview
- https://github.com/starkware-libs/starknet-privacy
- https://starknet-js.com/docs/next/guides/account/walletAccount/#with-get-starknet-v6
- Pool: https://voyager.online/contract/0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a
- Demo video: https://github.com/SergioSSantiago/philoxenia/releases/download/strk20-demo-v2/philoxenia-commercial.mp4
