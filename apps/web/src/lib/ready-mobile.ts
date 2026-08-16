import { isInArgentMobileAppBrowser } from "starknetkit/argentMobile";

/** iPhone / iPad / Android — including iPadOS desktop UA. */
export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/** Ready / Ready X in-app browser (injects starknet_argentX with isInAppBrowser). */
export function isReadyInAppBrowser(): boolean {
  return isInArgentMobileAppBrowser();
}

/**
 * App Store / Play links for **Ready X** (STRK20), not the legacy Ready Crypto Card.
 * Safari WalletConnect still deep-links `argent://` → old app; that path is unsupported.
 */
export function readyMobileStoreHref(): string {
  if (typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)) {
    // Ready X Android listing; legacy package redirects / may coexist.
    return "https://play.google.com/store/apps/details?id=im.argent.contractwalletclient";
  }
  return "https://apps.apple.com/us/app/ready-x/id6744935604";
}

/** Canonical production URL to paste into the Ready X in-app browser. */
export function philoxeniaOpenUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/home`;
  }
  return "https://philoxenia-iota.vercel.app/home";
}

/**
 * Deep link for an already-open WalletConnect session request.
 * Prefer `ready://` (Ready X); `argent://` opens the legacy Ready app.
 */
export function readySignRequestHref(): string {
  const href = encodeURIComponent(
    typeof window !== "undefined"
      ? window.location.href
      : "https://philoxenia-iota.vercel.app"
  );
  return `ready://app/wc/request?href=${href}&device=mobile`;
}

/** Legacy scheme — only as last-resort fallback. */
export function readyLegacySignRequestHref(): string {
  const href = encodeURIComponent(
    typeof window !== "undefined"
      ? window.location.href
      : "https://philoxenia-iota.vercel.app"
  );
  return `argent://app/wc/request?href=${href}&device=mobile`;
}

/** @deprecated Use readySignRequestHref (ready://). Kept for callers expecting Ready X name. */
export function readyXSignRequestHref(): string {
  return readySignRequestHref();
}

/**
 * Best-effort reopen of Ready for a pending WC sign request.
 * Only useful inside flows that already established WC — not for first login from Safari.
 */
export function openReadyForSignRequest(): void {
  if (typeof window === "undefined") return;
  if (isInArgentMobileAppBrowser()) return;
  if (!isMobileBrowser()) return;
  try {
    window.location.assign(readySignRequestHref());
  } catch {
    // Safari can block programmatic navigation; UI fallback link covers this.
  }
}
