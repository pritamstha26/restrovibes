// Shared lottery timing rules (single source of truth for entry cutoff + draw moment).
//
// Rule (uniform for every slot and every venue, no dependency on opening hours):
//  - A slot resolves at LOTTERY_CUTOFF_MINUTES (default 60) before its start time.
//  - Entries are accepted only while `now < resolutionTime(bookingDate, slotIndex)`.

export const LOTTERY_CUTOFF_MINUTES =
  Number(process.env.LOTTERY_CUTOFF_MINUTES) || 60;

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

export function isLotteryClosed(bookingDateStr, slotIndex, now = new Date()) {
  return now.getTime() >= getLotteryResolutionTime(bookingDateStr, slotIndex).getTime();
}