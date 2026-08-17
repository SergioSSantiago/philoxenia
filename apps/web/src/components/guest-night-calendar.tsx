"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ListingAvailableDay } from "@philoxenia/shared";
import { formatTokenAmount } from "@philoxenia/shared";

function toKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function nextDay(day: string): string {
  const d = new Date(`${day}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function addMonths(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Guest calendar: tap any open night to select/deselect it.
 * Nights need not be consecutive.
 */
export function GuestNightCalendar({
  days,
  selected,
  onChangeSelected,
}: {
  days: ListingAvailableDay[];
  selected: string[];
  onChangeSelected: (days: string[]) => void;
}) {
  const openMap = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const m = new Map<string, ListingAvailableDay>();
    for (const d of days) {
      if (d.booked) continue;
      const key = d.day.slice(0, 10);
      if (key < today) continue; // past nights are not bookable
      m.set(key, d);
    }
    return m;
  }, [days]);

  const firstOpen = useMemo(() => {
    const keys = [...openMap.keys()].sort();
    return keys[0] ?? null;
  }, [openMap]);

  const [year, setYear] = useState(() =>
    firstOpen
      ? Number(firstOpen.slice(0, 4))
      : new Date().getUTCFullYear()
  );
  const [month, setMonth] = useState(() =>
    firstOpen
      ? Number(firstOpen.slice(5, 7)) - 1
      : new Date().getUTCMonth()
  );

  useEffect(() => {
    if (!firstOpen) return;
    setYear(Number(firstOpen.slice(0, 4)));
    setMonth(Number(firstOpen.slice(5, 7)) - 1);
  }, [firstOpen]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const lastToggleAt = useRef(0);

  const count = daysInMonth(year, month);
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: count }, (_, i) => i + 1),
  ];

  function toggle(key: string) {
    if (!openMap.has(key)) return;
    // Debounce double-fire from touch + click on some phones
    const now = Date.now();
    if (now - lastToggleAt.current < 280) return;
    lastToggleAt.current = now;

    const next = new Set(selectedSet);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChangeSelected([...next].sort());
  }

  function navigate(delta: number) {
    const n = addMonths(year, month, delta);
    setYear(n.year);
    setMonth(n.month);
  }

  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric", timeZone: "UTC" }
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border text-sm"
          onClick={() => navigate(-1)}
          aria-label="Previous month"
        >
          ←
        </button>
        <p className="text-sm font-medium text-foreground">{monthLabel}</p>
        <button
          type="button"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border text-sm"
          onClick={() => navigate(1)}
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-muted">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((dayNum, idx) => {
          if (dayNum == null) {
            return <div key={`e-${idx}`} className="min-h-[56px] sm:min-h-[64px]" />;
          }
          const key = toKey(year, month, dayNum);
          const info = openMap.get(key);
          const open = Boolean(info);
          const isSelected = selectedSet.has(key);
          const dayKey = key;
          const today = new Date().toISOString().slice(0, 10);
          const isPast = dayKey < today;
          const booked = days.some(
            (d) => d.day.slice(0, 10) === key && d.booked
          );

          if (!open) {
            return (
              <div
                key={key}
                className={`flex min-h-[56px] flex-col items-center justify-center rounded-xl text-xs sm:min-h-[64px] ${
                  booked
                    ? "bg-muted/15 text-muted line-through"
                    : isPast
                      ? "text-muted/25"
                      : "text-muted/35"
                }`}
              >
                <span>{dayNum}</span>
                {booked && (
                  <span className="mt-0.5 text-[9px]">booked</span>
                )}
                {isPast && !booked && (
                  <span className="mt-0.5 text-[9px]">past</span>
                )}
              </div>
            );
          }

          return (
            <button
              key={key}
              type="button"
              onPointerDown={(e) => {
                // Primary path for phone + desktop; avoids missed taps on iOS
                if (e.pointerType === "mouse" && e.button !== 0) return;
                e.preventDefault();
                toggle(key);
              }}
              aria-pressed={isSelected}
              className={`flex min-h-[56px] flex-col items-center justify-center rounded-xl border px-0.5 py-1 text-xs transition touch-manipulation select-none [-webkit-tap-highlight-color:transparent] active:scale-[0.97] sm:min-h-[64px] ${
                isSelected
                  ? "border-accent bg-accent text-white shadow-sm"
                  : "border-border bg-background text-foreground hover:border-accent/50 hover:bg-accent-soft/50"
              }`}
            >
              <span className="text-sm font-semibold">{dayNum}</span>
              <span
                className={`mt-0.5 text-[10px] leading-tight ${
                  isSelected ? "text-white/90" : "text-muted"
                }`}
              >
                {formatTokenAmount(info!.pricePerNight, 2)}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted leading-relaxed">
        Tap nights one by one — they do not need to be consecutive. Past nights
        cannot be booked. Price under each day is DAI (list). Book & pay in STRK
        or DAI.
        {firstOpen ? ` Open nights start ${firstOpen}.` : ""}
      </p>
    </div>
  );
}

/** Bounds + selected nights for quote/pay (gaps allowed). */
export function nightsToStayRange(selected: string[]): {
  ok: boolean;
  checkIn: string;
  checkOut: string;
  nights: string[];
  gap: boolean;
} {
  const sorted = [...new Set(selected.map((d) => d.slice(0, 10)))].sort();
  if (sorted.length === 0) {
    return { ok: false, checkIn: "", checkOut: "", nights: [], gap: false };
  }
  const checkIn = sorted[0];
  const checkOut = nextDay(sorted[sorted.length - 1]);
  const windowNights: string[] = [];
  let cur = checkIn;
  while (cur < checkOut) {
    windowNights.push(cur);
    cur = nextDay(cur);
  }
  const set = new Set(sorted);
  const gap = windowNights.some((n) => !set.has(n));
  return {
    ok: true,
    checkIn,
    checkOut,
    nights: sorted,
    gap,
  };
}
