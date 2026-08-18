/** Map wallet / connector failures to short user-facing copy. */
export function isWalletCancelled(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("USER_REFUSED_OP") ||
    /user rejected|user abort|user cancelled|rejected by user|cancelled in Ready/i.test(
      msg
    )
  );
}

export function formatWalletError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (isWalletCancelled(err)) {
    return "Request cancelled in Ready X. Try again when ready to approve.";
  }

  if (msg.includes("Cannot sign the message from a different chainId")) {
    return "Wrong network in Ready X. Switch to Starknet mainnet and try again.";
  }

  // Only connector discovery failures — NOT every RPC "… not found".
  if (
    /connector not found|connectornotfound/i.test(msg) ||
    (/ready|argent|wallet/.test(lower) &&
      /not (installed|available|found|detected)/i.test(msg))
  ) {
    return "Ready X is not available. Install Ready X in Chrome, or open Philoxenia in the Ready X app on iPhone, then reconnect.";
  }

  if (/invalid signature|signature verification/i.test(msg)) {
    return "Signature could not be verified. Confirm Ready X is on Starknet mainnet, then Sign in again.";
  }

  if (/invalid or expired authentication challenge/i.test(msg)) {
    return "Login challenge expired. Tap Sign in again.";
  }

  if (/contract.?not.?found|account.?not.?found/i.test(msg)) {
    return "Starknet could not read this account (RPC). Check mainnet in Ready X and try Sign in again.";
  }

  return msg || "Could not complete the Ready X request.";
}

/** Normalize Ready / starknet.js signMessage results into felt strings for the API. */
export function normalizeWalletSignature(signature: unknown): string[] {
  const toFelt = (v: unknown): string => {
    if (typeof v === "bigint") return `0x${v.toString(16)}`;
    if (typeof v === "number") return `0x${BigInt(v).toString(16)}`;
    const s = String(v);
    if (/^\d+$/.test(s)) return `0x${BigInt(s).toString(16)}`;
    return s.startsWith("0x") || s.startsWith("0X") ? s : `0x${s}`;
  };

  if (Array.isArray(signature)) {
    if (signature.length < 2) {
      throw new Error("Ready X returned an incomplete signature");
    }
    return signature.map(toFelt);
  }

  if (
    signature &&
    typeof signature === "object" &&
    "r" in signature &&
    "s" in signature
  ) {
    const { r, s } = signature as { r: unknown; s: unknown };
    return [toFelt(r), toFelt(s)];
  }

  throw new Error("Unexpected signature format from Ready X");
}
