import type { Metadata } from "next";
import Link from "next/link";
import { LandingFrame } from "@/components/landing-frame";
import { ReadyWalletNotice } from "@/components/ready-wallet-notice";
import { Button } from "@/components/ui";
import { landingJsonLd } from "@/lib/json-ld";
import { SITE_DESCRIPTION, SITE_TAGLINE } from "@/lib/site";

export const metadata: Metadata = {
  title: SITE_TAGLINE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default function LandingPage() {
  const jsonLd = landingJsonLd();

  return (
    <LandingFrame>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="mx-auto max-w-5xl px-6 pb-24 pt-8 text-center sm:pt-12">
        <h1 className="text-5xl leading-tight md:text-6xl">
          Trust who you trust.
          <br />
          Pay trustless.
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted">
          Philoxenia is private hospitality on Starknet — hosts, guests, and{" "}
          <strong className="font-medium text-foreground">connectors</strong>{" "}
          who earn by introducing trusted people to trusted places. No public
          marketplace.
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-base text-muted sm:text-lg">
          Direct stays:{" "}
          <span className="whitespace-nowrap">
            <strong className="font-medium text-foreground">0%</strong> protocol
            fee.
          </span>
        </p>

        <div className="mx-auto mt-8 max-w-2xl text-left">
          <ReadyWalletNotice />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/home">
            <Button>Explore</Button>
          </Link>
          <Link href="/connector">
            <Button variant="secondary">Earn as a connector</Button>
          </Link>
          <Link href="/listings/new">
            <Button variant="ghost">List your place</Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-2xl border border-accent/25 bg-accent-soft/40 px-6 py-8 text-center sm:px-10">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">
            Start here
          </p>
          <h2 className="mt-2 text-2xl text-foreground sm:text-3xl">
            Be a connector — grow the network and earn
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Share a friend&apos;s listing invite. When your guest books, you
            receive the host&apos;s connector % on settle — paid in STRK or DAI
            (same asset the guest used). No inventory required. Hosts win filled
            nights; guests arrive with a vouch; you get paid for the
            introduction.
          </p>
          <div className="mt-6">
            <Link href="/home">
              <Button>Connect Ready X &amp; open Earnings</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-12 px-6 py-16 md:grid-cols-3 md:gap-16">
        {[
          {
            title: "Host",
            body: "List privately for friends. Set a connector % so your network wants to bring guests. Direct bookings stay 0% protocol.",
          },
          {
            title: "Connector",
            body: "Introduce someone you trust to a friend’s place. Earn a host-set % in STRK or DAI when they book — Philoxenia takes 10% of that reward only.",
          },
          {
            title: "Guest",
            body: "Book through friendship or an invite. Pay STRK or DAI, Public or Private (STRK20) when Ready X supports it. Settle is trustless on Starknet.",
          },
        ].map((item) => (
          <div key={item.title}>
            <h2 className="text-xl">{item.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-muted">
        <p>
          Direct host↔guest: 0% protocol. Connectors earn; Philoxenia takes 10% of
          the connector reward only.
        </p>
        <p className="mt-3">
          Made in Lausanne, Switzerland{" "}
          <span aria-label="Switzerland" role="img">
            🇨🇭
          </span>{" "}
          by{" "}
          <a
            href="https://github.com/SergioSSantiago"
            className="text-foreground underline-offset-2 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Sergio SSantiago
          </a>
        </p>
      </footer>
    </LandingFrame>
  );
}
