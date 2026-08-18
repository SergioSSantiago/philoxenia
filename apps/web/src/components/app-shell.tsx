"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BrandLockup } from "@/components/brand-lockup";
import { NotificationBell } from "@/components/notification-bell";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { href: "/home", label: "Home" },
  { href: "/friends", label: "Friends" },
  { href: "/messages", label: "Messages" },
  { href: "/listings/new", label: "List your place" },
  { href: "/bookings", label: "Bookings" },
  { href: "/connector", label: "Earnings" },
] as const;

function NavLink({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`block rounded-xl px-4 py-3 text-sm transition touch-manipulation ${
        active
          ? "bg-accent-soft font-medium text-accent"
          : "text-muted hover:bg-surface hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

export function Shell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  const { user, openSignIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  /** Content column only; header/nav always use the wide rail. */
  const contentWidth = wide ? "max-w-6xl" : "max-w-4xl";
  const headerWidth = "max-w-6xl";

  function handleConnect() {
    openSignIn();
    if (pathname !== "/home") {
      router.push("/home");
    }
  }

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-sm">
        <div
          className={`mx-auto flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 ${headerWidth}`}
        >
          <BrandLockup />

          {user && (
            <nav className="hidden items-center gap-1 lg:flex">
              {NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-full px-3 py-2 text-sm text-muted transition hover:text-foreground"
                >
                  {label}
                </Link>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <NotificationBell />
                <Link
                  href="/profile"
                  className="hidden max-w-[10rem] truncate rounded-full border border-border bg-background px-3 py-2 text-sm text-foreground sm:inline-block"
                >
                  {user.displayName}
                </Link>
              </>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-accent/90 touch-manipulation"
              >
                Connect Ready X
              </button>
            )}
            {user && (
              <button
                type="button"
                aria-expanded={menuOpen}
                aria-label={menuOpen ? "Close Philoxenia menu" : "Open Philoxenia menu"}
                onClick={() => setMenuOpen((open) => !open)}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border bg-surface text-foreground lg:hidden touch-manipulation"
              >
                {menuOpen ? (
                  <span className="text-lg leading-none">×</span>
                ) : (
                  <span className="flex flex-col gap-1.5 p-1">
                    <span className="block h-0.5 w-5 bg-current" />
                    <span className="block h-0.5 w-5 bg-current" />
                    <span className="block h-0.5 w-5 bg-current" />
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Close Philoxenia menu overlay"
              className="fixed inset-0 top-[57px] z-40 bg-foreground/20 lg:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <nav
              className={`relative z-50 mx-auto border-t border-border bg-surface px-4 py-3 lg:hidden ${headerWidth}`}
            >
              {user && (
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="mb-3 block rounded-xl border border-border bg-background px-4 py-3"
                >
                  <p className="font-medium text-foreground">{user.displayName}</p>
                  <p className="mt-1 font-mono text-xs text-muted break-all">
                    {user.walletAddress}
                  </p>
                </Link>
              )}
              <div className="space-y-1">
                {NAV.map(({ href, label }) => (
                  <NavLink
                    key={href}
                    href={href}
                    label={label}
                    onNavigate={() => setMenuOpen(false)}
                  />
                ))}
              </div>
            </nav>
          </>
        )}
      </header>

      <main className={`mx-auto px-4 py-8 sm:px-6 sm:py-10 ${contentWidth}`}>
        {children}
      </main>
    </div>
  );
}
