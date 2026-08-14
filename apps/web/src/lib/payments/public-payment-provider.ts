import { AccountInterface, Call, uint256 } from "starknet";
import type { PaymentAsset } from "@philoxenia/shared";
import type {
  FundBookingParams,
  PaymentProvider,
  PaymentStatus,
  PaymentProviderCapabilities,
} from "./payment-provider";

const ERC20_APPROVE_SELECTOR =
  "0x219209e0832751178315610989993155855449677110219981140613629783950318930590499";
const ERC20_ALLOWANCE_SELECTOR =
  "0x182b2c8c297926a9313111562d8a473fb22658a222be4ad1a1c7a243152ea2e9";

function parseAmount(amount: string): bigint {
  const [whole, frac = ""] = amount.split(".");
  const padded = frac.padEnd(18, "0").slice(0, 18);
  return BigInt(whole + padded);
}

export class PublicPaymentProvider implements PaymentProvider {
  constructor(
    readonly asset: PaymentAsset,
    private account: AccountInterface,
    private tokenAddress: string
  ) {}

  getCapabilities(): PaymentProviderCapabilities {
    return {
      asset: this.asset,
      privacySupported: false,
      capabilities: ["publicTransfer", "getPublicBalance", "paymentStatus"],
    };
  }

  async getPublicBalance(address: string): Promise<string> {
    const balance = await this.account.callContract({
      contractAddress: this.tokenAddress,
      entrypoint: "balanceOf",
      calldata: [address],
    });
    const value = BigInt(balance[0]) + (BigInt(balance[1]) << 128n);
    return (Number(value) / 1e18).toFixed(4);
  }

  async fundBooking(params: FundBookingParams): Promise<PaymentStatus> {
    const amount = parseAmount(params.amount);
    const low = amount & ((1n << 128n) - 1n);
    const high = amount >> 128n;

    const allowance = await this.account.callContract({
      contractAddress: params.tokenAddress,
      entrypoint: "allowance",
      calldata: [params.guestAddress, params.escrowAddress],
    });

    const currentAllowance =
      BigInt(allowance[0]) + (BigInt(allowance[1]) << 128n);

    const calls: Call[] = [];

    if (currentAllowance < amount) {
      calls.push({
        contractAddress: params.tokenAddress,
        entrypoint: "approve",
        calldata: [params.escrowAddress, low.toString(), high.toString()],
      });
    }

    calls.push({
      contractAddress: params.escrowAddress,
      entrypoint: "fund_booking",
      calldata: [params.onChainBookingId],
    });

    const { transaction_hash } = await this.account.execute(calls);

    return {
      status: "pending",
      txHash: transaction_hash,
      privacyMode: "public",
    };
  }
}
