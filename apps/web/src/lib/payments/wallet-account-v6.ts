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

/**
 * Resolve a WalletAccountV6 from injected wallets (Ready).
 * Prefer the wallet matching `preferredAddress` from starknet-react.
 */
export async function resolvePrivacyWallet(
  preferredAddress?: string | null
): Promise<PrivacyWalletSession | null> {
  if (typeof window === "undefined") return null;

  const store = createStore();
  const wallets = store.getWallets();
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

  let walletApiVersions: string[] = [];
  try {
    walletApiVersions = (await walletV6.supportedWalletApi(selected)).map(
      String
    );
  } catch {
    walletApiVersions = [];
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
  const session = await resolvePrivacyWallet(preferredAddress);
  return Boolean(session?.privacyCapable);
}
