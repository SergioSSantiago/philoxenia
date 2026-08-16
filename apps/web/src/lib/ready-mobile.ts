import { isInArgentMobileAppBrowser } from "starknetkit/argentMobile";

/** iPhone / iPad / Android — including iPadOS desktop UA. */
export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/** Ready / Ready X in-app browser (StarknetKit: isInReadyAppBrowser). */
export function isReadyInAppBrowser(): boolean {
  return isInArgentMobileAppBrowser();
}

/**
 * App Store / Play links for **Ready X**.
 * @see https://apps.apple.com/us/app/ready-x/id6744935604
 */
export function readyMobileStoreHref(): string {
  if (typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)) {
    return "https://play.google.com/store/apps/details?id=im.argent.contractwalletclient";
  }
  return "https://apps.apple.com/us/app/ready-x/id6744935604";
}

/** URL to open inside the Ready X in-app browser (optional / Private path). */
export function philoxeniaOpenUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/home`;
  }
  return "https://philoxenia-iota.vercel.app/home";
}

/**
 * Deep link for a pending WalletConnect sign/tx request.
 * Ready docs: `ready://` — Philoxenia patches starknetkit so mainnet uses this
 * (stock 3.4.3 maps SN_MAIN → `argent://` legacy).
 *
 * @see https://docs.ready.co/ready/ready-mobile-for-your-react-native-app
 */
export function readySignRequestHref(): string {
  const href = encodeURIComponent(
    typeof window !== "undefined"
      ? window.location.href
      : "https://philoxenia-iota.vercel.app"
  );
  return `ready://app/wc/request?href=${href}&device=mobile`;
}

/** Legacy Argent scheme — only if Ready X is not installed. */
export function readyLegacySignRequestHref(): string {
  const href = encodeURIComponent(
    typeof window !== "undefined"
      ? window.location.href
      : "https://philoxenia-iota.vercel.app"
  );
  return `argent://app/wc/request?href=${href}&device=mobile`;
}

/** @deprecated Alias of readySignRequestHref. */
export function readyXSignRequestHref(): string {
  return readySignRequestHref();
}

/** Reopen Ready X for a pending WC sign request (mobile system browser). */
export function openReadyForSignRequest(): void {
  if (typeof window === "undefined") return;
  if (isInArgentMobileAppBrowser()) return;
  if (!isMobileBrowser()) return;
  try {
    window.location.assign(readySignRequestHref());
  } catch {
    // Safari may block; UI fallback link covers this.
  }
}
