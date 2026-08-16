# Happy-path checklist (prod)

Use **two Ready X wallets** (Chrome + Smart Wallet + Private, or Ready X app browser on iPhone).

## A. Social + listing

1. [ ] Wallet A signs in; set display name
2. [ ] Wallet B signs in
3. [ ] A adds B by wallet address → B accepts
4. [ ] A creates listing with open nights + optional connector %
5. [ ] B sees listing on home / friends path

## B. Private pay (preferred)

1. [ ] B shields enough STRK on Profile
2. [ ] B books nights → Pay **Private**
3. [ ] Confirm succeeds only after chain settle (fake txHash must fail)
4. [ ] Booking shows `completed`, Voyager link, privacy = Private
5. [ ] Host A receives STRK; connector (if any) paid

## C. Public pay fallback

1. [ ] Alternate booking with **Public** ERC-20
2. [ ] Confirm verifies `BookingSettled` on-chain

## D. Cancel policy

1. [ ] Open booking → read cancel policy box
2. [ ] Free nights → status `cancelled`; nights bookable again
3. [ ] Money stays settled; Messages for voluntary return

## E. Sealed chat

1. [ ] Both open Messages once (publish sealed keys)
2. [ ] Send sealed note; peer decrypts
3. [ ] API/DB body starts with `phx1.`
4. [ ] Optional: anchor on-chain checkbox (Ready Private)

## F. Hardening smoke

1. [ ] Spam `/auth/challenge` → 429
2. [ ] Reuse same `fundTxHash` on second confirm → rejected
