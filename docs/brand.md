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
3. Live network totals under the brand (`LandingNetworkStats`): users, countries (normalized from address country, e.g. Suiza→switzerland), **places to Book & pay**, **paid nights**, **DAI paid**, **STRK paid** — polled from `GET /stats/network` every **20s**. Labels say paid because **Book & pay** settles in the same tx.

Stats fade as the brand docks into the header on scroll.

Below the fold: tagline **Direct Book & pay: 0% protocol fee.** (`whitespace-nowrap` on `0% protocol fee` so the phrase does not wrap mid-line). Footer: **Direct Book & pay: 0% protocol**, then **Made in Lausanne, Switzerland 🇨🇭** by [Sergio SSantiago](https://github.com/SergioSSantiago).

Landing intro: **publish places, Book & pay**, and connectors who earn by **sharing a place invite** (not “introducing trusted people to trusted places”). Landing CTAs: **See places to Book & pay**, **Earn as a connector**, List your place. Header **Connect Ready X**. Guest card: **Book & pay through friendship or a place invite**. **Start here** banner heading **Earn as a connector** (not “Be a connector — grow the network and earn”); share a friend’s **place** invite; when they **Book & pay**, you receive the connector % on settle (STRK or DAI; same asset they Book & pay). CTA **Connect Ready X & open Earnings** goes to `/connector` (unsigned visitors are redirected to `/home` to connect). Host role card: **Publish places for friends**; body **friends share a place invite and earn** (not “bring guests”); **Direct Book & pay stays 0% protocol**. Connector role card: **Share a friend’s place invite** (not “Introduce someone you trust”). Unsigned `/home`: **Connect Ready X to Book & pay places from people you trust.** Invite: **Connect Ready X to Book & pay** (not a generic “Connect wallet”). Auth modal dismiss: **Close Connect Ready X** (not “Close sign in”). Modal title **Connect Ready X** (not “Welcome”). Display name field **Display name (friends add you by Ready X wallet)** (not “Display name (optional)”). Connected CTA **Approve in Ready X** (not “Sign in”). Busy before sign **Preparing Ready X signature…** (not “Preparing signature…”). Session wait **Connecting Ready X…** (not “Ready X loading…”). Copy confirm **Copied Philoxenia link for Ready X** (not “Copied!”). Helper **Ready X will ask you to Approve in Ready X** (not “sign in”). iPhone step 2: **Ready X must open a second time to Approve in Ready X** (not “sign request”). Copy fail **Could not copy Philoxenia link for Ready X**. Role heading **Earn as a connector** (not “Connector”). Role heading **Publish places** (not “Host”). Role heading **Book & pay** (not “Guest”).

## Wallet

Philoxenia connects **Ready X** only. Braavos is not supported.

<p style="border:2px solid #b91c1c; background:#fef2f2; color:#991b1b; padding:12px 14px; border-radius:8px;">
<strong>Desktop:</strong> Chrome + Ready X with <strong>Smart Wallet</strong> and <strong>Private</strong>.<br/>
<strong>iPhone:</strong> Ready X — Safari Connect (WC) or <strong>app browser</strong> for Private.<br/>
<strong>Firefox:</strong> no Ready X → no Private Book & pay.
</p>
