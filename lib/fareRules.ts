// lib/fareRules.ts  (Part D — Rahul Raut)
import { Mode, timeBand, istClock } from "./availabilityModel";

// Autorickshaw — Pune RTA tariff effective 1 Sep 2026
// ₹30 for first 1.5 km, ₹20/km after. +25% night surcharge 00:00–05:00 (PMC/PCMC limits).
export const AUTO = {
  minFare: 30,
  minKm: 1.5,
  perKm: 20,
  nightSurcharge: 0.25,
};

export function autoFare(distanceKm: number, date: Date = new Date()): number {
  const extra = Math.max(0, distanceKm - AUTO.minKm);
  let fare = AUTO.minFare + extra * AUTO.perKm;
  const { hour } = istClock(date);
  if (hour >= 0 && hour < 5) fare *= 1 + AUTO.nightSurcharge;
  return Math.round(fare);
}

// PMPML bus — 11-stage fare chart (since 1 Jun 2025).
// ⚠ Stages up to 60 km from published reports; 60–80 km are EXTRAPOLATED. Verify before demo.
const BUS_STAGES: { uptoKm: number; fare: number }[] = [
  { uptoKm: 5, fare: 10 },
  { uptoKm: 10, fare: 20 },
  { uptoKm: 15, fare: 30 },
  { uptoKm: 20, fare: 40 },
  { uptoKm: 25, fare: 50 },
  { uptoKm: 30, fare: 60 },
  { uptoKm: 40, fare: 70 },
  { uptoKm: 50, fare: 80 },
  { uptoKm: 60, fare: 90 },
  { uptoKm: 70, fare: 100 }, // extrapolated
  { uptoKm: 80, fare: 110 }, // extrapolated
];

export function busFare(distanceKm: number): number {
  const stage = BUS_STAGES.find((s) => distanceKm <= s.uptoKm);
  return (stage ?? BUS_STAGES[BUS_STAGES.length - 1]).fare;
}

// Cab aggregator — base + per-km + per-min. CALIBRATED ASSUMPTIONS (apps don't publish tariffs):
// ~₹175 for 10 km / 30 min. Surge capped at 1.5x (Maharashtra aggregator rules).
export const CAB = {
  base: 40,
  perKm: 10.5,
  perMin: 1,
  minFare: 80,
  surgeCap: 1.5,
  peakSurge: 1.25,
  nightSurge: 1.1,
};

export function cabFare(distanceKm: number, durationMin: number, date: Date = new Date()): number {
  const band = timeBand(date);
  const surge = Math.min(
    CAB.surgeCap,
    band === "peak" ? CAB.peakSurge : band === "night" ? CAB.nightSurge : 1
  );
  const raw = CAB.base + CAB.perKm * distanceKm + CAB.perMin * durationMin;
  return Math.round(Math.max(CAB.minFare, raw) * surge);
}

export function fareFor(
  mode: Mode,
  distanceKm: number,
  durationMin: number,
  date: Date = new Date()
): number {
  switch (mode) {
    case "walk":
      return 0;
    case "auto":
      return autoFare(distanceKm, date);
    case "bus":
      return busFare(distanceKm);
    case "cab":
      return cabFare(distanceKm, durationMin, date);
  }
}