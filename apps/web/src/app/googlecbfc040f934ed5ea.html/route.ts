import { NextResponse } from "next/server";

/** Exact Google Search Console HTML-file verification body (no trailing newline). */
const BODY = "google-site-verification: googlecbfc040f934ed5ea.html";

export function GET() {
  return new NextResponse(BODY, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Robots-Tag": "noindex",
    },
  });
}

export function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": String(Buffer.byteLength(BODY, "utf8")),
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Robots-Tag": "noindex",
    },
  });
}
