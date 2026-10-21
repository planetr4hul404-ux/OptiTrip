// lib/scoring.ts  (Part D — Rahul Raut)
// Score_m = w1·(1 − norm(P)) + w2·(1 − norm(T)) + w3·norm(A)
import { Mode, MODES, isFeasible, availabilityValue, expectedWaitMin } from "./availabilityModel";
import { fareFor } from "./fareRules";

export type Weights = { cost: number; speed: number; reliability: number };
export type Priority = "cheapest" | "fastest" | "reliable" | "balanced";

export const PRESETS: Record<Priority, Weights> = {
  cheapest: { cost: 0.6, speed: 0.25, reliability: 0.15 },
  fastest: { cost: 0.2, speed: 0.6, reliability: 0.2 },
  reliable: { cost: 0.15, speed: 0.25, reliability: 0.6 },
  balanced: { cost: 0.4, speed: 0.3, reliability: 0.3 },
};

/** What Part C (routing) hands us per mode. */
export interface RouteEstimate {
  mode: Mode;
  distanceKm: number;
  durationMin: number;
}

/** Field names line up with the `recommendations` table. */
export interface Recommendation {
  mode: Mode;
  price: number;
  time: number;
  waitMin: number;
  availability_score: number;
  final_score: number;
  rank: number;
  why: string;
  breakdown: { cost: number; speed: number; reliability: number };
}

export const BUS_TIME_FACTOR = 1.7; // agree with Part C
export const BUS_ACCESS_WALK_MIN = 6;

/** Build the 4 RouteEstimates from one walking + one driving OSRM result. */
export function deriveModeEstimates(
  walk: { distanceKm: number; durationMin: number },
  drive: { distanceKm: number; durationMin: number }
): RouteEstimate[] {
  return [
    { mode: "walk", ...walk },
    { mode: "auto", ...drive },
    { mode: "cab", ...drive },
    {
      mode: "bus",
      distanceKm: drive.distanceKm,
      durationMin: drive.durationMin * BUS_TIME_FACTOR + BUS_ACCESS_WALK_MIN,
    },
  ];
}

export function normaliseWeights(w: Weights): Weights {
  const sum = w.cost + w.speed + w.reliability;
  if (!(sum > 0)) return PRESETS.balanced;
  return { cost: w.cost / sum, speed: w.speed / sum, reliability: w.reliability / sum };
}

// min-max; if all values tie, return 0.5 so the criterion favours nobody.
function minMax(values: number[]): number[] {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (hi === lo) return values.map(() => 0.5);
  return values.map((v) => (v - lo) / (hi - lo));
}

export function rankModes(
  estimates: RouteEstimate[],
  weights: Weights | Priority = "balanced",
  now: Date = new Date()
): Recommendation[] {
  const w = normaliseWeights(typeof weights === "string" ? PRESETS[weights] : weights);

  const rows = estimates
    .filter((e) => MODES.includes(e.mode) && isFeasible(e.mode, e.distanceKm, now))
    .map((e) => ({
      mode: e.mode,
      price: fareFor(e.mode, e.distanceKm, e.durationMin, now),
      time: e.durationMin,
      waitMin: expectedWaitMin(e.mode, now),
      A: availabilityValue(e.mode, now),
    }));

  if (rows.length === 0) return [];

  const nP = minMax(rows.map((r) => r.price));
  const nT = minMax(rows.map((r) => r.time));
  const nA = minMax(rows.map((r) => r.A));

  const scored = rows.map((r, i) => {
    const b = { cost: 1 - nP[i], speed: 1 - nT[i], reliability: nA[i] };
    const score = w.cost * b.cost + w.speed * b.speed + w.reliability * b.reliability;
    return { r, b, score };
  });

  scored.sort((a, b) => b.score - a.score || a.r.price - b.r.price);

  return scored.map(({ r, b, score }, idx) => ({
    mode: r.mode,
    price: r.price,
    time: Math.round(r.time),
    waitMin: Math.round(r.waitMin),
    availability_score: Number(r.A.toFixed(3)),
    final_score: Number(score.toFixed(3)),
    rank: idx + 1,
    why: explain(r.mode, b, w),
    breakdown: {
      cost: Number(b.cost.toFixed(3)),
      speed: Number(b.speed.toFixed(3)),
      reliability: Number(b.reliability.toFixed(3)),
    },
  }));
}

function explain(mode: Mode, b: Recommendation["breakdown"], w: Weights): string {
  const contrib = [
    { k: "cheapest fare", v: w.cost * b.cost },
    { k: "fastest travel time", v: w.speed * b.speed },
    { k: "shortest wait", v: w.reliability * b.reliability },
  ].sort((x, y) => y.v - x.v);
  const label = { walk: "Walking", auto: "Autorickshaw", cab: "Cab", bus: "Bus" }[mode];
  return `${label} ranks well mainly for its ${contrib[0].k}, then ${contrib[1].k}.`;
}