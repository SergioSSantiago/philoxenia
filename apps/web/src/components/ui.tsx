import Link from "next/link";
import type { ReactNode } from "react";

export function Shell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
        <div
          className={`mx-auto flex items-center justify-between px-6 py-4 ${wide ? "max-w-6xl" : "max-w-4xl"}`}
        >
          <Link href="/" className="text-2xl tracking-wide text-foreground">
            Philoxenia
          </Link>
          <nav className="flex items-center gap-6 text-sm text-muted">
            <Link href="/home" className="hover:text-foreground transition">
              Home
            </Link>
            <Link href="/friends" className="hover:text-foreground transition">
              Friends
            </Link>
            <Link
              href="/listings/new"
              className="hover:text-foreground transition"
            >
              List your place
            </Link>
            <Link href="/bookings" className="hover:text-foreground transition">
              Bookings
            </Link>
            <Link
              href="/connector"
              className="hover:text-foreground transition"
            >
              Earnings
            </Link>
          </nav>
        </div>
      </header>
      <main
        className={`mx-auto px-6 py-10 ${wide ? "max-w-6xl" : "max-w-4xl"}`}
      >
        {children}
      </main>
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const styles = {
    primary:
      "bg-accent text-white hover:bg-accent/90 shadow-sm",
    secondary:
      "bg-surface border border-border text-foreground hover:bg-accent-soft/50",
    ghost: "text-muted hover:text-foreground",
  };

  return (
    <button
      className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl text-foreground">{title}</h2>
      {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-muted">
      {message}
    </p>
  );
}
