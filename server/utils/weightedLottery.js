const HOUR_MS = 60 * 60 * 1000;

export const LOTTERY_DECAY = Object.freeze({
  halfLifeHours: 6,
  maxAgingBoost: 3,
});

export function getEffectiveWeight(
  baseWeight,
  enteredAt,
  now = Date.now(),
  { halfLifeHours = LOTTERY_DECAY.halfLifeHours, maxAgingBoost = LOTTERY_DECAY.maxAgingBoost } = {},
) {
  const weight = Math.max(Number(baseWeight) || 0, 0);
  const enteredTime = new Date(enteredAt).getTime();
  const ageHours = Number.isFinite(enteredTime)
    ? Math.max(0, now - enteredTime) / HOUR_MS
    : 0;

  if (weight === 0 || halfLifeHours <= 0 || maxAgingBoost <= 0) return weight;

  const agingFactor = 1 - Math.pow(0.5, ageHours / halfLifeHours);
  return weight * (1 + Math.min(agingFactor * maxAgingBoost, maxAgingBoost));
}

export function selectWeightedEntry(entries, random = Math.random(), options) {
  if (!entries.length) return null;

  const weightedEntries = entries.map((entry) => ({
    entry,
    effectiveWeight: getEffectiveWeight(entry.weight, entry.entered_at, Date.now(), options),
  }));
  const totalWeight = weightedEntries.reduce(
    (total, item) => total + item.effectiveWeight,
    0,
  );

  if (totalWeight <= 0) return weightedEntries[weightedEntries.length - 1];

  let threshold = Math.min(Math.max(random, 0), 0.999999999) * totalWeight;
  for (const item of weightedEntries) {
    if (item.effectiveWeight <= 0) continue;
    threshold -= item.effectiveWeight;
    if (threshold <= 0) return item;
  }

  return weightedEntries[weightedEntries.length - 1];
}

export function getWeightedEntries(entries, now = Date.now(), options) {
  return entries.map((entry) => ({
    entry,
    effectiveWeight: getEffectiveWeight(entry.weight, entry.entered_at, now, options),
  }));
}