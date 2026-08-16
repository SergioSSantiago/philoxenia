import Link from "next/link";
import { LandingFrame } from "@/components/landing-frame";
import { ReadyWalletNotice } from "@/components/ready-wallet-notice";
import { Button } from "@/components/ui";

export default function LandingPage() {
  return (
    <LandingFrame>
      <section className="mx-auto max-w-5xl px-6 pb-24 pt-8 text-center sm:pt-12">
        <h1 className="text-5xl leading-tight md:text-6xl">
          Trust who you trust.
          <br />
          Pay trustless.
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted">
          Philoxenia is a private network for hospitality. Discover places
          through friends—not public listings. Book and settle payments on
          Starknet with no protocol commission.
        </p>

        <div className="mx-auto mt-8 max-w-2xl text-left">
          <ReadyWalletNotice />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link href="/home">
            <Button>Explore</Button>
          </Link>
          <Link href="/listings/new">
            <Button variant="secondary">List your place</Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-12 px-6 py-16 md:grid-cols-3 md:gap-16">
        {[
          {
            title: "Connect with people you trust",
            body: "Your friend network is the trust layer. No public marketplace, no anonymous browsing.",
          },
          {
            title: "Discover private places",
            body: "See listings from friends—or places shared with you through a trusted introduction.",
          },
          {
            title: "Book and pay privately",
            body: "Settlement happens trustlessly on Starknet. STRK20 privacy where supported.",
          },
        ].map((item) => (
          <div key={item.title}>
            <h2 className="text-xl">{item.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-muted">
        Philoxenia takes 0% protocol commission.
      </footer>
    </LandingFrame>
  );
}
