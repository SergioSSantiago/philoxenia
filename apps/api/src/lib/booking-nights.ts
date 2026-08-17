/** Calendar night keys are YYYY-MM-DD (UTC). */

export function utcTodayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function toDayKey(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function assertNoPastNights(
  nightKeys: string[],
  todayKey: string = utcTodayKey()
): void {
  for (const day of nightKeys) {
    if (day < todayKey) {
      throw new Error(`Night ${day} is in the past and cannot be booked`);
    }
  }
}

/**
 * Pick listing nights whose DAI total matches an already-settled payment.
 * Always returns at least one night so a landed pay can still become a stay.
 */
export function inferNightsForPaidAmount(input: {
  days: { day: string; pricePerNight: string }[];
  taken?: Iterable<string>;
  paidAmount: number;
  tokenPerDai: number;
  fallbackDay: string;
  fallbackPrice: string;
  maxRelError?: number;
}): string[] {
  const maxRel = input.maxRelError ?? 0.25;
  const taken = new Set(
    [...(input.taken ?? [])].map((d) => toDayKey(d))
  );
  const open = input.days
    .map((d) => ({
      day: toDayKey(d.day),
      price: Number(d.pricePerNight),
    }))
    .filter((d) => d.day && d.price > 0 && !taken.has(d.day))
    .sort((a, b) => a.day.localeCompare(b.day));

  const matches = (daiTotal: number) => {
    const token = daiTotal * input.tokenPerDai;
    if (!(token > 0) || !(input.paidAmount > 0)) return false;
    return (
      Math.abs(token - input.paidAmount) /
        Math.max(token, input.paidAmount) <=
      maxRel
    );
  };

  const ones = open.filter((d) => matches(d.price));
  if (ones.length > 0) {
    const hit =
      ones.find((d) => d.day === input.fallbackDay) ??
      ones.find((d) => d.day >= input.fallbackDay) ??
      ones[0];
    return [hit.day];
  }

  for (let i = 0; i < open.length - 1; i++) {
    if (matches(open[i].price + open[i + 1].price)) {
      return [open[i].day, open[i + 1].day];
    }
  }

  if (matches(Number(input.fallbackPrice))) {
    return [toDayKey(input.fallbackDay)];
  }
  return [toDayKey(input.fallbackDay)];
}
