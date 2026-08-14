export function formatWalletError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes("USER_REFUSED_OP") || /user rejected/i.test(msg)) {
    return "Connection cancelled. Try Connect Ready again.";
  }

  if (msg.includes("Cannot sign the message from a different chainId")) {
    return "Wrong network in Ready. Switch to Starknet mainnet and try again.";
  }

  if (
    msg.includes("Connector not found") ||
    msg.includes("not found") ||
    msg.includes("ConnectorNotFound")
  ) {
    return "Ready is not available. Install Ready and try again.";
  }

  return msg || "Could not complete the wallet request.";
}
