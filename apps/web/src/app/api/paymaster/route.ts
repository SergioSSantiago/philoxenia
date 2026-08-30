import { NextResponse } from "next/server";
import {
  getAvnuApiKey,
  getAvnuPaymasterUpstreamUrl,
  isAvnuPaymasterNetworkSepolia,
} from "@/lib/avnu/server";

/** Proxy SNIP-29 paymaster JSON-RPC — keeps the AVNU API key server-side. */
export async function POST(request: Request) {
  const upstream = getAvnuPaymasterUpstreamUrl();
  const apiKey = getAvnuApiKey();
  if (!upstream || !apiKey) {
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
      "x-paymaster-api-key": apiKey,
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
    enabled: Boolean(getAvnuPaymasterUpstreamUrl()),
    network: isAvnuPaymasterNetworkSepolia() ? "sepolia" : "mainnet",
  });
}
