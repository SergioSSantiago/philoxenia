import { NextResponse } from "next/server";

const MAINNET_URL = "https://starknet.paymaster.avnu.fi";
const SEPOLIA_URL = "https://sepolia.paymaster.avnu.fi";

function paymasterUpstream(): string | null {
  const apiKey = process.env.AVNU_PAYMASTER_API_KEY?.trim();
  if (!apiKey) return null;
  const useMainnet = process.env.NEXT_PUBLIC_STARKNET_CHAIN !== "sepolia";
  return useMainnet ? MAINNET_URL : SEPOLIA_URL;
}

/** Proxy SNIP-29 paymaster JSON-RPC — keeps the AVNU API key server-side. */
export async function POST(request: Request) {
  const upstream = paymasterUpstream();
  if (!upstream) {
    return NextResponse.json(
      { error: "Sponsored gas is not configured" },
      { status: 503 }
    );
  }

  const body = await request.text();
  const response = await fetch(upstream, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-paymaster-api-key": process.env.AVNU_PAYMASTER_API_KEY!.trim(),
    },
    body,
  });

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET() {
  return NextResponse.json({
    enabled: Boolean(paymasterUpstream()),
    network:
      process.env.NEXT_PUBLIC_STARKNET_CHAIN === "sepolia"
        ? "sepolia"
        : "mainnet",
  });
}
