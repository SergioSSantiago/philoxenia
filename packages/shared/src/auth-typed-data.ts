export type Snip12ChainId = "SN_MAIN" | "SN_SEPOLIA";

export function resolveSnip12ChainId(
  chain?: string | null
): Snip12ChainId {
  if (chain === "SN_MAIN" || chain === "mainnet") return "SN_MAIN";
  return "SN_SEPOLIA";
}

/** SNIP-12 revision 1 typed data for Philoxenia wallet login (nonce only — fits in felt). */
export function buildPhiloxeniaAuthTypedData(params: {
  nonce: string;
  chainId: Snip12ChainId;
}) {
  const nonceHex = params.nonce.startsWith("0x")
    ? params.nonce
    : `0x${params.nonce}`;

  return {
    types: {
      StarknetDomain: [
        { name: "name", type: "shortstring" },
        { name: "chainId", type: "shortstring" },
        { name: "version", type: "shortstring" },
        { name: "revision", type: "shortstring" },
      ],
      Authentication: [{ name: "nonce", type: "felt" }],
    },
    primaryType: "Authentication" as const,
    domain: {
      name: "Philoxenia",
      chainId: params.chainId,
      version: "1",
      revision: "1",
    },
    message: {
      nonce: nonceHex,
    },
  };
}
