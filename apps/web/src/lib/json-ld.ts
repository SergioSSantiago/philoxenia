import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

/** JSON-LD for the public landing page (SoftwareApplication + Organization). */
export function landingJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/philoxenia-mark.png`,
        description: SITE_DESCRIPTION,
        sameAs: ["https://github.com/SergioSSantiago/philoxenia"],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en",
      },
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "TravelApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description:
            "Direct host↔guest bookings: 0% protocol fee. Connectors earn a host-set %; Philoxenia takes 10% of that connector reward only.",
        },
        featureList: [
          "Private friend-based hospitality",
          "Host listings for trusted network",
          "Guest bookings with Starknet escrow",
          "Connector introductions that earn on settle",
          "STRK20 private payments with Ready X",
          "Guests Book & pay STRK or DAI",
        ],
      },
    ],
  };
}
