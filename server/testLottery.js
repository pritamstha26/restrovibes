import { getEffectiveWeight, selectWeightedEntry, getWeightedEntries, LOTTERY_DECAY } from "./utils/weightedLottery.js";
import { ScoringEngine } from "./utils/scoring.js";

const HOUR_MS = 60 * 60 * 1000;
let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

function approx(a, b, tolerance = 0.01, label) {
  assert(Math.abs(a - b) <= tolerance, `${label} (${a} ≈ ${b})`);
}

// ─────────────────────────────────────────────
console.log("\n=== WEIGHTED LOTTERY: getEffectiveWeight ===");

// No boost at time zero
{
  const now = Date.now();
  const w = getEffectiveWeight(100, now, now);
  approx(w, 100, 0.01, "No boost at t=0");
}

// After 6 hours (one half-life) → agingFactor = 0.5 → boost = 1 + 0.5*3 = 2.5x
{
  const now = Date.now();
  const entered = now - 6 * HOUR_MS;
  const w = getEffectiveWeight(100, entered, now);
  approx(w, 250, 1, "6h wait → 2.5x weight");
}

// After 12 hours (two half-lives) → agingFactor = 0.75 → boost = 1 + 0.75*3 = 3.25x
{
  const now = Date.now();
  const entered = now - 12 * HOUR_MS;
  const w = getEffectiveWeight(100, entered, now);
  approx(w, 325, 1, "12h wait → 3.25x weight");
}

// After 24 hours → agingFactor ≈ 0.9375 → boost ≈ 1 + 0.9375*3 = 3.8125x
{
  const now = Date.now();
  const entered = now - 24 * HOUR_MS;
  const w = getEffectiveWeight(100, entered, now);
  approx(w, 381.25, 2, "24h wait → ~3.81x weight");
}

// Very long wait approaches max boost (4x total)
{
  const now = Date.now();
  const entered = now - 1000 * HOUR_MS;
  const w = getEffectiveWeight(100, entered, now);
  approx(w, 400, 1, "Very long wait → approaches 4x weight (max)");
}

// Zero base weight returns 0
{
  const w = getEffectiveWeight(0, Date.now() - 10 * HOUR_MS, Date.now());
  assert(w === 0, "Zero base weight → returns 0");
}

// Negative base weight clamps to 0
{
  const w = getEffectiveWeight(-50, Date.now() - 10 * HOUR_MS, Date.now());
  assert(w === 0, "Negative base weight → returns 0");
}

// Custom decay params
{
  const now = Date.now();
  const entered = now - 2 * HOUR_MS;
  const w = getEffectiveWeight(100, entered, now, { halfLifeHours: 2, maxAgingBoost: 5 });
  // agingFactor at 2h with halfLife=2 → 0.5 → boost = 1 + min(0.5*5, 5) = 1 + 2.5 = 3.5x
  approx(w, 350, 1, "Custom halfLife=2h, maxBoost=5 → 3.5x at 2h");
}

// Disabled decay (halfLifeHours=0)
{
  const w = getEffectiveWeight(100, Date.now() - 10 * HOUR_MS, Date.now(), { halfLifeHours: 0 });
  assert(w === 100, "halfLifeHours=0 → no boost");
}

// Disabled decay (maxAgingBoost=0)
{
  const w = getEffectiveWeight(100, Date.now() - 10 * HOUR_MS, Date.now(), { maxAgingBoost: 0 });
  assert(w === 100, "maxAgingBoost=0 → no boost");
}

// Invalid enteredAt
{
  const w = getEffectiveWeight(100, "not-a-date", Date.now());
  approx(w, 100, 0.01, "Invalid enteredAt → no boost (ageHours=0)");
}

// ─────────────────────────────────────────────
console.log("\n=== WEIGHTED LOTTERY: selectWeightedEntry ===");

// Single entry always wins
{
  const entries = [{ id: 1, weight: 100, entered_at: new Date(Date.now() - HOUR_MS) }];
  const result = selectWeightedEntry(entries, 0.5);
  assert(result.entry.id === 1, "Single entry always wins");
}

// Empty entries returns null
{
  const result = selectWeightedEntry([], 0.5);
  assert(result === null, "Empty entries → null");
}

// Equal weights → each gets ~equal probability over many runs
{
  const entries = [
    { id: 1, weight: 100, entered_at: new Date(Date.now() - HOUR_MS) },
    { id: 2, weight: 100, entered_at: new Date(Date.now() - HOUR_MS) },
    { id: 3, weight: 100, entered_at: new Date(Date.now() - HOUR_MS) },
  ];
  const wins = { 1: 0, 2: 0, 3: 0 };
  for (let i = 0; i < 3000; i++) {
    const r = selectWeightedEntry(entries, Math.random());
    wins[r.entry.id]++;
  }
  // Each should get ~1000 wins (±300)
  assert(wins[1] > 700 && wins[1] < 1300, `Equal weights → id 1 wins ~33% (${wins[1]}/3000)`);
  assert(wins[2] > 700 && wins[2] < 1300, `Equal weights → id 2 wins ~33% (${wins[2]}/3000)`);
  assert(wins[3] > 700 && wins[3] < 1300, `Equal weights → id 3 wins ~33% (${wins[3]}/3000)`);
}

// Heavier weight wins more often
{
  const now = Date.now();
  const entries = [
    { id: 1, weight: 200, entered_at: new Date(now - HOUR_MS) },
    { id: 2, weight: 50, entered_at: new Date(now - HOUR_MS) },
  ];
  const wins = { 1: 0, 2: 0 };
  for (let i = 0; i < 2000; i++) {
    const r = selectWeightedEntry(entries, Math.random());
    wins[r.entry.id]++;
  }
  // Weight 200 vs 50 → ~80% vs ~20%
  assert(wins[1] > 1400, `Heavier entry wins more often (${wins[1]}/2000)`);
  assert(wins[2] < 600, `Lighter entry wins less often (${wins[2]}/2000)`);
}

// random=0 → picks first non-zero entry
{
  const entries = [
    { id: 1, weight: 100, entered_at: new Date(Date.now() - HOUR_MS) },
    { id: 2, weight: 100, entered_at: new Date(Date.now() - HOUR_MS) },
  ];
  const result = selectWeightedEntry(entries, 0);
  assert(result.entry.id === 1, "random=0 → picks first entry");
}

// random close to 1 → picks last entry
{
  const entries = [
    { id: 1, weight: 100, entered_at: new Date(Date.now() - HOUR_MS) },
    { id: 2, weight: 100, entered_at: new Date(Date.now() - HOUR_MS) },
  ];
  const result = selectWeightedEntry(entries, 0.9999);
  assert(result.entry.id === 2, "random≈1 → picks last entry");
}

// Aging affects selection: older entries with same base weight get boosted
{
  const now = Date.now();
  const entries = [
    { id: 1, weight: 100, entered_at: new Date(now) },               // just entered
    { id: 2, weight: 100, entered_at: new Date(now - 24 * HOUR_MS) }, // waiting 24h
  ];
  // With 24h age, id 2's effective weight ≈ 262.5 vs id 1's ≈ 100
  // id 2 should win ~72% of the time
  const wins = { 1: 0, 2: 0 };
  for (let i = 0; i < 2000; i++) {
    const r = selectWeightedEntry(entries, Math.random());
    wins[r.entry.id]++;
  }
  assert(wins[2] > 1200, `Older entry wins more often due to aging (${wins[2]}/2000)`);
}

// ─────────────────────────────────────────────
console.log("\n=== WEIGHTED LOTTERY: getWeightedEntries ===");

{
  const now = Date.now();
  const entries = [
    { id: 1, weight: 100, entered_at: new Date(now) },
    { id: 2, weight: 100, entered_at: new Date(now - 6 * HOUR_MS) },
  ];
  const result = getWeightedEntries(entries, now);
  assert(result.length === 2, "Returns correct count");
  approx(result[0].effectiveWeight, 100, 0.5, "Fresh entry → ~100");
  approx(result[1].effectiveWeight, 250, 1, "6h old entry → ~250");
}

// ─────────────────────────────────────────────
console.log("\n=== SCORING: calculateFlexibility ===");

// Zero flexibility
{
  const score = ScoringEngine.calculateFlexibility({});
  assert(score === 0.4, "No preferences → score=0.4 (base for ≤30min)");
}

// Low flexibility (≤30 min)
{
  const score = ScoringEngine.calculateFlexibility({ flexibilityRangeMinutes: 15 });
  assert(score === 0.4, "15min range → 0.4");
}

// Medium flexibility (31-60 min)
{
  const score = ScoringEngine.calculateFlexibility({ flexibilityRangeMinutes: 45 });
  assert(score === 0.7, "45min range → 0.7");
}

// High flexibility (>60 min)
{
  const score = ScoringEngine.calculateFlexibility({ flexibilityRangeMinutes: 90 });
  assert(score === 1.0, "90min range → 1.0");
}

// Alternative dates bonus
{
  const score = ScoringEngine.calculateFlexibility({
    flexibilityRangeMinutes: 15,
    alternativeDates: ["2025-01-01"],
  });
  approx(score, 0.5, 0.01, "1 alt date → +0.1");
}

// Max alternative dates bonus (capped at 3)
{
  const score = ScoringEngine.calculateFlexibility({
    flexibilityRangeMinutes: 15,
    alternativeDates: ["a", "b", "c", "d", "e"],
  });
  approx(score, 0.7, 0.01, "5 alt dates → capped at +0.3");
}

// Alternative party size bonus
{
  const score = ScoringEngine.calculateFlexibility({
    flexibilityRangeMinutes: 15,
    alternativePartySize: true,
  });
  approx(score, 0.5, 0.01, "Alt party size → +0.1");
}

// All bonuses combined, clamped at 1.0
{
  const score = ScoringEngine.calculateFlexibility({
    flexibilityRangeMinutes: 90,
    alternativeDates: ["a", "b", "c"],
    alternativePartySize: true,
  });
  assert(score === 1.0, "All bonuses → clamped at 1.0");
}

// Edge: exactly 30 min
{
  const score = ScoringEngine.calculateFlexibility({ flexibilityRangeMinutes: 30 });
  assert(score === 0.4, "Exactly 30min → 0.4 (≤30)");
}

// Edge: exactly 60 min
{
  const score = ScoringEngine.calculateFlexibility({ flexibilityRangeMinutes: 60 });
  assert(score === 0.7, "Exactly 60min → 0.7 (≤60)");
}

// Edge: 61 min
{
  const score = ScoringEngine.calculateFlexibility({ flexibilityRangeMinutes: 61 });
  assert(score === 1.0, "61min → 1.0 (>60)");
}

// ─────────────────────────────────────────────
console.log("\n=== SCORING: calculatePenalty (manual logic) ===");

// Test the penalty formula directly (without DB)
{
  // Pure formula tests
  const formula = (completed, noShows, lateCanc) => {
    const total = completed + noShows + lateCanc;
    if (total === 0) return 0;
    const raw = (noShows * 0.7 + lateCanc * 0.3) / total;
    const decay = completed * 0.05;
    let penalty = raw - decay;
    if (penalty < 0) penalty = 0;
    if (penalty > 1) penalty = 1;
    return penalty;
  };

  // No bad history → 0 penalty
  assert(formula(5, 0, 0) === 0, "5 completed, 0 no-shows → 0 penalty");

  // 1 no-show out of 1 booking
  approx(formula(0, 1, 0), 0.7, 0.01, "1 no-show out of 1 → 0.7 penalty");

  // 1 late cancel out of 1 booking
  approx(formula(0, 0, 1), 0.3, 0.01, "1 late cancel out of 1 → 0.3 penalty");

  // Mixed: 1 no-show + 1 late cancel out of 2
  approx(formula(0, 1, 1), 0.5, 0.01, "1 no-show + 1 late cancel / 2 → 0.5 penalty");

  // Completed bookings reduce penalty (decay)
  approx(formula(5, 1, 0), 0, 0.01, "1 no-show + 5 completed → 0 penalty (decay=0.25 > raw=0.117)");

  // Heavy decay from many completions
  approx(formula(20, 1, 0), 0, 0.01, "1 no-show + 20 completed → 0 penalty (decay fully offsets)");

  // 100% no-shows
  approx(formula(0, 10, 0), 0.7, 0.01, "10 no-shows, 0 completed → 0.7 penalty");

  // Penalty clamped at 1.0: 100 no-shows + 100 late cancels = 0.5 raw, 0 decay
  approx(formula(0, 100, 100), 0.5, 0.01, "100 no-shows + 100 late cancels → 0.5 penalty");
}

// ─────────────────────────────────────────────
console.log("\n=== SCORING: calculateTotalWeight (manual formula) ===");

{
  const calcTotal = (flexibility, loyalty, penalty) => {
    return Math.max(100 + flexibility * 50 + loyalty * 30 - penalty * 200, 1);
  };

  // Perfect user: max flex, max loyalty, no penalty
  approx(calcTotal(1.0, 1.0, 0), 180, 0.01, "Perfect user → 180 weight");

  // Zero-score user
  approx(calcTotal(0, 0, 0), 100, 0.01, "Zero scores → 100 weight (base)");

  // Fully penalized user
  approx(calcTotal(0, 0, 1.0), 1, 0.01, "Max penalty → 1 weight (floor)");

  // Partially penalized: 100 + 0.5*50 + 0.5*30 - 0.3*200 = 100+25+15-60 = 80
  approx(calcTotal(0.5, 0.5, 0.3), 80, 0.01, "Mixed scores → 80 weight");

  // Penalty exceeds base → floor at 1
  assert(calcTotal(0, 0, 0.6) === 1, "Penalty 0.6 → floor at 1");
}

// ─────────────────────────────────────────────
console.log("\n=== LOTTERY DECAY CONSTANTS ===");

assert(LOTTERY_DECAY.halfLifeHours === 6, "halfLifeHours = 6");
assert(LOTTERY_DECAY.maxAgingBoost === 3, "maxAgingBoost = 3");

// ─────────────────────────────────────────────
console.log("\n=== AGING CURVE SNAPSHOT ===");

{
  const now = Date.now();
  const snapshots = [0, 1, 2, 3, 6, 12, 24, 48];
  for (const hours of snapshots) {
    const entered = now - hours * HOUR_MS;
    const w = getEffectiveWeight(100, entered, now);
    const boost = ((w / 100 - 1) * 100).toFixed(1);
    console.log(`  ${String(hours).padStart(2)}h → weight: ${w.toFixed(1)} (+${boost}%)`);
  }
}

// ─────────────────────────────────────────────
console.log(`\n${"═".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${"═".repeat(40)}\n`);

process.exit(failed > 0 ? 1 : 0);
