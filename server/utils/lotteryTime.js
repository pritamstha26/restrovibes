// Shared lottery timing rules (single source of truth for entry cutoff + draw moment).
//
// Rule (uniform for every slot and every venue, no dependency on opening hours):
//  - A slot resolves at LOTTERY_CUTOFF_MINUTES (default 60) before its start time.
//  - Entries are accepted only while now < resolutionTime(bookingDate, slotIndex).
//  - Minimum lottery duration (MIN_LOTTERY_DURATION_MS) enforced so the contest
//    stays open at least that long after the first entry joins.

export const LOTTERY_CUTOFF_MINUTES =
  Number(process.env.LOTTERY_CUTOFF_MINUTES) || 60;

export const MIN_GAP_MINUTES =
  Number(process.env.MIN_GAP_MINUTES) || 60;

export const MIN_GAP_MS = MIN_GAP_MINUTES * 60 * 1000;

export const MIN_LOTTERY_DURATION_MS =
  Number(process.env.MIN_LOTTERY_DURATION_MS) || 120000;

export const MIN_LOTTERY_DURATION_MINUTES = Math.round(MIN_LOTTERY_DURATION_MS / 60000);

// preferred_time_slot = hours*4 + floor(minutes/15) -> 0..95
export function slotStartTime(bookingDateStr, slotIndex) {
  const hours = Math.floor(slotIndex / 4);
  const minutes = (slotIndex % 4) * 15;
  return new Date(
    `${bookingDateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`,
  );
}

export function getLotteryResolutionTime(bookingDateStr, slotIndex) {
  const start = slotStartTime(bookingDateStr, slotIndex);
  return new Date(start.getTime() - LOTTERY_CUTOFF_MINUTES * 60 * 1000);
}

export function getLotteryEarliestResolutionTime(bookingDateStr, slotIndex, now = new Date()) {
  const cutoffTime = getLotteryResolutionTime(bookingDateStr, slotIndex);
  const earliestByDuration = new Date(now.getTime() + MIN_LOTTERY_DURATION_MS);
  return cutoffTime > earliestByDuration ? cutoffTime : earliestByDuration;
}

export function isLotteryClosed(bookingDateStr, slotIndex, now = new Date()) {
  return now.getTime() >= getLotteryResolutionTime(bookingDateStr, slotIndex).getTime();
}

export function getLotteryCountdown(bookingDateStr, slotIndex, now = new Date()) {
  const earliestResolution = getLotteryEarliestResolutionTime(bookingDateStr, slotIndex, now);
  const remaining = Math.max(0, earliestResolution.getTime() - now.getTime());
  return {
    remainingMs: remaining,
    remainingSeconds: Math.ceil(remaining / 1000),
    remainingMinutes: Math.ceil(remaining / 60000),
    closed: now.getTime() >= earliestResolution.getTime(),
  };
}
