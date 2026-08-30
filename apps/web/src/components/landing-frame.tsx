"use client";

import Link from "next/link";
import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { BrandLockup } from "@/components/brand-lockup";
import { ContinueWithReadyXButton } from "@/components/continue-ready-button";
import { LandingListingMarquee } from "@/components/landing-listing-marquee";
import { LandingNetworkStats } from "@/components/landing-network-stats";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

const HERO_SCALE = 2.65;

export function LandingFrame({ children }: { children: ReactNode }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [style, setStyle] = useState<CSSProperties>({
    transform: "translate(-50%, -50%) scale(2.65)",
    top: "50%",
    left: "50%",
  });

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desktopMq = window.matchMedia("(min-width: 768px)");

    function place() {
      const scrolled = window.scrollY;
      const distance = Math.max(180, window.innerHeight * 0.38);
      const t = reduce ? 1 : easeOutCubic(clamp(scrolled / distance, 0, 1));
      setProgress(t);

      if (!desktopMq.matches) return;

      const slot = slotRef.current;
      if (!slot) return;
      const slotBox = slot.getBoundingClientRect();
      const startX = window.innerWidth / 2 - (slotBox.width * HERO_SCALE) / 2;
      const startY =
        window.innerHeight * 0.28 - (slotBox.height * HERO_SCALE) / 2;
      const scale = HERO_SCALE + (1 - HERO_SCALE) * t;

      setStyle({
        top: 0,
        left: 0,
        transform: `translate(${startX + (slotBox.left - startX) * t}px, ${startY + (slotBox.top - startY) * t}px) scale(${scale})`,
        transformOrigin: "top left",
      });
    }

    place();
    let frame = 0;
    function onScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    desktopMq.addEventListener("change", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      desktopMq.removeEventListener("change", onScroll);
    };
  }, []);

  const docked = progress > 0.88;
  const statsOpacity = Math.max(0, 1 - progress * 1.35);

  return (
    <div className="landing-wash min-h-screen bg-background">
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
          docked
            ? "border-b border-border bg-surface/90 backdrop-blur-sm"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 md:px-6 md:py-6">
          <div
            ref={slotRef}
            className={`transition-opacity duration-300 md:invisible md:pointer-events-none md:opacity-100 ${
              docked
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0"
            }`}
            aria-hidden={!docked}
          >
            <BrandLockup size="large" />
          </div>
          <ContinueWithReadyXButton variant="secondary" />
        </div>
      </header>

      {/* Mobile first viewport: brand + places ribbon + live stats */}
      <div
        className="flex h-[100svh] flex-col items-center justify-center gap-7 px-0 pt-16 pb-6 md:hidden"
        style={{
          opacity: 1 - progress,
          pointerEvents: progress > 0.5 ? "none" : "auto",
        }}
      >
        <div className="px-5">
          <BrandLockup size="hero" />
        </div>
        <LandingListingMarquee />
        <div className="px-5">
          <LandingNetworkStats />
        </div>
      </div>

      {/* Desktop brand (scroll-dock animation) */}
      <div
        className="pointer-events-auto fixed z-[60] hidden will-change-transform md:block"
        style={style}
      >
        <BrandLockup size="large" />
      </div>

      {/* Desktop: places ribbon under brand, stats quieter below */}
      <div
        className="pointer-events-auto fixed inset-x-0 top-[58%] z-[55] hidden w-full -translate-y-1/2 md:block"
        style={{ opacity: Math.max(0, 1 - progress * 1.25) }}
      >
        <LandingListingMarquee opacity={1} />
      </div>
      <div className="pointer-events-none fixed inset-x-0 top-[82%] z-[55] hidden -translate-y-1/2 px-6 md:block">
        <LandingNetworkStats opacity={statsOpacity} />
      </div>

      <div className="hidden h-[100svh] md:block" aria-hidden />

      {children}
    </div>
  );
}
