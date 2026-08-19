"use client";

import { useEffect, useMemo, useState } from "react";
import type { ListingAvailableDay } from "@philoxenia/shared";
import { formatTokenAmount } from "@philoxenia/shared";

function addMonths(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function toKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function nextDay(day: string): string {
  const d = new Date(`${day}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function formatShort(day: string) {
  return new Date(`${day}T12:00:00.000Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

type DayMap = Map<string, ListingAvailableDay>;

function nightsOpen(dayMap: DayMap, checkIn: string, checkOut: string): boolean {
  if (checkOut <= checkIn) return false;
  let cur = checkIn;
  while (cur < checkOut) {
    const n = dayMap.get(cur);
    if (!n || n.booked) return false;
    cur = nextDay(cur);
  }
  return true;
}

export function AvailabilityCalendar({
  days,
  mode,
  defaultPrice,
  checkIn,
  checkOut,
  onSelectRange,
  onChangeDays,
}: {
  days: ListingAvailableDay[];
  mode: "guest" | "host";
  defaultPrice: string;
  checkIn?: string;
  checkOut?: string;
  onSelectRange?: (checkIn: string, checkOut: string) => void;
  onChangeDays?: (days: { day: string; pricePerNight: string }[]) => void;
}) {
  const dayMap: DayMap = useMemo(() => {
    const m = new Map<string, ListingAvailableDay>();
    for (const d of days) m.set(d.day.slice(0, 10), d);
    return m;
  }, [days]);

  const firstOpen = useMemo(() => {
    const open = [...dayMap.entries()]
      .filter(([, d]) => !d.booked)
      .map(([k]) => k)
      .sort();
    return open[0] ?? null;
  }, [dayMap]);

  const initial = firstOpen
    ? {
        year: Number(firstOpen.slice(0, 4)),
        month: Number(firstOpen.slice(5, 7)) - 1,
      }
    : {
        year: new Date().getUTCFullYear(),
        month: new Date().getUTCMonth(),
      };

  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [editDay, setEditDay] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState(defaultPrice);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [rangePrice, setRangePrice] = useState(defaultPrice);

  useEffect(() => {
    if (!firstOpen) return;
    setYear(Number(firstOpen.slice(0, 4)));
    setMonth(Number(firstOpen.slice(5, 7)) - 1);
  }, [firstOpen]);

  const count = daysInMonth(year, month);
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: count }, (_, i) => i + 1),
  ];

  function navigate(delta: number) {
    const next = addMonths(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  }

  function emitHostDays(next: Map<string, ListingAvailableDay>) {
    if (!onChangeDays) return;
    onChangeDays(
      [...next.values()]
        .filter((d) => !d.booked)
        .map((d) => ({ day: d.day.slice(0, 10), pricePerNight: d.pricePerNight }))
        .sort((a, b) => a.day.localeCompare(b.day))
    );
  }

  function toggleHostDay(key: string) {
    if (mode !== "host" || !onChangeDays) return;
    const next = new Map(dayMap);
    const existing = next.get(key);
    if (existing?.booked) return;
    if (existing) {
      next.delete(key);
    } else {
      next.set(key, {
        id: key,
        listingId: "",
        day: key,
        pricePerNight: defaultPrice || "1",
      });
    }
    emitHostDays(next);
  }

  function saveHostPrice() {
    if (!editDay || !onChangeDays) return;
    const next = new Map(dayMap);
    const cur = next.get(editDay);
    if (!cur || cur.booked) return;
    next.set(editDay, { ...cur, pricePerNight: editPrice });
    emitHostDays(next);
    setEditDay(null);
  }

  function addHostRange() {
    if (!rangeStart || !rangeEnd || !onChangeDays) return;
    const next = new Map(dayMap);
    let cur = rangeStart;
    while (cur < rangeEnd) {
      const existing = next.get(cur);
      if (!existing?.booked) {
        next.set(cur, {
          id: cur,
          listingId: "",
          day: cur,
          pricePerNight: rangePrice || defaultPrice || "1",
        });
      }
      cur = nextDay(cur);
    }
    emitHostDays(next);
  }

  function isValidCheckIn(key: string): boolean {
    const d = dayMap.get(key);
    return Boolean(d && !d.booked);
  }

  /** Check-out is the morning you leave — not a stay night. */
  function isValidCheckOut(key: string, from: string): boolean {
    return nightsOpen(dayMap, from, key);
  }

  function guestPick(key: string) {
    if (mode !== "guest" || !onSelectRange) return;

    // Starting / restarting selection
    if (!checkIn || checkOut) {
      if (!isValidCheckIn(key)) return;
      onSelectRange(key, "");
      return;
    }

    // Have check-in, picking check-out (or new check-in)
    if (key <= checkIn) {
      if (!isValidCheckIn(key)) return;
      onSelectRange(key, "");
      return;
    }

    if (isValidCheckOut(key, checkIn)) {
      onSelectRange(checkIn, key);
      return;
    }

    // Invalid check-out — if this day is a valid check-in, restart there
    if (isValidCheckIn(key)) {
      onSelectRange(key, "");
    }
  }

  function guestCanClick(key: string): boolean {
    if (!onSelectRange) return false;
    if (!checkIn || checkOut) return isValidCheckIn(key);
    if (key <= checkIn) return isValidCheckIn(key);
    return isValidCheckOut(key, checkIn) || isValidCheckIn(key);
  }

  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric", timeZone: "UTC" }
  );

  const pickingCheckout = Boolean(checkIn && !checkOut && onSelectRange);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="min-h-[44px] rounded-full border border-border px-4 text-sm"
          onClick={() => navigate(-1)}
          aria-label="Previous month of nights"
        >
          ←
        </button>
        <p className="text-sm font-medium text-foreground">{monthLabel}</p>
        <button
          type="button"
          className="min-h-[44px] rounded-full border border-border px-4 text-sm"
          onClick={() => navigate(1)}
          aria-label="Next month of nights"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-muted">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((dayNum, idx) => {
          if (dayNum == null) {
            return <div key={`e-${idx}`} />;
          }
          const key = toKey(year, month, dayNum);
          const info = dayMap.get(key);
          const availableNight = Boolean(info) && !info?.booked;
          const booked = Boolean(info?.booked);
          const validCheckout =
            pickingCheckout && checkIn ? isValidCheckOut(key, checkIn) : false;
          const clickable =
            mode === "host" ? !booked : guestCanClick(key);
          const inStay =
            checkIn &&
            (!checkOut
              ? key === checkIn
              : key >= checkIn && key < checkOut);
          const isEdge = key === checkIn || (checkOut != null && key === checkOut);

          return (
            <button
              key={key}
              type="button"
              disabled={!clickable}
              onClick={() =>
                mode === "host" ? toggleHostDay(key) : guestPick(key)
              }
              onContextMenu={(e) => {
                if (mode !== "host" || !info || info.booked) return;
                e.preventDefault();
                setEditDay(key);
                setEditPrice(info.pricePerNight);
              }}
              className={`flex min-h-[56px] flex-col items-center justify-center rounded-xl border px-0.5 py-1 text-xs transition touch-manipulation disabled:cursor-default disabled:opacity-35 ${
                isEdge
                  ? "border-accent bg-accent text-white"
                  : inStay
                    ? "border-accent/40 bg-accent-soft text-foreground"
                    : validCheckout
                      ? "border-dashed border-accent/50 bg-accent-soft/40 text-foreground"
                      : availableNight
                        ? "border-border bg-background text-foreground hover:bg-accent-soft/50"
                        : booked
                          ? "cursor-not-allowed border-border bg-muted/25 text-muted line-through opacity-80"
                          : "border-transparent text-muted/40"
              }`}
            >
              <span className="font-medium">{dayNum}</span>
              {availableNight && info && (
                <span
                  className={`mt-0.5 text-[9px] leading-tight ${
                    isEdge ? "text-white/90" : "text-muted"
                  }`}
                >
                  {formatTokenAmount(info.pricePerNight, 2)}
                </span>
              )}
              {validCheckout && !availableNight && (
                <span className="mt-0.5 text-[9px] text-accent">out</span>
              )}
              {booked && (
                <span className="mt-0.5 text-[9px] font-medium text-muted">
                  paid
                </span>
              )}
            </button>
          );
        })}
      </div>

      {mode === "guest" && onSelectRange && (
        <p className="text-xs text-muted leading-relaxed">
          {pickingCheckout
            ? "Now tap the morning you leave. Dashed days are valid — they don’t need a nightly DAI price."
            : "Numbers under each day are the DAI list price. Tap nights to Book & pay."}
        </p>
      )}

      {mode === "guest" && !onSelectRange && (
        <p className="text-xs text-muted leading-relaxed">
          Open nights show their DAI list price. Tap Book & pay to choose nights
          (STRK or DAI).
        </p>
      )}

      {mode === "host" && (
        <div className="space-y-3 rounded-xl border border-border bg-background p-4 text-sm">
          <p className="text-muted leading-relaxed">
            Tap a day to open/close it. Tap a night in the list (or long-press /
            right-click a day) to set a custom DAI list price (Book & pay
            STRK or DAI).{" "}
            <span className="text-foreground">Book & pay nights stay locked</span> —
            you can’t remove them or change their price.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs">
              Open from
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
              />
            </label>
            <label className="block text-xs">
              Until (morning they leave)
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
              />
            </label>
            <label className="block text-xs">
              DAI list price / night
              <input
                className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2"
                value={rangePrice}
                onChange={(e) => setRangePrice(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="min-h-[44px] rounded-full border border-border px-4 text-sm"
            onClick={addHostRange}
          >
            Open nights to Book & pay
          </button>

          {editDay && (
            <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
              <label className="block text-xs">
                Price for {formatShort(editDay)}
                <input
                  className="mt-1 w-32 rounded-xl border border-border bg-surface px-3 py-2"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="min-h-[44px] rounded-full bg-accent px-4 text-sm text-white"
                onClick={saveHostPrice}
              >
                Save price
              </button>
              <button
                type="button"
                className="min-h-[44px] rounded-full border border-border px-4 text-sm"
                onClick={() => setEditDay(null)}
              >
                Close
              </button>
            </div>
          )}

          {days.filter((d) => !d.booked).length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted">
              {days
                .filter((d) => !d.booked)
                .sort((a, b) => a.day.localeCompare(b.day))
                .map((d) => (
                  <li key={d.day} className="flex justify-between gap-2">
                    <button
                      type="button"
                      className="text-left hover:text-foreground"
                      onClick={() => {
                        setEditDay(d.day.slice(0, 10));
                        setEditPrice(d.pricePerNight);
                      }}
                    >
                      {formatShort(d.day)}
                    </button>
                    <span>{formatTokenAmount(d.pricePerNight)} DAI</span>
                  </li>
                ))}
            </ul>
          )}

          {days.some((d) => d.booked) && (
            <div className="border-t border-border pt-3">
              <p className="mb-1 text-xs font-medium text-foreground">
                Book & pay nights (locked)
              </p>
              <ul className="max-h-28 space-y-1 overflow-y-auto text-xs text-muted">
                {days
                  .filter((d) => d.booked)
                  .sort((a, b) => a.day.localeCompare(b.day))
                  .map((d) => (
                    <li
                      key={`paid-${d.day}`}
                      className="flex justify-between gap-2 line-through"
                    >
                      <span>{formatShort(d.day)}</span>
                      <span>{formatTokenAmount(d.pricePerNight)} DAI</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
