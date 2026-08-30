import { AccountInterface, CallData, cairo } from "starknet";
import { executeAccountCalls } from "@/lib/payments/execute-account";

/** Derive the on-chain u256 booking id used by BookingEscrow from the API UUID. */
export function onChainIdFromUuid(uuid: string): string {
  return BigInt(`0x${uuid.replace(/-/g, "").slice(0, 16)}`).toString();
}

export async function settleEscrowBooking(
  account: AccountInterface,
  escrowAddress: string,
  onChainBookingId: string
): Promise<string> {
  const { transaction_hash } = await executeAccountCalls(account, {
    contractAddress: escrowAddress,
    entrypoint: "settle_booking",
    calldata: CallData.compile({
      booking_id: cairo.uint256(BigInt(onChainBookingId)),
    }),
  });
  return transaction_hash;
}

export async function refundEscrowBooking(
  account: AccountInterface,
  escrowAddress: string,
  onChainBookingId: string
): Promise<string> {
  const { transaction_hash } = await executeAccountCalls(account, {
    contractAddress: escrowAddress,
    entrypoint: "refund_booking",
    calldata: CallData.compile({
      booking_id: cairo.uint256(BigInt(onChainBookingId)),
    }),
  });
  return transaction_hash;
}
