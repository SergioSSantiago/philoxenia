# STRK20 Privacy Integration Plan — Philoxenia

Generated 2026-08-15 by the strk20-privacy-integration skill. Statuses below were current at generation time — re-verify the "coming soon" items and npm pins before building against them.

**Interview decisions (2026-08-15):** privacy of everything that STRK20 can sensibly cover, by default; **mainnet**; public ERC20 kept only as honest graceful degradation when the wallet lacks STRK20 (Ready privacy preferred).

## 1. Project snapshot

- Stack: Next.js 15 (`apps/web`), Fastify API (`apps/api`), Cairo `BookingEscrow` (`contracts/src/booking_escrow.cairo`), PostgreSQL off-chain social/listings/bookings. Frontend: `starknet@8.9.2`, `@starknet-react/core@^5`, `starknetkit@^3.4.3`, Ready-only connectors in `apps/web/src/lib/wallet-connectors.ts`. Monorepo root also pins `starknet@8.9.2`.
- Relevant code:
  - Wallet connect / auth: `apps/web/src/components/auth-modal.tsx`, `apps/web/src/components/providers.tsx`, `apps/web/src/lib/wallet-connectors.ts`
  - Public fund path: `apps/web/src/lib/payments/public-payment-provider.ts` (`approve` + `create_booking` + `fund_booking`)
  - STRK20 stub (falls back to public): `apps/web/src/lib/payments/strk20-payment-provider.ts`
  - Settle / refund: `apps/web/src/lib/payments/escrow-actions.ts`
  - Booking UI: `apps/web/src/app/bookings/new/page.tsx`, `apps/web/src/app/bookings/[id]/page.tsx`
  - Flag: `NEXT_PUBLIC_STRK20_PRIVACY` in `apps/web/src/lib/tokens.ts`
  - On-chain escrows (mainnet): STRK `0x0714…001bd`, DAI `0x00dc…18004` (see README / `docs/deploy-escrow.md`)
- Privacy goal: **default-private payments and balances** wherever STRK20 applies — shield / private transfer / unshield / private balance UX; private funding of bookings so the guest↔payment link is hidden from public observers as far as the pool + anonymizer allow. Discovery is already private off-chain (friend graph). Do **not** pretend the API operator cannot see booking metadata.
- Environment: **Starknet mainnet**; wallets: Ready (extension / mobile). No Braavos / Privy.

## 2. Chosen route: Privacy Wallet API (starknet.js) + BookingEscrow anonymizer

**Mixed route, phased.** Philoxenia is a normal dapp (users connect their own wallet) **and** a protocol with its own escrow contracts. Shield / unshield / private transfer / private balances go through the **Privacy Wallet API via starknet.js** ([overview](https://strk20-by-example.org/starknet-wallet-api/overview), [starknet.js](https://strk20-by-example.org/starknet-wallet-api/starknet-js)). Funding escrow **without revealing the guest as the public ERC-20 payer into escrow** needs an app-owned **anonymizer** (`privacy_invoke`) — there is **no** first-party Philoxenia private path today, and the privacy monorepo still has **no** drop-in `packages/escrow` (exclusion still valid as of freshness check 2026-08-15). Adapt from public reference helpers (`packages/vesu_lending_anonymizer`, `packages/ekubo_swap_anonymizer`) and [privacy_invoke anatomy](https://strk20-by-example.org/helpers/privacy-invoke); the team writes, audits, deploys, and maintains the production anonymizer.

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

Re-verified at Phase 1 build (2026-08-15):

- `starknet@10.7.0` (override in root `package.json`; WalletAccountV6 not present in 10.4.0 runtime that resolved earlier — use 10.7.0)
- `@starknet-io/get-starknet-discovery@6.0.4`, `@starknet-io/get-starknet-wallet-standard@6.0.4`, `@starknet-io/types-js@0.10.3`
- Capability detect: wallet-API **≥ 0.10** via `walletV6.supportedWalletApi` — **never** probe `strk20Balances([])` for feature detection
- Test wallet: Ready extension (+ wallet test dapp https://starknet-wallet-account.vercel.app/)
- Cairo: existing Scarb / Starknet Foundry for anonymizer (team-owned)
- Pool (mainnet): `0x040337b1af3c663e86e333bab5a4b28da8d4652a15a69beee2b677776ffe812a`
- Note: `@starknet-react/core` / `starknetkit` peer-declare starknet ^8; override forces 10.7.0 — smoke-test connect flows

## 5. Phase 1 — Wallet stack + first shielded flows ✅ done 2026-08-15

**Status:** implemented in app code; awaiting manual Ready verification

1. ✅ Upgraded monorepo to `starknet@10.7.0` + get-starknet discovery/standard 6.0.4; root override updated.
2. ✅ `WalletAccountV6` helper: `apps/web/src/lib/payments/wallet-account-v6.ts` (createStore + `supportedWalletApi`).
3. ✅ Real `shield` / `unshield` / `strk20Balances` in `strk20-payment-provider.ts`; booking `fundBooking` stays **public** until Phase 3 anonymizer.
4. ✅ Graceful degradation when wallet API &lt; 0.10 (panel + booking copy).
5. ✅ Profile UI: `Strk20PrivacyPanel`; booking page labels public escrow fund.
6. ⏳ Manual: Ready extension on mainnet (checklist below).

## 6. Phase 2 — App flows: private-by-default booking UX ✅ done 2026-08-15

**Status:** implemented

1. ✅ Booking pay: Private (default) vs Public toggle when wallet STRK20-capable; otherwise public.
2. ✅ Labels for public legs / proving wait; privacyMode stored from provider result.
3. ✅ Settle/refund remain public escrow calls (documented).
4. ✅ Docs: `docs/strk20.md`, `docs/booking-escrow-anonymizer.md`.
5. ✅ Also: block booking nights before today (API `assertNoPastNights` + guest calendar).

## 7. Phase 3 — BookingEscrow anonymizer + private fund wiring ✅ done 2026-08-15 (app); Cairo pending team

**Status:** app wiring + design shipped; **production anonymizer Cairo is team-owned** (not generated here)

- ✅ Design: `docs/booking-escrow-anonymizer.md`
- ✅ Interim private fund: shadow-account path in `private-escrow-fund.ts` (default when privacy capable)
- ✅ Target path: `fundBookingViaAnonymizer` when `NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS` is set
- ⏳ Team: write/audit/deploy anonymizer Cairo; set env; optional escrow API redesign for stronger guest privacy
- Entry for full anonymizer: audit before mainnet deploy of the helper contract

## 8. Phase 4 — Tracked / later

- Wallet-API **sub-accounts** when builder-facing (SDK has pieces; Wallet API still pending as of skill check) — would hide user↔acting-account link further.
- Xverse if/when dapp-facing Wallet API ships.
- Indexing / analytics: if any “user activity” UI is added, filter pool `Deposit` event **topic1**, never tx sender.
- Privacy Bridge only if EVM funding becomes a product need (reference, not a pin).

## 9. Testing

- Mainnet micro-amounts with Ready (product already mainnet-only).
- Wallet test dapp for connection/API sanity.
- Phase 3: snforge atomic success/revert tests on anonymizer; staging deploy before production alias.
- Pure local Katana/devnet does **not** exercise wallet proving — don’t rely on it for STRK20 UX sign-off.

## 10. Compliance & security notes

- Deposit screening is onchain; surface declines in UX.
- Selective disclosure exists for legitimate requests — not automatic compliance / endorsement; Philoxenia owns legal posture.
- Anonymizer: team owns review, audit, deploy, maintenance.
- No viewing keys, notes, or proofs in app code or env files beyond public addresses / RPC.

## 11. Open items to re-verify at build time

- [x] `starknet` pin → **10.7.0** (2026-08-15)
- [x] get-starknet → **6.0.4**
- [ ] `@starknet-react/core` + `starknetkit` runtime with starknet 10.7 (connect / SNIP-12 auth smoke)
- [ ] Pool fee amount and fee UX in shield UI
- [ ] Whether current `BookingEscrow.fund_booking` can be driven from an anonymizer without revealing guest (may need escrow redesign)
- [ ] Xverse / sub-accounts Wallet API status
- [ ] `packages/shadow_account_anonymizer` relevance for later phases

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
