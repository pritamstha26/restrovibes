// Lottery Simulator for Examiner Demos
//
// Usage:
//   node scripts/lotterySimulator.js [--cutoff <min>] [--gap <min>] [--resolve] [--show]
//
// Demonstrates the weighted lottery system with configurable timing.
// Shows how changing LOTTERY_CUTOFF_MINUTES and MIN_GAP_MINUTES affects
// the lottery resolution behavior.

import sequelize from "../config/db.js";
import { Op } from "sequelize";
import { UsersModel, LotteryPoolModel } from "../models/model.js";
import AppointmentModel from "../models/appointmentModel.js";
import RestaurateurService from "../models/RestaurateurServices.js";
import { ScoringEngine } from "../utils/scoring.js";
import { getWeightedEntries, selectWeightedEntry, LOTTERY_DECAY } from "../utils/weightedLottery.js";
import { getLotteryResolutionTime, isLotteryClosed, slotStartTime, LOTTERY_CUTOFF_MINUTES, MIN_GAP_MINUTES } from "../utils/lotteryTime.js";
import { resolveLottery } from "../controllers/lotteryController.js";

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const idx = args.indexOf(name);
  return idx >= 0 && args[idx + 1] !== undefined ? args[idx + 1] : fallback;
};

const cutoffOverride = getArg("--cutoff", null);
const gapOverride = getArg("--gap", null);
const doResolve = args.includes("--resolve");
const doShow = args.includes("--show");

const slotToTime = (slot) =>
  `${String(Math.floor(slot / 4)).padStart(2, "0")}:${String((slot % 4) * 15).padStart(2, "0")}`;

function printSeparator() {
  console.log("═".repeat(60));
}

async function main() {
  await sequelize.authenticate();

  const restaurant = await UsersModel.findOne({
    where: { role: "restaurateurs", active_status: true },
    order: [["id", "ASC"]],
  });
  if (!restaurant) throw new Error("No active restaurateur found.");

  let service = await RestaurateurService.findOne({
    where: { restaurateurId: restaurant.id },
    order: [["id", "ASC"]],
  });
  if (!service) {
    service = await RestaurateurService.create({
      name: "Simulator Tasting Menu",
      price: 1500,
      duration: 60,
      restaurateurId: restaurant.id,
    });
  }

  const clients = await UsersModel.findAll({
    where: { role: "client" },
    order: [["id", "ASC"]],
    limit: 3,
  });
  if (clients.length < 2) throw new Error("Need at least 2 client accounts.");

  const days = Number(getArg("--days", 1));
  const hour = Number(getArg("--hour", 19));

  const appointmentDate = new Date();
  appointmentDate.setDate(appointmentDate.getDate() + days);
  appointmentDate.setHours(hour, 0, 0, 0);

  const timeSlot = appointmentDate.getHours() * 4 + Math.floor(appointmentDate.getMinutes() / 15);
  const bookingDate = appointmentDate.toISOString().slice(0, 10);
  const durationMinutes = service.duration || 60;

  printSeparator();
  console.log("🎰 LOTTERY SIMULATOR RESULTS");
  printSeparator();

  const effectiveCutoff = cutoffOverride || LOTTERY_CUTOFF_MINUTES;
  const effectiveGap = gapOverride || MIN_GAP_MINUTES;

  console.log(`\n📋 CONFIGURATION:`);
  console.log(`   Lottery Cutoff : ${effectiveCutoff} min (from env: ${LOTTERY_CUTOFF_MINUTES} min)`);
  console.log(`   Min Gap        : ${effectiveGap} min (from env: ${MIN_GAP_MINUTES} min)`);
  console.log(`   Half-life      : ${LOTTERY_DECAY.halfLifeHours} hours`);
  console.log(`   Max Boost      : ×${1 + LOTTERY_DECAY.maxAgingBoost} (base ×${LOTTERY_DECAY.maxAgingBoost} + 1)`);
  console.log(`   Booking Date   : ${bookingDate} at ${slotToTime(timeSlot)}`);
  console.log(`   Slot Index     : ${timeSlot}`);

  const slotStart = slotStartTime(bookingDate, timeSlot);
  const resolutionTime = new Date(slotStart.getTime() - effectiveCutoff * 60 * 1000);
  const timeUntilResolution = Math.max(0, Math.round((resolutionTime.getTime() - Date.now()) / 60000));

  console.log(`\n⏰ TIMING:`);
  console.log(`   Slot Start         : ${slotStart.toLocaleTimeString()}`);
  console.log(`   Lottery Closes     : ${resolutionTime.toLocaleTimeString()} (${timeUntilResolution} min from now)`);
  console.log(`   Closed?            : ${isLotteryClosed(bookingDate, timeSlot) ? "YES ✅ Ready to resolve" : "NO ❌ Still accepting entries"}`);
  console.log(`   Min Gap Between    : ${effectiveGap} min (same restaurant)`);

  // Clean any previous demo state
  await LotteryPoolModel.destroy({
    where: { restaurant_id: restaurant.id, booking_date: bookingDate, preferred_time_slot: timeSlot },
  });
  await AppointmentModel.destroy({
    where: { restaurateurId: restaurant.id, date: { [Op.gte]: appointmentDate, [Op.lt]: new Date(appointmentDate.getTime() + (durationMinutes + 15) * 60 * 1000) } },
  });

  // Create entries with staggered entry times to show aging effect
  const enteredOffsetsMin = [0, 5, 15]; // minutes before "now"
  const staged = [];

  for (let i = 0; i < Math.min(clients.length, 3); i++) {
    const client = clients[i];
    const enteredAt = new Date(Date.now() - enteredOffsetsMin[i] * 60 * 1000);
    const weight = await ScoringEngine.calculateTotalWeight(client.id, restaurant.id, {});

    const appointment = await AppointmentModel.create({
      serviceId: service.id,
      clientId: client.id,
      restaurateurId: restaurant.id,
      date: appointmentDate,
      end_time: new Date(appointmentDate.getTime() + (durationMinutes + 15) * 60 * 1000),
      original_duration: durationMinutes,
      party_size: 2,
      booked_price: service.price,
      quantity: 1,
      status: "pending",
      clientType: "regular",
    });

    const entry = await LotteryPoolModel.create({
      restaurant_id: restaurant.id,
      user_id: client.id,
      booking_date: bookingDate,
      preferred_time_slot: timeSlot,
      party_size: 2,
      flexibility_range_minutes: 0,
      weight,
      status: "pending",
      alternative_accepted: false,
      entered_at: enteredAt,
    });

    staged.push({ client, entry, weight, enteredAt });
  }

  console.log(`\n📊 ENTRANTS (${staged.length}):`);
  const weighted = getWeightedEntries(staged.map((s) => ({ weight: s.weight, entered_at: s.enteredAt })));
  const totalWeight = weighted.reduce((sum, w) => sum + w.effectiveWeight, 0);

  for (let i = 0; i < staged.length; i++) {
    const s = staged[i];
    const eff = weighted[i].effectiveWeight;
    const chance = totalWeight > 0 ? ((eff / totalWeight) * 100).toFixed(1) : "0.0";
    const ageMin = ((Date.now() - s.enteredAt.getTime()) / 60000).toFixed(1);
    console.log(`   ${s.client.first_name} ${s.client.last_name}: base=${s.weight} age=${ageMin}m → effective=${eff.toFixed(1)} (${chance}%)`);
  }

  console.log(`\n   Total weight: ${totalWeight.toFixed(1)}`);

  if (doResolve) {
    console.log(`\n⚡ RESOLVING LOTTERY...`);
    try {
      const result = await resolveLottery(restaurant.id, bookingDate, timeSlot, { force: true });
      printSeparator();
      console.log("✅ RESULT:");
      console.log(`   Winner : ${result.winner ? result.winner.userId : "none"}`);
      console.log(`   Total  : ${result.totalEntries} entries`);
      console.log(`   Winners: ${result.winner ? 1 : 0}`);
      console.log(`   Losers : ${result.totalEntries - (result.winner ? 1 : 0)}`);
      console.log(`   Chance : ${result.winnerChance}`);
    } catch (err) {
      console.error(`   Resolution failed: ${err.message}`);
    }
  } else if (doShow) {
    printSeparator();
    console.log("ℹ️  DASHBOARD VIEW (no resolution):");
    console.log(`   Pending pools for ${bookingDate}: ${staged.length} entries`);
    console.log(`   Lottery closes in: ${timeUntilResolution} minutes`);
    console.log(`   Aging boost factor: ${Math.round(Math.min((weighted[0]?.effectiveWeight || 100) / 100, 4) * 100) / 100}×`);
  } else {
    printSeparator();
    console.log("ℹ️  Run with --resolve to resolve the lottery");
    console.log("ℹ️  Run with --show to see the dashboard view");
    console.log("ℹ️  Run with --cutoff <min> to test different cutoff times");
    console.log("ℹ️  Run with --gap <min> to test different gap requirements");
    console.log("ℹ️  Example: node scripts/lotterySimulator.js --cutoff 30 --gap 30 --resolve");
  }

  printSeparator();
  await sequelize.close();
}

main().catch(async (error) => {
  console.error("Simulator error:", error);
  try { await sequelize.close(); } catch {}
  process.exit(1);
});
