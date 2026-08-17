"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount } from "@starknet-react/core";
import type {
  Booking,
  BookingQuote,
  Listing,
  ListingAvailableDay,
  PaymentAsset,
} from "@philoxenia/shared";
import { formatDaiPrice, formatTokenAmount } from "@philoxenia/shared";
import { Shell, Button, Card } from "@/components/ui";
import {
  GuestNightCalendar,
  nightsToStayRange,
} from "@/components/guest-night-calendar";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { createPaymentProvider } from "@/lib/payments/strk20-payment-provider";
import { onChainIdFromUuid } from "@/lib/payments/escrow-actions";
import { diagnosePrivacyWallet } from "@/lib/payments/wallet-account-v6";
import { privacyLabel } from "@/lib/payments/payment-provider";
import {
  STRK20_PRIVACY_ENABLED,
  escrowAddressForAsset,
  tokenAddressForAsset,
} from "@/lib/tokens";

function dayKey(d: string): string {
  return d.slice(0, 10);
}

function nextDay(day: string): string {
  const d = new Date(`${dayKey(day)}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function nightsBetween(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  let cur = dayKey(checkIn);
  const end = dayKey(checkOut);
  while (cur < end) {
    out.push(cur);
    cur = nextDay(cur);
  }
  return out;
}

function formatShort(day: string) {
  return new Date(`${dayKey(day)}T12:00:00.000Z`).toLocaleDateString(
    undefined,
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }
  );
}

function resolveOpenNights(listing: Listing): ListingAvailableDay[] {
  const fromDays = (listing.availableDays ?? [])
    .filter((d) => !d.booked)
    .map((d) => ({ ...d, day: dayKey(d.day) }));
  if (fromDays.length > 0) {
    return fromDays.sort((a, b) => a.day.localeCompare(b.day));
  }

  const booked = new Set<string>();
  for (const b of listing.bookedRanges ?? []) {
    for (const n of nightsBetween(b.checkIn, b.checkOut)) booked.add(n);
  }
  const out: ListingAvailableDay[] = [];
  for (const w of listing.availability ?? []) {
    for (const n of nightsBetween(w.startDate, w.endDate)) {
      if (booked.has(n)) continue;
      out.push({
        id: n,
        listingId: listing.id,
        day: n,
        pricePerNight: listing.pricePerNight,
        booked: false,
      });
    }
  }
  return out.sort((a, b) => a.day.localeCompare(b.day));
}

function NewBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = searchParams.get("listing") ?? "";
  const { token, user, reconnectWallet } = useAuth();
  const { account, address } = useAccount();
  const [listing, setListing] = useState<Listing | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [paymentAsset, setPaymentAsset] = useState<PaymentAsset>("STRK");
  const [fundMode, setFundMode] = useState<"private" | "public">("private");
  const [privacyCapable, setPrivacyCapable] = useState(false);
  const [privacyHint, setPrivacyHint] = useState("");
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  // JWT can outlive the Ready connector (common on Firefox). Public and
  // Private both need a live account to sign — surface reconnect, don't
  // leave Pay grey with no reason.
  const walletReady = Boolean(account && address);

  useEffect(() => {
    if (!address || !STRK20_PRIVACY_ENABLED) {
      setPrivacyCapable(false);
      setPrivacyHint("");
      return;
    }
    let cancelled = false;
    void diagnosePrivacyWallet(address).then((result) => {
      if (cancelled) return;
      setPrivacyCapable(result.capable);
      setPrivacyHint(result.reason ?? "");
      // Keep Private as default even if detection is pending/false —
      // pay will error clearly instead of silently using public.
      if (result.capable) setFundMode("private");
    });
    return () => {
      cancelled = true;
    };
  }, [address]);

  useEffect(() => {
    if (!token) {
      router.replace("/home");
      return;
    }
    if (!listingId) {
      setLoadError("Missing listing.");
      return;
    }
    let cancelled = false;
    api
      .get<Listing>(`/listings/${listingId}`)
      .then((l) => {
        if (cancelled) return;
        setListing(l);
        const pre = searchParams.get("nights");
        if (pre) {
          const today = new Date().toISOString().slice(0, 10);
          setSelected(
            pre
              .split(",")
              .map(dayKey)
              .filter((d) => Boolean(d) && d >= today)
          );
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError("Listing unavailable.");
      });
    return () => {
      cancelled = true;
    };
  }, [token, listingId, router, searchParams]);

  const calendarDays = useMemo(() => {
    if (!listing) return [];
    const open = resolveOpenNights(listing);
    const openKeys = new Set(open.map((d) => d.day));
    // Include booked nights so calendar can mark them
    const bookedOnly = (listing.availableDays ?? [])
      .filter((d) => d.booked)
      .map((d) => ({ ...d, day: dayKey(d.day) }))
      .filter((d) => !openKeys.has(d.day));
    return [...open, ...bookedOnly];
  }, [listing]);

  const openNights = useMemo(
    () => calendarDays.filter((d) => !d.booked),
    [calendarDays]
  );

  const range = useMemo(() => nightsToStayRange(selected), [selected]);
  const selectedKey = range.nights.join(",");

  useEffect(() => {
    if (!range.ok || !listingId || range.nights.length === 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    api
      .post<BookingQuote>("/bookings/quote", {
        listingId,
        nights: range.nights,
        paymentAsset,
      })
      .then((q) => {
        if (!cancelled) {
          setQuote(q);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setQuote(null);
          setError(err instanceof Error ? err.message : "Quote failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [range.ok, selectedKey, listingId, range.nights, paymentAsset]);

  async function reconnectForPay() {
    setReconnecting(true);
    setError("");
    try {
      await reconnectWallet();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not reconnect Ready. Open the extension and try again."
      );
    } finally {
      setReconnecting(false);
    }
  }

  async function payAndBook() {
    if (!listing || !range.ok || range.nights.length === 0) return;
    if (!account || !address) {
      setError(
        "Ready X is not connected for signing. Tap Connect Ready X, then Pay again — Public and Private both need a live wallet session."
      );
      return;
    }
    if (!listing.host?.walletAddress) {
      setError("Host wallet missing");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      let escrowAddress: string;
      try {
        escrowAddress = escrowAddressForAsset(paymentAsset);
      } catch (err) {
        throw new Error(
          err instanceof Error ? err.message : "Escrow not configured"
        );
      }

      // Fresh quote at pay time (live FX if paying STRK)
      const liveQuote = await api.post<BookingQuote>("/bookings/quote", {
        listingId: listing.id,
        nights: range.nights,
        paymentAsset,
      });
      setQuote(liveQuote);

      const payAmount =
        paymentAsset === "DAI"
          ? liveQuote.totalPriceDai
          : liveQuote.totalPriceStrk;

      const bookingId = crypto.randomUUID();
      const onChainBookingId = onChainIdFromUuid(bookingId);
      const onChainListingId = onChainIdFromUuid(listing.id);
      const tokenAddress = tokenAddressForAsset(paymentAsset);
      const provider = createPaymentProvider(
        paymentAsset,
        account,
        tokenAddress,
        STRK20_PRIVACY_ENABLED
      );
      if (
        "setFundPreference" in provider &&
        typeof provider.setFundPreference === "function"
      ) {
        provider.setFundPreference(
          STRK20_PRIVACY_ENABLED ? fundMode : "public"
        );
      }

      const result = await provider.fundBooking({
        bookingId,
        escrowAddress,
        tokenAddress,
        amount: payAmount,
        asset: paymentAsset,
        guestAddress: address,
        hostAddress: listing.host.walletAddress,
        connectorAddress: liveQuote.connectorWallet,
        connectorRewardPercent: liveQuote.connectorRewardPercent,
        onChainBookingId,
        onChainListingId,
      });

      if (!result.txHash) {
        throw new Error("Payment did not return a transaction hash");
      }

      const booking = await api.post<Booking>("/bookings/confirm", {
        bookingId,
        listingId: listing.id,
        nights: range.nights,
        fundTxHash: result.txHash,
        escrowBookingId: onChainBookingId,
        privacyMode: result.privacyMode,
        paymentAsset,
        totalPrice: payAmount,
        totalPriceStrk:
          paymentAsset === "STRK" ? liveQuote.totalPriceStrk : undefined,
        fxRate: paymentAsset === "STRK" ? liveQuote.fxRate : "1",
      });

      router.push(`/bookings/${booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <Shell>
        <p className="text-muted">{loadError}</p>
      </Shell>
    );
  }

  if (!listing) {
    return (
      <Shell>
        <p className="text-muted">Loading…</p>
      </Shell>
    );
  }

  const isOwnListing = user?.id === listing.hostId;

  return (
    <Shell>
      <h1 className="mb-2 text-4xl">Book & pay</h1>
      <p className="mb-2 text-muted">{listing.title}</p>
      <p className="mb-8 text-sm text-muted leading-relaxed">
        Use the calendar: tap each night you want. One tap selects, another
        deselects. Then pay in STRK or DAI.
      </p>

      {isOwnListing ? (
        <Card className="space-y-4">
          <p className="text-sm text-muted">
            You cannot book your own listing.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/listings/${listing.id}`)}
          >
            Back to listing
          </Button>
        </Card>
      ) : openNights.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No open nights. Ask the host to add availability on the listing.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <GuestNightCalendar
              days={calendarDays}
              selected={selected}
              onChangeSelected={setSelected}
            />

            <div className="mt-4 rounded-xl border border-border bg-background px-4 py-3 text-sm">
              {selected.length === 0 ? (
                <p className="text-muted">No nights selected yet.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-foreground">
                    <span className="font-medium">
                      {range.nights.length} night
                      {range.nights.length === 1 ? "" : "s"}
                    </span>
                    {range.gap && (
                      <span className="text-muted">
                        {" "}
                        · non-consecutive OK
                      </span>
                    )}
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {range.nights.map((n) => (
                      <li
                        key={n}
                        className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
                      >
                        {formatShort(n)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>

          {quote && range.ok && (
            <Card className="space-y-3 text-sm">
              <p className="font-medium text-foreground">Price breakdown</p>
              <ul className="space-y-1">
                {quote.nightBreakdown.map((n) => (
                  <li
                    key={n.day}
                    className="flex justify-between gap-3 text-muted"
                  >
                    <span>{formatShort(n.day)}</span>
                    <span>{formatDaiPrice(n.pricePerNight)}</span>
                  </li>
                ))}
              </ul>
              <hr className="border-border" />
              <div className="flex justify-between">
                <span className="text-muted">Total (DAI)</span>
                <span className="font-medium">
                  {formatDaiPrice(quote.totalPriceDai)}
                </span>
              </div>

              <label className="block pt-1">
                <span className="text-muted">Pay with</span>
                <select
                  className="mt-1 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground"
                  value={paymentAsset}
                  onChange={(e) =>
                    setPaymentAsset(e.target.value as PaymentAsset)
                  }
                >
                  <option value="STRK">STRK (live market rate)</option>
                  <option value="DAI">DAI (1:1 list price)</option>
                </select>
              </label>

              {paymentAsset === "STRK" && (
                <div className="flex justify-between">
                  <span className="text-muted">Live rate</span>
                  <span className="text-muted">
                    1 DAI ≈ {formatTokenAmount(quote.fxRate, 4)} STRK
                    {quote.fxUsdPerStrk != null && (
                      <> · STRK ${quote.fxUsdPerStrk.toFixed(4)}</>
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted">You pay now</span>
                <span className="font-medium">
                  {paymentAsset === "DAI"
                    ? formatDaiPrice(quote.totalPriceDai)
                    : `${formatTokenAmount(quote.totalPriceStrk)} STRK`}
                </span>
              </div>
              {STRK20_PRIVACY_ENABLED && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-medium text-foreground">
                    Payment privacy
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      className={`rounded-full border px-4 py-2 text-xs ${
                        fundMode === "private"
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-border text-muted"
                      }`}
                      onClick={() => setFundMode("private")}
                    >
                      Private (default)
                    </button>
                    <button
                      type="button"
                      className={`rounded-full border px-4 py-2 text-xs ${
                        fundMode === "public"
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-border text-muted"
                      }`}
                      onClick={() => setFundMode("public")}
                    >
                      Public ERC-20
                    </button>
                  </div>
                  {!privacyCapable && fundMode === "private" && (
                    <p className="text-xs text-amber-800 leading-relaxed">
                      {privacyHint ||
                        "Ready wallet API ≥ 0.10 is required for Private. Update or reconnect Ready — we will not fall back to a public pay silently."}
                    </p>
                  )}
                  <p className="text-xs text-muted leading-relaxed">
                    {fundMode === "private"
                      ? "Pays from shielded STRK or DAI via the Philoxenia anonymizer (pool → helper → escrow). Escrow still records guest/host/amounts. Shield the pay asset on Profile first — proofs can take a while."
                      : "Standard on-chain approve + fund. Visible on explorers."}
                  </p>
                </div>
              )}

              <p className="text-xs text-muted">
                {paymentAsset === "DAI"
                  ? "DAI settles at the listed price. Host and connector are paid immediately."
                  : "STRK amount refreshes from the live DAI market rate when you pay."}
              </p>
            </Card>
          )}

          {error && <p className="text-sm text-red-700">{error}</p>}

          {!walletReady && quote && range.ok && (
            <p className="text-sm text-amber-800 leading-relaxed">
              Ready is signed in for Philoxenia but not connected for
              transactions. Reconnect the extension to pay (Public or Private).
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {selected.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelected([])}
              >
                Clear
              </Button>
            )}
            {!walletReady ? (
              <Button
                type="button"
                disabled={reconnecting || !quote || !range.ok}
                onClick={() => void reconnectForPay()}
              >
                {reconnecting ? "Connecting Ready X…" : "Connect Ready X to pay"}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={submitting || !quote || !range.ok}
                onClick={payAndBook}
              >
                {submitting
                  ? fundMode === "private"
                    ? "Proving & paying…"
                    : "Paying…"
                  : paymentAsset === "DAI"
                    ? `Pay ${quote ? formatTokenAmount(quote.totalPriceDai) : "…"} DAI${
                        fundMode === "private"
                          ? ` · ${privacyLabel("private")}`
                          : ""
                      }`
                    : `Pay ${quote ? formatTokenAmount(quote.totalPriceStrk) : "…"} STRK${
                        fundMode === "private"
                          ? ` · ${privacyLabel("private")}`
                          : ""
                      }`}
              </Button>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense>
      <NewBookingForm />
    </Suspense>
  );
}
