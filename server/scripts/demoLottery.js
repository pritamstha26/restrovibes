// Seeds a ready-to-resolve weighted-lottery contest for demos.
//
// Usage:
//   node scripts/demoLottery.js [--restaurant <id>] [--days <n>] [--hour <0-23>] [--resolve] [--at <iso-datetime>]
//
// Creates two competing lottery entries for the same slot with different entry times,
// so the time-decay aging boost is visible when the slot is resolved.
// --at lets you resolve "as of" a dynamic time, e.g. --at "2026-09-20T12:00" to
// simulate the draw hours in the future without waiting.
import sequelize from "../config/db.js";
import { Op } from "sequelize";
import { UsersModel, LotteryPoolModel } from "../models/model.js";
import AppointmentModel from "../models/appointmentModel.js";
import RestaurateurService from "../models/RestaurateurServices.js";
import { ScoringEngine } from "../utils/scoring.js";
import { getWeightedEntries } from "../utils/weightedLottery.js";
import { getLotteryResolutionTime, isLotteryClosed, getLotteryCountdown, MIN_LOTTERY_DURATION_MS, LOTTERY_CUTOFF_MINUTES } from "../utils/lotteryTime.js";
import { resolveLottery } from "../controllers/lotteryController.js";

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : fallback;
};

const restaurantIdArg = getArg("--restaurant");
const days = Number(getArg("--days", 1));
const hour = Number(getArg("--hour", 19));
const doResolve = args.includes("--resolve");

const slotToTime = (slot) =>
  `${String(Math.floor(slot / 4)).padStart(2, "0")}:${String((slot % 4) * 15).padStart(2, "0")}`;

const main = async () => {
  await sequelize.authenticate();

  let restaurant;
  if (restaurantIdArg) {
    restaurant = await UsersModel.findOne({
      where: { id: restaurantIdArg, role: "restaurateurs" },
    });
  }
  if (!restaurant) {
    restaurant = await UsersModel.findOne({
      where: { role: "restaurateurs", active_status: true },
      order: [["id", "ASC"]],
    });
  }
  if (!restaurant) {
    restaurant = await UsersModel.findOne({
      where: { role: "restaurateurs" },
      order: [["id", "ASC"]],
    });
  }
  if (!restaurant) throw new Error("No restaurateur found. Seed a restaurant first.");

  let service = await RestaurateurService.findOne({
    where: { restaurateurId: restaurant.id },
    order: [["id", "ASC"]],
  });
  if (!service) {
    service = await RestaurateurService.create({
      name: "Demo Tasting Menu",
      price: 1500,
      duration: 60,
      restaurateurId: restaurant.id,
    });
  }

  const clients = await UsersModel.findAll({
    where: { role: "client" },
    order: [["id", "ASC"]],
    limit: 2,
  });
  if (clients.length < 2) {
    throw new Error("Need at least 2 client accounts to stage a contest.");
  }

  const appointmentDate = new Date();
  appointmentDate.setDate(appointmentDate.getDate() + days);
  appointmentDate.setHours(hour, 0, 0, 0);

  const timeSlot = appointmentDate.getHours() * 4 + Math.floor(appointmentDate.getMinutes() / 15);
  const bookingDate = appointmentDate.toISOString().slice(0, 10);
  const durationMinutes = service.duration || 60;
  const endTime = new Date(appointmentDate.getTime() + (durationMinutes + 15) * 60 * 1000);

  // Refuse to seed into an occupied slot: any accepted/in_progress booking
  // overlapping this window would block every entry at resolve time and the
  // lottery would end with no winner ("slot_occupied").
  const occupant = await AppointmentModel.findOne({
    where: {
      restaurateurId: restaurant.id,
      status: { [Op.in]: ["accepted", "in_progress"] },
      [Op.and]: [
        { date: { [Op.lt]: endTime } },
        {
          [Op.or]: [
            { end_time: { [Op.gt]: appointmentDate } },
            { end_time: null, date: { [Op.gt]: appointmentDate } },
          ],
        },
      ],
    },
    order: [["date", "ASC"]],
  });
  if (occupant) {
    console.error(
      `\nRefusing to seed: slot ${slotToTime(timeSlot)} on ${bookingDate} is blocked by ` +
      `${occupant.status} booking #${occupant.id} at ${new Date(occupant.date).toLocaleString()}. ` +
      `Resolving here would release entrants with NO winner.`,
    );
    console.error("Cancel that booking first, or pick another slot with --days / --hour.");
    await sequelize.close();
    process.exit(1);
  }

  // Clean any previous demo state for this exact slot.
  await LotteryPoolModel.destroy({
    where: {
      restaurant_id: restaurant.id,
      booking_date: bookingDate,
      preferred_time_slot: timeSlot,
    },
  });
  await AppointmentModel.destroy({
    where: {
      clientId: clients.map((c) => c.id),
      restaurateurId: restaurant.id,
      date: {
        [Op.gte]: appointmentDate,
        [Op.lt]: endTime,
      },
    },
  });

  const enteredOffsetsHours = [12, 1];
  const staged = [];

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const enteredAt = new Date(Date.now() - enteredOffsetsHours[i] * 60 * 60 * 1000);
    const weight = await ScoringEngine.calculateTotalWeight(
      client.id,
      restaurant.id,
      {},
    );

    const appointment = await AppointmentModel.create({
      serviceId: service.id,
      clientId: client.id,
      restaurateurId: restaurant.id,
      date: appointmentDate,
      end_time: endTime,
      original_duration: durationMinutes,
      party_size: 2,
      booked_price: service.price,
      quantity: 1,
      status: "pending",
      clientType: "regular",
      isReschedule: false,
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

    staged.push({ client, appointment, entry, weight, enteredAt });
  }

  const weighted = getWeightedEntries(
    staged.map((s) => ({ weight: s.weight, entered_at: s.enteredAt })),
    Date.now(),
  );
  const totalWeight = weighted.reduce((sum, w) => sum + w.effectiveWeight, 0);
  const resolutionTime = getLotteryResolutionTime(bookingDate, timeSlot);
  const countdown = getLotteryCountdown(bookingDate, timeSlot);
  const minDurationMin = Math.round(MIN_LOTTERY_DURATION_MS / 60000);

  console.log("\n=== DEMO LOTTERY SEEDED ===");
  console.log(`Restaurant      : ${restaurant.id} (${restaurant.first_name} ${restaurant.last_name})`);
  console.log(`Service         : ${service.name} (${durationMinutes} min, Rs. ${service.price})`);
  console.log(`Booking date    : ${bookingDate}`);
  console.log(`Time slot       : ${timeSlot} (${slotToTime(timeSlot)})`);
  console.log(`Cutoff          : ${LOTTERY_CUTOFF_MINUTES || 60} min before slot`);
  console.log(`Min duration    : ${minDurationMin} min (lottery must stay open at least this long)`);
  console.log(`Resolution time : ${resolutionTime.toLocaleString()}  ${isLotteryClosed(bookingDate, timeSlot) ? "[CLOSED - can resolve now]" : "[open]"}`);
  console.log(`Countdown       : ${countdown.remainingSeconds}s (${countdown.remainingMinutes} min)`);
  console.log("\nEntrants:");
  staged.forEach((s, i) => {
    const eff = weighted[i].effectiveWeight;
    const chance = totalWeight > 0 ? ((eff / totalWeight) * 100).toFixed(1) : "0.0";
    const ageHours = ((Date.now() - s.enteredAt.getTime()) / 3600000).toFixed(1);
    console.log(
      `  - ${s.client.first_name} ${s.client.last_name} (id ${s.client.id})` +
      `  base ${s.weight}  age ${ageHours}h  ->  effective ${eff.toFixed(1)}  (${chance}% chance)`,
    );
  });

  if (doResolve) {
    const atArg = getArg("--at", null);
    const now = atArg ? new Date(atArg) : new Date();
    if (Number.isNaN(now.getTime())) {
      throw new Error(`Invalid --at datetime: ${atArg}`);
    }
    if (atArg) console.log(`Resolving as of   : ${now.toISOString()} (dynamic --at)`);
    const result = await resolveLottery(restaurant.id, bookingDate, timeSlot, {
      force: true,
      now,
    });
    console.log("\n=== RESOLVED ===");
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("\nNext: open Admin -> Bookings and click 'Resolve now',");
    console.log("      or re-run with --resolve, using:");
    console.log(`      { "restaurantId": ${restaurant.id}, "bookingDate": "${bookingDate}", "timeSlot": ${timeSlot} }`);
  }

  await sequelize.close();
};

main().catch(async (error) => {
  console.error("demoLottery failed:", error);
  try {
    await sequelize.close();
  } catch {}
  process.exit(1);
});