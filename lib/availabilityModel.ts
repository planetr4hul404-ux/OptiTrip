// lib/availabilityModel.ts  (Part D — Rahul Raut)
// Simple time-of-day availability heuristic (Plan §0: ONE heuristic, not a per-mode config table).

export type Mode = "walk" | "auto" | "cab" | "bus";
export const MODES: Mode[] = ["walk", "auto", "cab", "bus"];

export const WAIT_SCALE_MIN = 5;

/** Vercel/Supabase edge run in UTC — always read the clock in IST. */
export function istClock(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);
  const weekday = get("weekday");
  return {
    hour,
    minute,
    hourDecimal: hour + minute / 60,
    isWeekend: weekday === "Sat" || weekday === "Sun",
  };
}

export type TimeBand = "night" | "peak" | "offpeak" | "evening";

/** night 23:00–05:00 · peak weekdays 08–11 & 17–21 · evening 21–23 · else off-peak */
export function timeBand(date: Date = new Date()): TimeBand {
  const { hourDecimal: h, isWeekend } = istClock(date);
  if (h >= 23 || h < 5) return "night";
  if (!isWeekend && ((h >= 8 && h < 11) || (h >= 17 && h < 21))) return "peak";
  if (h >= 21) return "evening";
  return "offpeak";
}

// ---- Tunable constants (ASSUMPTIONS — calibrate in Phase 4) ----
const AUTO_WAIT = { base: 4, peak: 1.8, evening: 1.2, night: 2.5 };
const CAB_WAIT = { base: 5, peak: 2.0, evening: 1.3, night: 1.6 };
// Bus: average wait = headway / 2. null = no service.
const BUS_HEADWAY_MIN: Record<TimeBand, number | null> = {
  peak: 10,
  offpeak: 20,
  evening: 30,
  night: null,
};

export const FEASIBLE = {
  walkMax: 3,
  busMin: 1,
  busMax: 60,
  autoMax: 30,
  cabMax: 100,
};

export function isFeasible(mode: Mode, distanceKm: number, date: Date = new Date()): boolean {
  switch (mode) {
    case "walk":
      return distanceKm <= FEASIBLE.walkMax;
    case "auto":
      return distanceKm <= FEASIBLE.autoMax;
    case "cab":
      return distanceKm <= FEASIBLE.cabMax;
    case "bus":
      return (
        distanceKm >= FEASIBLE.busMin &&
        distanceKm <= FEASIBLE.busMax &&
        BUS_HEADWAY_MIN[timeBand(date)] !== null
      );
  }
}

/** Expected wait in minutes before the mode is usable. */
export function expectedWaitMin(mode: Mode, date: Date = new Date()): number {
  const band = timeBand(date);
  switch (mode) {
    case "walk":
      return 0;
    case "auto":
      return AUTO_WAIT.base * (band === "offpeak" ? 1 : AUTO_WAIT[band]);
    case "cab":
      return CAB_WAIT.base * (band === "offpeak" ? 1 : CAB_WAIT[band]);
    case "bus": {
      const headway = BUS_HEADWAY_MIN[band];
      return headway === null ? Infinity : headway / 2;
    }
  }
}

/** A in (0, 1]: 1 = no wait. */
export function availabilityValue(mode: Mode, date: Date = new Date()): number {
  const w = expectedWaitMin(mode, date);
  return Number.isFinite(w) ? 1 / (1 + w / WAIT_SCALE_MIN) : 0;
}