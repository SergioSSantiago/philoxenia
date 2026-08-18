import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

const ogImage = `${SITE_URL}/philoxenia-mark.png`;

export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Philoxenia",
    "private hospitality",
    "Starknet",
    "connector",
    "peer-to-peer lodging",
    "STRK20",
    "STRK",
    "DAI",
    "Ready X",
    "Book & pay",
    "trust network",
    "earn as connector",
  ],
  authors: [{ name: "Sergio Sapiña Santiago", url: "https://github.com/SergioSSantiago" }],
  creator: "Sergio Sapiña Santiago",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: ogImage,
        width: 256,
        height: 256,
        alt: "Philoxenia — sleeping-head brand mark",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [ogImage],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/philoxenia-mark.png", type: "image/png", sizes: "256x256" },
    ],
    apple: "/philoxenia-mark.png",
  },
  category: "travel",
  verification: {
    google: "TeawpssVmF3RttfQltFkW2bjWRkyNT9Mw_ZMyMuPRK4",
  },
};
