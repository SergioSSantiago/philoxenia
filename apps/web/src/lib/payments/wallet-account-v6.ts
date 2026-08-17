import { createStore } from "@starknet-io/get-starknet-discovery";
import type { WalletWithStarknetFeatures } from "@starknet-io/get-starknet-wallet-standard/features";
import { WalletAccountV6, walletV6 } from "starknet";
import { createReadProvider } from "./rpc-call";

function normalizeAddr(a: string): string {
  try {
    return BigInt(a).toString(16);
  } catch {
    return a.toLowerCase().replace(/^0x0+/, "0x");
  }
}

function addressesEqual(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  try {
    return BigInt(a) === BigInt(b);
  } catch {
    return normalizeAddr(a) === normalizeAddr(b);
  }
}

/** Wallet API ≥ 0.10 ⇒ STRK20-capable (never probe balances for detection). */
export function isStrk20WalletApi(versions: string[]): boolean {
  for (const raw of versions) {
    const v = String(raw).replace(/^v/i, "");
    const [majS, minS] = v.split(".");
    const maj = Number(majS);
    const min = Number(minS);
    if (!Number.isFinite(maj)) continue;
    if (maj > 0) return true;
    if (maj === 0 && Number.isFinite(min) && min >= 10) return true;
  }
  return false;
}

export type PrivacyWalletSession = {
  wallet: WalletWithStarknetFeatures;
  account: WalletAccountV6;
  privacyCapable: boolean;
  walletApiVersions: string[];
};

export type PrivacyDetectResult = {
  capable: boolean;
  versions: string[];
  /** Human-readable reason when not capable. */
  reason: string | null;
};

function isFirefox(): boolean {
  if (typeof navigator === "undefined") return false;
  return /firefox/i.test(navigator.userAgent);
}

function injectedWindowKeys(): string[] {
  if (typeof window === "undefined") return [];
  return Object.getOwnPropertyNames(window).filter((k) =>
    k.toLowerCase().startsWith("starknet")
  );
}

/**
 * Wait briefly for Ready to inject (Firefox often registers after first paint).
 */
async function discoverWallets(
  timeoutMs = 2000
): Promise<WalletWithStarknetFeatures[]> {
  const store = createStore();
  store._refreshInjectedWallets();

  const immediate = store.getWallets();
  if (immediate.length > 0) return immediate;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (wallets: WalletWithStarknetFeatures[]) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(wallets);
    };

    const cleanup = store.subscribe((wallets) => {
      if (wallets.length > 0) finish([...wallets]);
    });

    const poll = window.setInterval(() => {
      store._refreshInjectedWallets();
      const found = store.getWallets();
      if (found.length > 0) finish(found);
    }, 200);

    window.setTimeout(() => {
      window.clearInterval(poll);
      store._refreshInjectedWallets();
      finish(store.getWallets());
    }, timeoutMs);
  });
}

function notCapableReason(versions: string[], hadWallet: boolean): string {
  const fx = isFirefox();
  const keys = injectedWindowKeys();

  if (!hadWallet) {
    if (keys.length === 0) {
      return fx
        ? "Ready X is not available on Firefox. Use Chrome + Ready X (Smart Wallet + Private). On iPhone, Safari can Connect; Private STRK needs the Ready X in-app browser."
        : "Ready X not detected. Install Ready X in Chrome, enable Smart Wallet + Private, refresh, and reconnect. On iPhone, Safari can Connect; Private STRK needs the Ready X in-app browser.";
    }
    return "A Starknet object is injected but Wallet API discovery failed. Unlock Ready X, refresh this page, and reconnect.";
  }

  if (versions.length === 0) {
    return fx
      ? "Ready connected but did not report wallet API versions. Firefox has no Ready X — use Chrome + Ready X with Smart Wallet + Private. On iPhone, Private STRK needs the Ready X in-app browser."
      : "Ready is connected for login, but Private STRK/DAI needs Ready X with Smart Wallet + Private enabled (wallet API ≥ 0.10). Unlock Ready X, turn those on, then tap Reconnect Ready X. If it still fails, refresh this page.";
  }

  return `Ready wallet API is ${versions.join(", ")} (need ≥ 0.10 for Private). Update Ready X${fx ? " — Firefox has no Ready X; switch to Chrome, or the Ready X in-app browser on iPhone" : ""}, enable Smart Wallet + Private, and reconnect.`;
}

/**
 * Resolve a WalletAccountV6 from injected wallets (Ready).
 * Prefer the wallet matching `preferredAddress` from starknet-react.
 */
export async function resolvePrivacyWallet(
  preferredAddress?: string | null
): Promise<PrivacyWalletSession | null> {
  if (typeof window === "undefined") return null;

  const wallets = await discoverWallets();
  if (wallets.length === 0) return null;

  let selected: WalletWithStarknetFeatures | undefined;

  if (preferredAddress) {
    for (const w of wallets) {
      try {
        const accounts = await walletV6.requestAccounts(w);
        if (accounts.some((a) => addressesEqual(a, preferredAddress))) {
          selected = w;
          break;
        }
      } catch {
        // try next
      }
    }
  }

  selected =
    selected ??
    wallets.find((w) => {
      const id = `${w.name ?? ""}`.toLowerCase();
      return id.includes("ready") || id.includes("argent");
    }) ??
    wallets[0];

  if (!selected) return null;

  // Wake the extension before version probe (helps Firefox / cold inject).
  try {
    await walletV6.requestAccounts(selected);
  } catch {
    // still try supportedWalletApi
  }

  let walletApiVersions: string[] = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      walletApiVersions = (await walletV6.supportedWalletApi(selected)).map(
        String
      );
      if (walletApiVersions.length > 0) break;
    } catch {
      walletApiVersions = [];
    }
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 280 * (attempt + 1)));
      try {
        await walletV6.requestAccounts(selected);
      } catch {
        // retry versions
      }
    }
  }

  const privacyCapable = isStrk20WalletApi(walletApiVersions);
  const provider = createReadProvider();
  const account = await WalletAccountV6.connect(provider, selected);

  return {
    wallet: selected,
    account,
    privacyCapable,
    walletApiVersions,
  };
}

export async function detectPrivacyCapable(
  preferredAddress?: string | null
): Promise<boolean> {
  const result = await diagnosePrivacyWallet(preferredAddress);
  return result.capable;
}

/** Detection + reason for UI (Firefox / outdated Ready / WC-only). */
export async function diagnosePrivacyWallet(
  preferredAddress?: string | null
): Promise<PrivacyDetectResult> {
  if (typeof window === "undefined") {
    return { capable: false, versions: [], reason: "Not in browser." };
  }

  try {
    const session = await resolvePrivacyWallet(preferredAddress);
    if (!session) {
      return {
        capable: false,
        versions: [],
        reason: notCapableReason([], false),
      };
    }
    if (session.privacyCapable) {
      return { capable: true, versions: session.walletApiVersions, reason: null };
    }
    return {
      capable: false,
      versions: session.walletApiVersions,
      reason: notCapableReason(session.walletApiVersions, true),
    };
  } catch {
    return {
      capable: false,
      versions: [],
      reason: notCapableReason([], injectedWindowKeys().length > 0),
    };
  }
}
