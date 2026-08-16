<p align="center">
  <img src="./assets/philoxenia-mark.png" alt="Philoxenia" width="72" height="72" />
</p>

# Brand

The Philoxenia mark is a cameo: a sleeping head resting on joined hands. It stands for rest, trust, and hospitality.

## Lockup

**Philoxenia** (Cormorant Garamond) followed by the cameo. In the app and landing headers this is one control.

- File: [`apps/web/public/philoxenia-mark.png`](../apps/web/public/philoxenia-mark.png) (same asset as `docs/assets/philoxenia-mark.png`)
- Component: `apps/web/src/components/brand-lockup.tsx`
- Favicon / Apple icon: `apps/web/src/app/icon.png`

## Navigation

The brand lockup always goes to **`/`** (the landing page), never `/home`.

`/home` is the signed-in app. Unauthenticated visitors get a Ready X connect modal there.

## Landing first viewport

Before scroll, the landing shows only:

1. **Philoxenia** lockup (oversized / centered)
2. **Connect** (top right)
3. Live network totals under the brand (`LandingNetworkStats`): users, countries (normalized from address country, e.g. Suiza→switzerland), listings open, nights booked, DAI booked, STRK booked — polled from `GET /stats/network`

Stats fade as the brand docks into the header on scroll.
## Wallet

Philoxenia connects **Ready X** only. Braavos is not supported.

**Ideal:** open the app inside the **Ready X in-app browser**. That surface exposes STRK20 (wallet API ≥ 0.10) for Private pay, shield, and unshield.

**Firefox / desktop browser tabs:** usually only the **legacy Ready Wallet extension** is available — it typically **cannot** do privacy payments. Public ERC-20 may still work.

**System mobile browsers** (Safari/Chrome → deep-link Ready) are unreliable for login signatures; use Ready X’s built-in browser instead.
