/** Map wallet / connector failures to short user-facing copy. */
export function formatWalletError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (
    msg.includes("USER_REFUSED_OP") ||
    /user rejected|user abort|user cancelled|rejected by user/i.test(msg)
  ) {
    return "Request cancelled in Ready. Try again when ready to approve.";
  }

  if (msg.includes("Cannot sign the message from a different chainId")) {
    return "Wrong network in Ready. Switch to Starknet mainnet and try again.";
  }

  // Only connector discovery failures — NOT every RPC "… not found".
  if (
    /connector not found|connectornotfound/i.test(msg) ||
    (/ready|argent|wallet/.test(lower) &&
      /not (installed|available|found|detected)/i.test(msg))
  ) {
    return "Ready is not available. Install or enable the Ready X extension, then reconnect.";
  }

  if (/invalid signature|signature verification/i.test(msg)) {
    return "Signature could not be verified. Confirm Ready is on Starknet mainnet, then Sign in again.";
  }

  if (/invalid or expired authentication challenge/i.test(msg)) {
    return "Login challenge expired. Tap Sign in again.";
  }

  if (/contract.?not.?found|account.?not.?found/i.test(msg)) {
    return "Starknet could not read this account (RPC). Check mainnet in Ready and try Sign in again.";
  }

  return msg || "Could not complete the wallet request.";
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
      throw new Error("Wallet returned an incomplete signature");
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

  throw new Error("Unexpected signature format from Ready");
}
