import { AccountInterface, Call, CallData, cairo, uint256 } from "starknet";
import type { PaymentAsset } from "@philoxenia/shared";
import { percentToBps } from "@philoxenia/shared";
import type {
  FundBookingParams,
  PaymentProvider,
  PaymentStatus,
  PaymentProviderCapabilities,
} from "./payment-provider";
import { callContract } from "./rpc-call";

function parseAmount(amount: string): bigint {
  const [whole, frac = ""] = amount.split(".");
  const padded = frac.padEnd(18, "0").slice(0, 18);
  return BigInt(whole + padded);
}

function toUint256Calldata(value: bigint | string): string[] {
  const u = uint256.bnToUint256(typeof value === "string" ? BigInt(value) : value);
  return [u.low.toString(), u.high.toString()];
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
    const balance = await callContract({
      contractAddress: this.tokenAddress,
      entrypoint: "balanceOf",
      calldata: [address],
    });
    const value = BigInt(balance[0]) + (BigInt(balance[1]) << 128n);
    return (Number(value) / 1e18).toFixed(4);
  }

  async fundBooking(params: FundBookingParams): Promise<PaymentStatus> {
    const amount = parseAmount(params.amount);
    const bookingId = BigInt(params.onChainBookingId);
    const listingId = BigInt(params.onChainListingId);
    const rewardBps = percentToBps(params.connectorRewardPercent);
    const connector =
      params.connectorAddress && params.connectorRewardPercent > 0
        ? params.connectorAddress
        : "0x0";

    const allowance = await callContract({
      contractAddress: params.tokenAddress,
      entrypoint: "allowance",
      calldata: [params.guestAddress, params.escrowAddress],
    });

    const currentAllowance =
      BigInt(allowance[0]) + (BigInt(allowance[1]) << 128n);

    const calls: Call[] = [
      {
        contractAddress: params.escrowAddress,
        entrypoint: "create_booking",
        calldata: CallData.compile({
          booking_id: cairo.uint256(bookingId),
          listing_id: cairo.uint256(listingId),
          host: params.hostAddress,
          guest: params.guestAddress,
          connector,
          total_amount: cairo.uint256(amount),
          connector_reward_bps: rewardBps,
        }),
      },
    ];

    if (currentAllowance < amount) {
      calls.push({
        contractAddress: params.tokenAddress,
        entrypoint: "approve",
        calldata: [params.escrowAddress, ...toUint256Calldata(amount)],
      });
    }

    calls.push({
      contractAddress: params.escrowAddress,
      entrypoint: "fund_booking",
      calldata: CallData.compile({
        booking_id: cairo.uint256(bookingId),
      }),
    });

    // Pay host + connector + protocol immediately (same tx). Cancel is social/manual.
    calls.push({
      contractAddress: params.escrowAddress,
      entrypoint: "settle_booking",
      calldata: CallData.compile({
        booking_id: cairo.uint256(bookingId),
      }),
    });

    const { transaction_hash } = await this.account.execute(calls);

    return {
      status: "confirmed",
      txHash: transaction_hash,
      privacyMode: "public",
    };
  }
}
