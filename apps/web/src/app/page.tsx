import type { Metadata } from "next";
import Link from "next/link";
import { AuthorContact } from "@/components/author-contact";
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
          <strong className="font-medium text-foreground">
            The problem:
          </strong>{" "}
          you already stay with friends — or would, if it were not awkward. Airbnb
          puts your home on the internet for strangers and takes a cut. Chat and
          cash have no protection. Philoxenia is the missing option: hospitality
          among people you already know, with a clean private payment.
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-base text-muted sm:text-lg">
          Direct stays:{" "}
          <span className="whitespace-nowrap">
            <strong className="font-medium text-foreground">0%</strong> protocol
            fee
          </span>
          . Listings stay inside your circle — not a public search.
        </p>

        <div className="mx-auto mt-8 max-w-2xl text-left">
          <ReadyWalletNotice />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/home">
            <Button>See places to Book &amp; pay</Button>
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
            Why this exists
          </p>
          <h2 className="mt-2 text-2xl text-foreground sm:text-3xl">
            Friend stays, without Airbnb or awkward cash
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Airbnb is built for strangers. Philoxenia is built for people you
            already trust — and for a friend who can introduce you. Money is held
            in a smart contract (not our bank). Private STRK or DAI keeps the
            amount off the public chain when you want it. Direct Book &amp; pay:
            0% to us.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-12 px-6 py-16 md:grid-cols-3 md:gap-16">
        {[
          {
            title: "Host without going public",
            body: "Open nights only to friends (and guests they introduce). No directory, no random requests, no platform fee on a direct stay.",
          },
          {
            title: "Introduce and earn",
            body: "Share a friend’s place invite. When they Book & pay, you earn the connector % — Philoxenia takes 10% of that reward only.",
          },
          {
            title: "Pay without the awkwardness",
            body: "Book & pay in STRK or DAI. Private by default with Ready X. Chat is sealed. Settlement is automatic — no chasing a transfer.",
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
          Direct Book &amp; pay: 0% protocol. Connectors earn; Philoxenia takes 10% of
          the connector reward only.
        </p>
        <p className="mt-3">
          Made in Lausanne, Switzerland{" "}
          <span aria-label="Switzerland" role="img">
            🇨🇭
          </span>{" "}
          by <AuthorContact />
        </p>
        <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed">
          Bugs, questions, or anything else: tap the name. That is the only
          contact point.
        </p>
      </footer>
    </LandingFrame>
  );
}
