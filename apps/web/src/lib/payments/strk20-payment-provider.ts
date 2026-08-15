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
 * fundBooking preference:
 * 1. Team anonymizer (`NEXT_PUBLIC_BOOKING_ANONYMIZER_ADDRESS`) if set
 * 2. Else shadow-account path (private balance → escrow) when wallet STRK20-capable
 * 3. Else public ERC-20
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
        "Ready wallet with STRK20 (wallet API ≥ 0.10) is required to shield"
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
        "Ready wallet with STRK20 (wallet API ≥ 0.10) is required to unshield"
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
    const capable = await this.detectPrivacySupport();

    if (this.preferPrivate === "public" || !capable) {
      return this.publicFallback.fundBooking(params);
    }

    const session = await resolvePrivacyWallet(this.account.address);
    if (!session?.privacyCapable) {
      return this.publicFallback.fundBooking(params);
    }

    const anonymizer = bookingAnonymizerAddress();
    try {
      if (anonymizer) {
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
      }

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
      // Honest fallback — never invent a private success
      const message = err instanceof Error ? err.message : "";
      if (/screen|declin|insufficient|balance|private/i.test(message)) {
        throw err instanceof Error
          ? err
          : new Error("Private payment failed");
      }
      return this.publicFallback.fundBooking(params);
    }
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
