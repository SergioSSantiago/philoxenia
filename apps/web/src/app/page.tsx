import Link from "next/link";
import { Button } from "@/components/ui";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-2xl tracking-wide">Philoxenia</span>
        <Link href="/auth">
          <Button variant="secondary">Connect</Button>
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-muted">
          Private hospitality
        </p>
        <h1 className="mt-6 text-5xl leading-tight md:text-6xl">
          Trust who you trust.
          <br />
          Pay trustless.
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-lg text-muted leading-relaxed">
          Philoxenia is a private network for hospitality. Discover places
          through friends—not public listings. Book and settle payments on
          Starknet with no protocol commission.
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link href="/auth">
            <Button>Explore</Button>
          </Link>
          <Link href="/listings/new">
            <Button variant="secondary">List your place</Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-8 px-6 py-16 md:grid-cols-3">
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
          <div
            key={item.title}
            className="rounded-2xl border border-border bg-surface p-8"
          >
            <h2 className="text-xl">{item.title}</h2>
            <p className="mt-3 text-sm text-muted leading-relaxed">{item.body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-muted">
        Philoxenia takes 0% protocol commission.
      </footer>
    </div>
  );
}
