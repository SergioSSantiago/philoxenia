/**
 * Absolute site origin for metadata, sitemap, and robots.
 * Override with NEXT_PUBLIC_SITE_URL in Vercel if the production host changes.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://philoxenia-iota.vercel.app";

export const SITE_NAME = "Philoxenia";

export const SITE_TAGLINE = "Trust who you trust. Pay trustless.";

export const SITE_DESCRIPTION =
  "Private peer-to-peer hospitality on Starknet. Hosts list for friends, guests pay STRK or DAI, and connectors earn by introducing trusted people — no public marketplace.";
