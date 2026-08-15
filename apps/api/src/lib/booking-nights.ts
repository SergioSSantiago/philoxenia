/** Calendar night keys are YYYY-MM-DD (UTC). */

export function utcTodayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
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
