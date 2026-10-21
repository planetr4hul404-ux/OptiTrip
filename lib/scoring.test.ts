// Run: npx tsx lib/scoring.test.ts   (no framework needed)
import { rankModes, deriveModeEstimates } from "./scoring";
import { autoFare, busFare, cabFare } from "./fareRules";
import assert from "node:assert/strict";

const day = new Date("2026-10-07T06:30:00Z");   // 12:00 IST Wed, off-peak
const peak = new Date("2026-10-07T03:00:00Z");  // 08:30 IST Wed, peak
const night = new Date("2026-10-07T21:30:00Z"); // 03:00 IST Thu, no bus

// Fares
assert.equal(autoFare(1, day), 30);
assert.equal(autoFare(1.5, day), 30);
assert.equal(autoFare(5, day), 100);            // 30 + 3.5×20
assert.equal(autoFare(5, night), 125);          // +25% at 03:00 IST
assert.equal(busFare(4.9), 10);
assert.equal(busFare(12), 30);
assert.equal(busFare(35), 70);
assert.equal(cabFare(10, 30, day), 175);        // calibration point
assert.equal(cabFare(10, 30, peak), 219);       // ×1.25

// Ranking: 8 km cross-town trip
const est = deriveModeEstimates(
  { distanceKm: 7.4, durationMin: 89 },
  { distanceKm: 8.2, durationMin: 22 }
);
const cheapest = rankModes(est, "cheapest", day);
const fastest = rankModes(est, "fastest", day);
console.table(cheapest.map(({ mode, price, time, waitMin, final_score, rank }) => ({ mode, price, time, waitMin, final_score, rank })));
console.table(fastest.map(({ mode, price, time, waitMin, final_score, rank }) => ({ mode, price, time, waitMin, final_score, rank })));
assert.equal(cheapest.find((r) => r.mode === "walk"), undefined);  // 7.4 km > walk limit
assert.equal(cheapest[0].mode, "bus");
assert.ok(["auto", "cab"].includes(fastest[0].mode)); // same drive time; auto wins on shorter wait

// Night: no bus
assert.ok(!rankModes(est, "balanced", night).some((r) => r.mode === "bus"));

// Short trip: walking available and free
const short = deriveModeEstimates({ distanceKm: 0.8, durationMin: 10 }, { distanceKm: 1.0, durationMin: 4 });
assert.ok(rankModes(short, "cheapest", day).some((r) => r.mode === "walk"));

// Weights needn't sum to 1
assert.equal(rankModes(est, { cost: 6, speed: 1, reliability: 1 }, day)[0].mode, "bus");
console.log("all tests passed");