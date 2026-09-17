import sequelize from "./config/db.js";
import { UsersModel } from "./models/model.js";
import { getKathmanduAreaCoordinates } from "./utils/location.js";

// Real coordinate anchors for areas that are not part of the standard
// Kathmandu neighborhood list used by the seeder.
const EXTRA_ANCHORS = {
  "Bhaktapur": { lat: 27.6710, lng: 85.4298 },
  "Dhading Besi": { lat: 27.9116, lng: 84.8931 },
  "Chandragiri": { lat: 27.6833, lng: 85.2417 },
  "Kathmandu Center": { lat: 27.7172, lng: 85.324 },
};

// Normalize names that appear inside full addresses but do not match a
// neighborhood key directly.
const ALIASES = {
  gokarneshwar: "Gokarna",
  gokarneswor: "Gokarna",
  kageshwori: "Chabahil",
  manohara: "Gokarna",
  lalitpur: "Jawalakhel",
  hattiban: "Patan",
  panipokhari: "Lazimpat",
  nilkantha: "Dhading Besi",
  nilakantha: "Dhading Besi",
  "new baneshwor": "Baneshwor",
  baneshwar: "Baneshwor",
  dhading: "Dhading Besi",
  maharajgunj: "Maharajgunj",
  kalimati: "Kalimati",
  kirtipur: "Kirtipur",
};

// Return { lat, lng } if the location name can be matched to a real area.
function findAnchor(locationName) {
  const name = String(locationName || "").toLowerCase();
  if (!name) return null;

  const neighborhoods = getKathmanduAreaCoordinates().neighborhoods;

  // 1. Direct neighborhood name match (case-insensitive substring).
  for (const n of neighborhoods) {
    if (name.includes(n.name.toLowerCase())) {
      return { lat: n.lat, lng: n.lng };
    }
  }

  // 2. Extra top-level anchors.
  for (const [anchorName, coords] of Object.entries(EXTRA_ANCHORS)) {
    if (name.includes(anchorName.toLowerCase())) return coords;
  }

  // 3. Aliases → neighborhood or extra anchor.
  for (const [alias, target] of Object.entries(ALIASES)) {
    if (name.includes(alias)) {
      const n = neighborhoods.find((x) => x.name.toLowerCase() === target.toLowerCase());
      if (n) return { lat: n.lat, lng: n.lng };
      if (EXTRA_ANCHORS[target]) return EXTRA_ANCHORS[target];
    }
  }

  return null;
}

function jitter(value, magnitude) {
  return value + (Math.random() * 2 - 1) * magnitude;
}

async function fixLocations() {
  try {
    await sequelize.authenticate();
    console.log("Connection established.");

    const users = await UsersModel.findAll({
      where: { location_name: { [sequelize.Sequelize.Op.ne]: null } },
      attributes: ["id", "role", "location_name", "latitude", "longitude"],
      raw: true,
    });

    let updated = 0;
    let unmatched = 0;
    const unmatchedExamples = [];

    for (const user of users) {
      const anchor = findAnchor(user.location_name);
      if (!anchor) {
        unmatched += 1;
        if (unmatchedExamples.length < 10) {
          unmatchedExamples.push(`${user.role} ${user.id}: ${user.location_name}`);
        }
        continue;
      }

      // Keep adjacency realistic without stacking venues on the exact same point.
      const lat = Number(anchor.lat.toFixed(6)) + jitter(0, 0.002);
      const lng = Number(anchor.lng.toFixed(6)) + jitter(0, 0.002);

      await UsersModel.update({ latitude: lat, longitude: lng }, { where: { id: user.id } });
      updated += 1;
    }

    console.log(`Updated ${updated}/${users.length} users with corrected coordinates.`);
    if (unmatched > 0) {
      console.log(`Left ${unmatched} unmatched (no known area found). Examples:`);
      unmatchedExamples.forEach((e) => console.log(`  - ${e}`));
    }
  } catch (error) {
    console.error("Error fixing locations:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

fixLocations();