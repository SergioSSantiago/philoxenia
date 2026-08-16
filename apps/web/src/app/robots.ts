import type { MetadataRoute } from "next";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://philoxenia-iota.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/googlecbfc040f934ed5ea.html"],
        disallow: [
          "/home",
          "/profile",
          "/friends",
          "/messages",
          "/bookings",
          "/listings/",
          "/my-listings",
          "/connector",
          "/invite/",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
