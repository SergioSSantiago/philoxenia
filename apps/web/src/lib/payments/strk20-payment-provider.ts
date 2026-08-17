import type { AccountInterface, STRK20_ACTION } from "starknet";
import type { PaymentAsset } from "@philoxenia/shared";
import { PublicPaymentProvider } from "./public-payment-provider";
import type {
  FundBookingParams,
  PaymentProvider,
  PaymentStatus,
  PaymentProviderCapabilities,
  PaymentCapability,
} from "./payment-provider";
import {
  detectPrivacyCapable,
  resolvePrivacyWallet,
} from "./wallet-account-v6";
import {
  bookingAnonymizerAddress,
  fundBookingViaAnonymizer,
  fundBookingViaShadowAccount,
} from "./private-escrow-fund";
import { tokenAddressForAsset } from "@/lib/tokens";

function parseAmount(amount: string): bigint {
  const [whole, frac = ""] = amount.trim().split(".");
  if (!/^\d+$/.test(whole) || (frac && !/^\d+$/.test(frac))) {
    throw new Error("Invalid amount");
  }
  const padded = frac.padEnd(18, "0").slice(0, 18);
  return BigInt(whole + padded);
}

function toHexAmount(amount: string): string {
  const value = parseAmount(amount);
  if (value <= 0n) throw new Error("Amount must be greater than zero");
  return `0x${value.toString(16)}`;
}

/** Prefer paymaster/RPC execution_error when wallets wrap it. */
function formatWalletError(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  const anyErr = err as Error & {
    baseError?: { data?: { execution_error?: string }; message?: string };
    data?: { execution_error?: string };
    error?: { data?: { execution_error?: string } };
  };
  const execution =
    anyErr.baseError?.data?.execution_error ||
    anyErr.data?.execution_error ||
    anyErr.error?.data?.execution_error;
  if (execution) return `${err.message}: ${execution}`;
  return err.message;
}

function formatBalance(raw: string | number | bigint): string {
  try {
    const n = typeof raw === "bigint" ? raw : BigInt(raw);
    const whole = n / 10n ** 18n;
    const frac = (n % 10n ** 18n).toString().padStart(18, "0").slice(0, 4);
    return `${whole}.${frac}`.replace(/\.?0+$/, "") || "0";
  } catch {
    return String(raw);
  }
}

export type FundPrivacyPreference = "private" | "public";

/**
 * STRK20 privacy provider (WalletAccountV6).
 *
 * fundBooking (when Private selected):
 * 1. Team anonymizer (`NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS`) — OPEN + invoke
 * 2. Optional shadow fallback only if `NEXT_PUBLIC_STRK20_SHADOW_FALLBACK=1`
 *    (Ready currently lacks shadow commitment)
 * 3. Never silent public fallback
 *
 * @see https://strk20-by-example.org/starknet-wallet-api/private-defi
 * @see STRK20_INTEGRATION_PLAN.md
 */
export class Strk20PaymentProvider implements PaymentProvider {
  private publicFallback: PublicPaymentProvider;
  private walletPrivacyAvailable: boolean | null = null;
  private preferPrivate: FundPrivacyPreference = "private";

  constructor(
    readonly asset: PaymentAsset,
    private account: AccountInterface,
    private tokenAddress: string
  ) {
    this.publicFallback = new PublicPaymentProvider(
      asset,
      account,
      tokenAddress
    );
  }

  setFundPreference(mode: FundPrivacyPreference) {
    this.preferPrivate = mode;
  }

  getCapabilities(): PaymentProviderCapabilities {
    const base = this.publicFallback.getCapabilities();
    if (this.walletPrivacyAvailable) {
      const privacyCaps: PaymentCapability[] = [
        "shield",
        "unshield",
        "privateTransfer",
        "getPrivateBalance",
      ];
      return {
        asset: this.asset,
        privacySupported: true,
        capabilities: [...base.capabilities, ...privacyCaps],
      };
    }
    return base;
  }

  async detectPrivacySupport(): Promise<boolean> {
    if (this.walletPrivacyAvailable !== null) {
      return this.walletPrivacyAvailable;
    }
    this.walletPrivacyAvailable = await detectPrivacyCapable(
      this.account.address
    );
    return this.walletPrivacyAvailable;
  }

  async getPublicBalance(address: string): Promise<string> {
    return this.publicFallback.getPublicBalance(address);
  }

  async getPrivateBalance(): Promise<string | null> {
    const supported = await this.detectPrivacySupport();
    if (!supported) return null;

    const session = await resolvePrivacyWallet(this.account.address);
    if (!session?.privacyCapable) return null;

    try {
      const entries = await session.account.strk20Balances([
        this.tokenAddress,
      ]);
      const entry = entries.find((e) => {
        try {
          return BigInt(e.token) === BigInt(this.tokenAddress);
        } catch {
          return false;
        }
      });
      if (!entry) return "0";
      return formatBalance(entry.balance as string | number | bigint);
    } catch {
      return null;
    }
  }

  async shield(amount: string): Promise<{ txHash: string }> {
    const session = await resolvePrivacyWallet(this.account.address);
    if (!session?.privacyCapable) {
      throw new Error(
        "Ready X with STRK20 (wallet API ≥ 0.10) is required to shield"
      );
    }

    const actions: STRK20_ACTION[] = [
      {
        type: "deposit",
        token: this.tokenAddress,
        amount: toHexAmount(amount),
      },
    ];

    const result = await session.account.strk20InvokeTransaction(actions);
    return { txHash: result.transaction_hash };
  }

  async unshield(
    amount: string,
    recipient: string
  ): Promise<{ txHash: string }> {
    const session = await resolvePrivacyWallet(this.account.address);
    if (!session?.privacyCapable) {
      throw new Error(
        "Ready X with STRK20 (wallet API ≥ 0.10) is required to unshield"
      );
    }

    const actions: STRK20_ACTION[] = [
      {
        type: "withdraw",
        token: this.tokenAddress,
        amount: toHexAmount(amount),
        recipient,
      },
    ];

    const result = await session.account.strk20InvokeTransaction(actions);
    return { txHash: result.transaction_hash };
  }

  async fundBooking(params: FundBookingParams): Promise<PaymentStatus> {
    if (this.preferPrivate === "public") {
      return this.publicFallback.fundBooking(params);
    }

    // Private is required — never silently fall back to public ERC-20.
    const capable = await this.detectPrivacySupport();
    if (!capable) {
      throw new Error(
        "Private pay needs Ready X with STRK20 (wallet API ≥ 0.10). Update Ready X, shield on Profile, then retry — or choose Public."
      );
    }

    const session = await resolvePrivacyWallet(this.account.address);
    if (!session?.privacyCapable) {
      throw new Error(
        "Could not open a STRK20 wallet session. Reconnect Ready X and try again."
      );
    }

    const anonymizer = bookingAnonymizerAddress();
    const privateErrors: string[] = [];

    if (anonymizer) {
      try {
        const { transaction_hash } = await fundBookingViaAnonymizer(
          session.account,
          params,
          anonymizer
        );
        return {
          status: "pending",
          txHash: transaction_hash,
          privacyMode: "private",
        };
      } catch (err) {
        privateErrors.push(`anonymizer: ${formatWalletError(err)}`);
      }
    }

    // Ready currently rejects wallet_strk20ShadowAccountCommitment — do not
    // call it after anonymizer failure (second confusing error). Re-enable when
    // wallets expose shadow accounts.
    if (process.env.NEXT_PUBLIC_STRK20_SHADOW_FALLBACK === "1") {
      try {
        const { transaction_hash } = await fundBookingViaShadowAccount(
          session.account,
          params
        );
        return {
          status: "pending",
          txHash: transaction_hash,
          privacyMode: "private",
        };
      } catch (err) {
        const msg = formatWalletError(err);
        if (
          /wallet_strk20ShadowAccountCommitment|Unknown request type/i.test(msg)
        ) {
          privateErrors.push(
            "shadow: Ready does not support shadow accounts yet"
          );
        } else {
          privateErrors.push(`shadow: ${msg}`);
        }
      }
    }

    throw new Error(
      `Private payment failed (no public fallback). ${privateErrors.join(" | ")}. Shield enough balance on Profile, then retry.`
    );
  }
}

export function createPaymentProvider(
  asset: PaymentAsset,
  account: AccountInterface,
  tokenAddress: string,
  privacyEnabled: boolean
): PaymentProvider & { setFundPreference?: (m: FundPrivacyPreference) => void } {
  if (privacyEnabled && (asset === "STRK" || asset === "DAI")) {
    return new Strk20PaymentProvider(asset, account, tokenAddress);
  }
  return new PublicPaymentProvider(asset, account, tokenAddress);
}

export function createStrk20Provider(
  account: AccountInterface,
  asset: PaymentAsset = "STRK"
): Strk20PaymentProvider {
  return new Strk20PaymentProvider(
    asset,
    account,
    tokenAddressForAsset(asset)
  );
}
