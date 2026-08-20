"use client";

/**
 * Auto-scrolling film of friend places — clarifies hospitality at a glance.
 * Not a card grid: continuous image ribbon under the brand.
 */

export type LandingPlaceAd = {
  title: string;
  place: string;
  price: string;
  host: string;
  image: string;
};

/** Curated Unsplash interiors / destinations for the landing marquee. */
export const LANDING_PLACE_ADS: LandingPlaceAd[] = [
  {
    title: "SoHo loft",
    place: "New York",
    price: "220 DAI",
    host: "Maya",
    image:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Hillside terrace",
    place: "Saint-Tropez",
    price: "310 DAI",
    host: "Léa",
    image:
      "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "White finca",
    place: "Ibiza",
    price: "195 DAI",
    host: "Marc",
    image:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "West Lake pavilion",
    place: "Hangzhou",
    price: "140 DAI",
    host: "Wei",
    image:
      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Jungle villa",
    place: "Bali",
    price: "165 DAI",
    host: "Putri",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Canal apartment",
    place: "Amsterdam",
    price: "175 DAI",
    host: "Noah",
    image:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Riad courtyard",
    place: "Marrakech",
    price: "130 DAI",
    host: "Amira",
    image:
      "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Harbour loft",
    place: "Sydney",
    price: "210 DAI",
    host: "Jess",
    image:
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=900&q=80",
  },
];

function PlaceTile({ ad }: { ad: LandingPlaceAd }) {
  return (
    <article className="landing-marquee-tile relative w-[220px] shrink-0 overflow-hidden sm:w-[260px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ad.image}
        alt=""
        width={520}
        height={360}
        loading="eager"
        decoding="async"
        className="h-[140px] w-full object-cover sm:h-[160px]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3 text-left text-white">
        <p className="font-sans text-base leading-tight tracking-wide sm:text-lg">
          {ad.title}
        </p>
        <p className="mt-0.5 text-[11px] text-white/85 sm:text-xs">
          {ad.place} · {ad.host}
        </p>
        <p className="mt-1 text-[11px] font-medium tabular-nums text-white/95 sm:text-xs">
          {ad.price}
          <span className="font-normal text-white/70"> / night</span>
        </p>
      </div>
    </article>
  );
}

/**
 * Horizontal auto-scroll of sample places in the landing first viewport.
 */
export function LandingListingMarquee({
  opacity = 1,
  className = "",
}: {
  opacity?: number;
  className?: string;
}) {
  if (opacity <= 0.05) return null;

  const loop = [...LANDING_PLACE_ADS, ...LANDING_PLACE_ADS];

  return (
    <div
      className={`w-full ${className}`}
      style={{ opacity }}
      aria-label="Places friends publish — examples from New York to Bali"
    >
      <p className="mb-3 text-center text-[10px] uppercase tracking-[0.16em] text-muted/90 sm:mb-4">
        Friend places · not a public marketplace
      </p>
      <div className="landing-marquee relative overflow-hidden">
        <div className="landing-marquee-track flex w-max gap-3 pr-3 sm:gap-4 sm:pr-4">
          {loop.map((ad, i) => (
            <PlaceTile key={`${ad.place}-${i}`} ad={ad} />
          ))}
        </div>
      </div>
    </div>
  );
}
