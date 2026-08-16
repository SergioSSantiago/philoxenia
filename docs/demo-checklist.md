# Happy-path checklist (prod)

Use **two Ready X wallets** (Chrome + Smart Wallet + Private, or Ready X on iPhone). Prefer **three** if demoing connectors (host / connector / guest).

On iPhone, Safari can **Connect** via WalletConnect (`ready://`); for Private STRK in section C, open Philoxenia in the **Ready X in-app browser**.

## A. Social + listing

1. [ ] Wallet A signs in; set display name
2. [ ] Wallet B signs in
3. [ ] A adds B by wallet address → B accepts
4. [ ] A creates listing with open nights + **connector % > 0** (e.g. 5%)
5. [ ] B sees listing on home / friends path
6. [ ] Tap B’s **name or wallet** on Friends → `/friends/[id]` shows A’s listing

## B. Connector share & earn (key loop)

1. [ ] B opens **Earnings** (`/connector`) — sees how connectors earn + A’s listing with earn %
2. [ ] B taps **Share invite & earn** → copies/sends invite link
3. [ ] Guest C opens invite → requests friendship with A → A accepts
4. [ ] C books + pays through that attribution
5. [ ] On settle: A (host) + B (connector) paid; B sees reward under `/connector`
6. [ ] From Messages, tap name/wallet → same friend listings path

## C. Private pay (preferred)

1. [ ] Guest shields enough STRK on Profile
2. [ ] Books nights → Pay **Private**
3. [ ] Confirm succeeds only after chain settle (fake txHash must fail)
4. [ ] Booking shows `completed`, Voyager link, privacy = Private
5. [ ] Host receives STRK; connector (if any) paid

## D. Public pay fallback

1. [ ] Alternate booking with **Public** ERC-20
2. [ ] Confirm verifies `BookingSettled` on-chain

## E. Cancel policy

1. [ ] Open booking → read cancel policy box
2. [ ] Free nights → status `cancelled`; nights bookable again
3. [ ] Money stays settled; Messages for voluntary return

## F. Sealed chat

1. [ ] Both open Messages once (publish sealed keys)
2. [ ] Send sealed note; peer decrypts
3. [ ] API/DB body starts with `phx1.`
4. [ ] Optional: anchor on-chain checkbox (Ready Private)

## G. Swap (optional)

1. [ ] Profile → Swap STRK ↔ DAI (AVNU public) or Home → Swap shortcut

## H. Hardening smoke

1. [ ] Spam `/auth/challenge` → 429
2. [ ] Reuse same `fundTxHash` on second confirm → rejected
