# Happy-path checklist (prod)

Use **two Ready X wallets** (Chrome + Smart Wallet + Private, or Ready X on iPhone). Prefer **three** if demoing connectors (host / connector / guest).

On iPhone, Safari can **Connect** via WalletConnect (`ready://`); for **Private Book & pay** in section C, open Philoxenia in the **Ready X in-app browser**.

## Commercial demo video

| | URL |
|--|-----|
| Demo page | https://philoxenia-iota.vercel.app/demo |
| MP4 | https://philoxenia-iota.vercel.app/demo/philoxenia-commercial.mp4 |
| Hackathon field | `demo_video` in root [`strk20.json`](../strk20.json) |

Shows friend listings with real place photos plus Home, Friends, Earnings, Messages, Bookings, and Ready X privacy. Keep this URL in sync when replacing the file at `apps/web/public/demo/philoxenia-commercial.mp4`.

## A. Social + place

1. [ ] Wallet A signs in; set display name
2. [ ] Wallet B signs in
3. [ ] A adds B by Ready X wallet → B accepts
4. [ ] A lists a place with open nights + **connector % > 0** (e.g. 5%)
5. [ ] B sees the place on home / friends path
6. [ ] Tap B’s **name or Ready X wallet** on Friends → `/friends/[id]` shows A’s place

## B. Connector share & earn (key loop)

1. [ ] B opens **Earnings** (`/connector`) — sees how connectors earn + A’s place with earn %
2. [ ] B taps **Share place invite & earn** → copies/sends the place invite
3. [ ] Guest C opens invite → requests friendship with A → A accepts
4. [ ] C Book & pay through that attribution
5. [ ] On settle: A (host) + B (connector) paid; B sees reward under `/connector`
6. [ ] From Messages, tap name/wallet → same friend places path

## C. Private Book & pay (preferred)

1. [ ] Guest shields enough **STRK or DAI** on Ready X (match the pay asset)
2. [ ] Book & pay nights → **Private**
3. [ ] Confirm succeeds only after chain settle (fake txHash must fail). If Ready X throws after the tx, Book & pay shows **Recording Book & pay…** — do not Book & pay twice.
4. [ ] Stay shows **Book & pay complete**, Voyager link, privacy = Private
5. [ ] Host receives the pay asset; connector (if any) paid

## D. Public pay fallback

1. [ ] Alternate stay with **Public Book & pay**
2. [ ] Confirm verifies `BookingSettled` on-chain

## E. Cancellation terms

1. [ ] Open stay → read **Cancellation terms** box
2. [ ] Free nights → status `cancelled`; nights open for Book & pay again
3. [ ] Money stays settled; Messages **Send STRK or DAI** for voluntary return

## F. Sealed chat

1. [ ] Both open Messages once (publish sealed keys)
2. [ ] Send sealed note; peer decrypts
3. [ ] API/DB body starts with `phx1.`
4. [ ] Optional: anchor on-chain checkbox (Ready X Private)

## G. Swap (optional)

1. [ ] Profile → Swap STRK ↔ DAI (AVNU public) or Home → Shield & swap

## H. Hardening smoke

1. [ ] Spam `/auth/challenge` → 429
2. [ ] Reuse same `fundTxHash` on second confirm → rejected
