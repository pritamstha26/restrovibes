// Bulk reset + reseed for demos. Wipes ALL restaurant/client data and installs
// a fresh dataset with multiple appointments (incl. ready lottery contests).
//
//   node scripts/bulkReset.js --yes                              # fresh wipe + seed (5 restaurants, 12 clients)
//   node scripts/bulkReset.js --yes --add                        # ADD more without wiping (+5 restaurants, +15 clients)
//   node scripts/bulkReset.js --yes --add --restaurants 10 --clients 25
//   node scripts/bulkReset.js --yes --add --restaurants 1 --clients 3 --contests 3   # top up lottery pools only
//
// Safety: refuses to run without --yes. Admin users are ALWAYS preserved.

import sequelize from "../config/db.js";
import { Op } from "sequelize";
import bcrypt from "bcrypt";
import { UsersModel, LotteryPoolModel, BookingHistoryModel } from "../models/model.js";
import AppointmentModel from "../models/appointmentModel.js";
import { RestaurateurService } from "../models/RestaurateurServices.js";
import TableModel from "../models/tableModel.js";
import RatingModel from "../models/ratingModel.js";

const args = process.argv.slice(2);
if (!args.includes("--yes")) {
  console.error("Refusing to wipe without --yes. Run: node scripts/bulkReset.js --yes [--add] [--restaurants N] [--clients M]");
  process.exit(1);
}
const addMode = args.includes("--add");
const getNum = (name, fallback) => {
  const i = args.indexOf(name);
  const v = i >= 0 ? Number(args[i + 1]) : NaN;
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
};
const numRestaurants = getNum("--restaurants", addMode ? 5 : 5);
const numClients = getNum("--clients", addMode ? 15 : 12);
const numContests = getNum("--contests", 2);
// Unique email tag per run so --add never collides with existing rows.
const tag = addMode ? `m${Date.now().toString(36)}` : "demo";

const BUFFER_MIN = Number(process.env.BOOKING_BUFFER_MINUTES) || 60;
const slotToTime = (slot) =>
  `${String(Math.floor(slot / 4)).padStart(2, "0")}:${String((slot % 4) * 15).padStart(2, "0")}`;

const tableNameOf = (model) => {
  const tn = model.getTableName();
  return typeof tn === "string" ? `"${tn}"` : `"${tn.schema || "public"}"."${tn.tableName}"`;
};

const main = async () => {
  await sequelize.authenticate();

  // ---------- 1. WIPE (children first; admins preserved; skipped in --add) ----------
  if (!addMode) {
    const childTables = [
      LotteryPoolModel,
      RatingModel,
      BookingHistoryModel,
      AppointmentModel,
      TableModel,
      RestaurateurService,
    ].map(tableNameOf);
    await sequelize.query(`TRUNCATE TABLE ${childTables.join(", ")} RESTART IDENTITY CASCADE`);
    const deletedUsers = await UsersModel.destroy({
      where: { role: { [Op.in]: ["restaurateurs", "client"] } },
    });
    console.log(`Wiped: ${deletedUsers} restaurant/client users + all appointments, pools, services, tables, ratings, history.`);
  } else {
    console.log("Add mode: keeping all existing data, appending new rows.");
  }
  const adminsLeft = await UsersModel.count({ where: { role: "admin" } });
  console.log(`Admins kept: ${adminsLeft}`);

  // ---------- 2. SEED ----------
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const restaurants = [];
  const venuePool = [
    { first: "Himalayan", last: "Kitchen", location: "Thamel, Kathmandu", lat: 27.7172, lng: 85.324 },
    { first: "Lakeside", last: "Bites", location: "Pokhara Lakeside", lat: 28.2096, lng: 83.9856 },
    { first: "Durbar", last: "Diner", location: "Bhaktapur Durbar", lat: 27.671, lng: 85.4298 },
    { first: "Terai", last: "Tadka", location: "Chitwan Chowk", lat: 27.6833, lng: 84.4333 },
    { first: "Hillside", last: "Hub", location: "Nagarkot View", lat: 27.7156, lng: 85.5207 },
    { first: "Riverside", last: "Retreat", location: "Trishuli Bend", lat: 27.65, lng: 84.55 },
    { first: "Old Bazaar", last: "Bhoj", location: "Ason, Kathmandu", lat: 27.707, lng: 85.315 },
    { first: "Mountain", last: "Mist", location: "Sarangkot", lat: 28.24, lng: 83.95 },
    { first: "Valley", last: "View", location: "Kakani Hills", lat: 27.81, lng: 85.25 },
    { first: "Sunset", last: "Supper", location: "Dhulikhel Ridge", lat: 27.62, lng: 85.55 },
    { first: "Forest", last: "Feast", location: "Shivapuri Gate", lat: 27.78, lng: 85.38 },
    { first: "Palace", last: "Plates", location: "Patan Square", lat: 27.6739, lng: 85.3256 },
  ];
  const venues = Array.from({ length: numRestaurants }, (_, i) => {
    const v = venuePool[i % venuePool.length];
    const round = Math.floor(i / venuePool.length);
    return round ? { ...v, last: `${v.last} ${round + 1}` } : v;
  });
  for (let i = 0; i < venues.length; i++) {
    const v = venues[i];
    const r = await UsersModel.create({
      first_name: v.first,
      last_name: v.last,
      email: `${tag}.rest${i + 1}.${Date.now().toString(36)}@restrovibe.local`,
      password: passwordHash,
      phone_number: 9800000000 + Math.floor(Math.random() * 199999999),
      latitude: v.lat,
      longitude: v.lng,
      location_name: v.location,
      opening_time: "09:00:00",
      closing_time: "22:00:00",
      seat_capacity: 20,
      role: "restaurateurs",
      active_status: true,
    });
    restaurants.push(r);
  }

  const clients = [];
  const namePool = [
    ["Aarav", "Sharma"], ["Diya", "Karki"], ["Kabir", "Thapa"], ["Anaya", "Gurung"],
    ["Rohan", "Magar"], ["Isha", "Tamang"], ["Vivaan", "Shrestha"], ["Myra", "Rai"],
    ["Arjun", "Limbu"], ["Sara", "Poudel"], ["Yash", "Adhikari"], ["Pari", "Bhandari"],
    ["Aasha", "KC"], ["Bibek", "Sapkota"], ["Chaya", "Raut"], ["Deepak", "Yadav"],
    ["Elina", "Basnet"], ["Farhan", "Ali"], ["Gauri", "Dahal"], ["Hari", "Ojha"],
    ["Ira", "Joshi"], ["Jeevan", "Khadka"], ["Kriti", "Lama"], ["Laxman", "Mishra"],
    ["Muna", "Neupane"], ["Niraj", "Oli"], ["Ojas", "Pant"], ["Prerna", "Qureshi"],
    ["Ritesh", "Rana"], ["Sneha", "Singh"],
  ];
  for (let i = 0; i < numClients; i++) {
    const [first, lastBase] = namePool[i % namePool.length];
    const round = Math.floor(i / namePool.length);
    const last = round ? `${lastBase} ${round + 1}` : lastBase;
    clients.push(await UsersModel.create({
      first_name: first,
      last_name: last,
      email: `${tag}.client${i + 1}.${Date.now().toString(36)}@restrovibe.local`,
      password: passwordHash,
      phone_number: 9810000000 + Math.floor(Math.random() * 199999999),
      role: "client",
      active_status: true,
      flexibility_score: (i * 7) % 100,
      loyalty_score: (i * 13) % 100,
    }));
  }

  const services = [];
  for (const r of restaurants) {
    const defs = [
      { name: "Momo Platter", price: 350, duration: 45 },
      { name: "Thakali Set", price: 550, duration: 60 },
    ];
    for (const d of defs) {
      services.push(await RestaurateurService.create({ ...d, restaurateurId: r.id }));
    }
    for (const [num, cap] of [["T-1", 2], ["T-2", 4], ["T-3", 6]]) {
      await TableModel.create({ restaurateur_id: r.id, table_number: num, capacity: cap, is_active: true });
    }
  }

  // Bulk appointments: ~5 per restaurant spread over the next 10 days, mixed statuses.
  const mkDate = (dayOffset, hour, minute = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d;
  };
  let apptCount = 0;
  const hours = [11, 12, 13, 18, 19, 20];
  const perRest = addMode ? 5 : 4;
  for (let r = 0; r < restaurants.length; r++) {
    for (let k = 0; k < perRest; k++) {
      const i = r * perRest + k;
      const day = 1 + ((r + k * 3) % 10);
      const hour = hours[(r * 2 + k) % hours.length];
      const minute = (k % 2) * 30;
      const rest = restaurants[r];
      const client = clients[(i * 5 + r) % clients.length];
      const svc = services.find((s) => s.restaurateurId === rest.id);
      const start = mkDate(day, hour, minute);
      const end = new Date(start.getTime() + (svc.duration + BUFFER_MIN) * 60 * 1000);
      await AppointmentModel.create({
        serviceId: svc.id,
        clientId: client.id,
        restaurateurId: rest.id,
        date: start,
        end_time: end,
        original_duration: svc.duration,
        party_size: 1 + (i % 4),
        booked_price: svc.price,
        quantity: 1,
        status: i % 3 === 0 ? "accepted" : "pending",
        clientType: "regular",
        isReschedule: false,
      });
      apptCount += 1;
    }
  }

  // Ready-to-resolve lottery contests on otherwise free slots.
  // Fresh mode reuses the original slots; add mode uses days 8+ to avoid clashes.
  // Each contest is checked for overlapping accepted bookings first (guarded).
  if (clients.length < 3) throw new Error("Need at least 3 clients to stage a contest");
  const contestBaseDay = addMode ? 8 : 2;
  const contests = Array.from({ length: numContests }, (_, j) => ({
    restIdx: j % restaurants.length,
    day: contestBaseDay + j,
    hour: j % 2 === 0 ? 20 : 12,
    entrants: [0, 1, 2].map((k) => (j * 3 + k) % clients.length),
    agesH: [12, 3, 0.2],
    weights: [100, 120, 90],
  }));
  let poolCount = 0;
  for (const c of contests) {
    const rest = restaurants[c.restIdx];
    const svc = services.find((s) => s.restaurateurId === rest.id);
    // Find a free day (bump forward while an accepted booking overlaps).
    let start = null;
    for (let d = 0; d < 7; d++) {
      const cand = mkDate(c.day + d, c.hour, 0);
      const candEnd = new Date(cand.getTime() + (svc.duration + BUFFER_MIN) * 60 * 1000);
      const occupant = await AppointmentModel.findOne({
        where: {
          restaurateurId: rest.id,
          status: { [Op.in]: ["accepted", "in_progress"] },
          [Op.and]: [
            { date: { [Op.lt]: candEnd } },
            {
              [Op.or]: [
                { end_time: { [Op.gt]: cand } },
                { end_time: null, date: { [Op.gt]: cand } },
              ],
            },
          ],
        },
      });
      if (!occupant) { start = cand; break; }
      console.log(`Contest slot day+${c.day + d} ${c.hour}:00 blocked, trying next day...`);
    }
    if (!start) { console.log("Contest skipped: no free day found"); continue; }
    const end = new Date(start.getTime() + (svc.duration + BUFFER_MIN) * 60 * 1000);
    const bookingDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
    const timeSlot = start.getHours() * 4 + Math.floor(start.getMinutes() / 15);
    for (let k = 0; k < c.entrants.length; k++) {
      const client = clients[c.entrants[k]];
      await AppointmentModel.create({
        serviceId: svc.id,
        clientId: client.id,
        restaurateurId: rest.id,
        date: start,
        end_time: end,
        original_duration: svc.duration,
        party_size: 2,
        booked_price: svc.price,
        quantity: 1,
        status: "pending",
        clientType: "regular",
        isReschedule: false,
      });
      await LotteryPoolModel.create({
        restaurant_id: rest.id,
        user_id: client.id,
        booking_date: bookingDate,
        preferred_time_slot: timeSlot,
        party_size: 2,
        flexibility_range_minutes: 0,
        weight: c.weights[k],
        status: "pending",
        alternative_accepted: false,
        entered_at: new Date(Date.now() - c.agesH[k] * 3600 * 1000),
      });
      poolCount += 1;
    }
    console.log(`Contest: ${rest.first_name} ${rest.last_name} on ${bookingDate} slot ${timeSlot} (${slotToTime(timeSlot)}) — ${c.entrants.length} entrants`);
  }

  console.log(`\nSeeded: ${restaurants.length} restaurants, ${clients.length} clients, ${apptCount + poolCount} appointments, ${poolCount} lottery entries.`);
  console.log(`Demo logins (password demo1234): ${tag}.rest1.*@restrovibe.local / ${tag}.client1.*@restrovibe.local`);
  await sequelize.close();
};

main().catch(async (e) => {
  console.error("bulkReset failed:", e.message);
  try { await sequelize.close(); } catch {}
  process.exit(1);
});
