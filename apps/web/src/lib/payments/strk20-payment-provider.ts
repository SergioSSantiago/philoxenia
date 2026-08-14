import type { AccountInterface } from "starknet";
import type { PaymentAsset } from "@philoxenia/shared";
import { PublicPaymentProvider } from "./public-payment-provider";
import type {
  FundBookingParams,
  PaymentProvider,
  PaymentStatus,
  PaymentProviderCapabilities,
  PaymentCapability,
} from "./payment-provider";

/**
 * STRK20 privacy provider.
 *
 * Uses the Starknet Wallet API (via starknet.js) when the connected wallet
 * exposes privacy methods. Falls back to public ERC20 transfer when privacy
 * is unavailable — never fakes private payments.
 *
 * @see https://docs.starknet.io/build/starknet-privacy/overview
 * @see https://github.com/starkware-libs/starknet-privacy
 */
export class Strk20PaymentProvider implements PaymentProvider {
  private publicFallback: PublicPaymentProvider;
  private walletPrivacyAvailable: boolean | null = null;

  constructor(
    readonly asset: PaymentAsset,
    private account: AccountInterface,
    tokenAddress: string
  ) {
    this.publicFallback = new PublicPaymentProvider(
      asset,
      account,
      tokenAddress
    );
  }

  getCapabilities(): PaymentProviderCapabilities {
    const base = this.publicFallback.getCapabilities();
    if (this.walletPrivacyAvailable) {
      const privacyCaps: PaymentCapability[] = [
        "shield",
        "unshield",
        "privateTransfer",
        "getPrivateBalance",
        "viewingKey",
        "disclosure",
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

    const wallet = this.account as AccountInterface & {
      walletApi?: { privacy?: { shield?: unknown } };
    };

    this.walletPrivacyAvailable = !!wallet.walletApi?.privacy?.shield;
    return this.walletPrivacyAvailable;
  }

  async getPublicBalance(address: string): Promise<string> {
    return this.publicFallback.getPublicBalance(address);
  }

  async getPrivateBalance(): Promise<string | null> {
    const supported = await this.detectPrivacySupport();
    if (!supported) return null;

    const wallet = this.account as AccountInterface & {
      walletApi?: {
        privacy?: {
          getPrivateBalance?: (token: string) => Promise<string>;
        };
      };
    };

    try {
      const balance = await wallet.walletApi?.privacy?.getPrivateBalance?.(
        this.asset
      );
      return balance ?? null;
    } catch {
      return null;
    }
  }

  async fundBooking(params: FundBookingParams): Promise<PaymentStatus> {
    const supported = await this.detectPrivacySupport();

    if (!supported) {
      return this.publicFallback.fundBooking(params);
    }

    const wallet = this.account as AccountInterface & {
      walletApi?: {
        privacy?: {
          privateTransfer?: (args: {
            token: string;
            amount: string;
            recipient: string;
          }) => Promise<{ transaction_hash: string }>;
        };
      };
    };

    try {
      const result = await wallet.walletApi?.privacy?.privateTransfer?.({
        token: params.asset,
        amount: params.amount,
        recipient: params.escrowAddress,
      });

      if (!result?.transaction_hash) {
        throw new Error("Wallet did not return a transaction hash");
      }

      return {
        status: "pending",
        txHash: result.transaction_hash,
        privacyMode: "private",
      };
    } catch {
      return this.publicFallback.fundBooking(params);
    }
  }
}

export function createPaymentProvider(
  asset: PaymentAsset,
  account: AccountInterface,
  tokenAddress: string,
  privacyEnabled: boolean
): PaymentProvider {
  if (privacyEnabled && asset === "STRK") {
    return new Strk20PaymentProvider(asset, account, tokenAddress);
  }
  return new PublicPaymentProvider(asset, account, tokenAddress);
}
