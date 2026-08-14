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

## Wallet

Philoxenia connects **Ready X** only via the **desktop browser extension**. Braavos is not supported.

**Smartphone is blocked:** mobile login with Ready does not complete reliably (connect may open the app, but the login signature approve sheet often never appears). Use desktop until that is fixed. Ready Mobile (the card app) is a different product and is not the supported path either.
