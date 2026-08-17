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
2. **Connect Ready X** (top right → `/home`)
3. Live network totals under the brand (`LandingNetworkStats`): users, countries (normalized from address country, e.g. Suiza→switzerland), listings open, nights booked, DAI booked, STRK booked — polled from `GET /stats/network` every **20s**

Stats fade as the brand docks into the header on scroll.

Below the fold: tagline **Direct stays: 0% protocol fee.** (`whitespace-nowrap` on `0% protocol fee` so the phrase does not wrap mid-line). Footer: fee recap, then **Made in Lausanne, Switzerland 🇨🇭** by [Sergio SSantiago](https://github.com/SergioSSantiago).

Landing CTAs: **Connect Ready X & open Earnings**, Explore, List your place. **Start here** banner: share a friend’s invite; when they **Book & pay**, you receive the host’s connector % on settle (STRK or DAI). Host role card: **Direct Book & pay stays 0% protocol**. Unsigned `/home` and invite pages use **Connect Ready X** (not a generic “Connect wallet”).

## Wallet

Philoxenia connects **Ready X** only. Braavos is not supported.

<p style="border:2px solid #b91c1c; background:#fef2f2; color:#991b1b; padding:12px 14px; border-radius:8px;">
<strong>Desktop:</strong> Chrome + Ready X with <strong>Smart Wallet</strong> and <strong>Private</strong>.<br/>
<strong>iPhone:</strong> Ready X — Safari Connect (WC) or <strong>app browser</strong> for Private.<br/>
<strong>Firefox:</strong> no Ready X → no privacy.
</p>
