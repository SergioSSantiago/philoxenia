import { isInArgentMobileAppBrowser } from "starknetkit/argentMobile";

/** iPhone / iPad / Android — including iPadOS desktop UA. */
export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/** Ready in-app browser (injects starknet_argentX). */
export function isReadyInAppBrowser(): boolean {
  return isInArgentMobileAppBrowser();
}

export function readyMobileStoreHref(): string {
  if (typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)) {
    return "https://play.google.com/store/apps/details?id=im.argent.contractwalletclient";
  }
  return "https://apps.apple.com/us/app/ready-crypto-card/id1358741926";
}

/**
 * Deep link Ready uses for an already-open WalletConnect session request
 * (sign / tx approval). starknetkit sets mobileUrl to argent:// on mainnet.
 * @see starknetkit ArgentMobile showApprovalModal
 */
export function readySignRequestHref(): string {
  const href = encodeURIComponent(
    typeof window !== "undefined" ? window.location.href : "https://philoxenia-iota.vercel.app"
  );
  return `argent://app/wc/request?href=${href}&device=mobile`;
}

/** Alternate scheme used by newer Ready builds. */
export function readyXSignRequestHref(): string {
  const href = encodeURIComponent(
    typeof window !== "undefined" ? window.location.href : "https://philoxenia-iota.vercel.app"
  );
  return `ready://app/wc/request?href=${href}&device=mobile`;
}

/** Best-effort reopen of Ready for a pending WC sign request. */
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
