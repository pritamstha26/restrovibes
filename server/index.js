import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import { startOverstayWorker } from "./overstayWorker.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import RestaurantRoutes from "./routes/restaurantServiceRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import ratingRoutes from "./routes/ratingRoutes.js";
import lotteryRoutes from "./routes/lotteryRoutes.js";
import tableRoutes from "./routes/tableRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import ServiceModel from "./models/service.js";
import sequelize from "./config/db.js";
import { lotteryScheduler } from "./jobs/lotteryScheduler.js";
dotenv.config();
const app = express();

const repairServiceOwnershipIndexes = async () => {
  try {
    const queryInterface = sequelize.getQueryInterface();
    const tableName = ServiceModel.getTableName();
    const resolvedTableName =
      typeof tableName === "string" ? tableName : tableName.tableName;

    const indexes = await queryInterface.showIndex(resolvedTableName);
    const legacyTitleIndex = indexes.find((index) => {
      return (
        index.unique &&
        index.fields.length === 1 &&
        index.fields[0].attribute === "title"
      );
    });

    if (legacyTitleIndex) {
      await queryInterface.removeIndex(resolvedTableName, legacyTitleIndex.name);
    }

    const ownerScopedIndexName = "service_models_user_title_service_type_unique";
    const ownerScopedIndexExists = indexes.some(
      (index) => index.name === ownerScopedIndexName,
    );

    if (!ownerScopedIndexExists) {
      await queryInterface.addIndex(resolvedTableName, ["user_id", "title", "service_type"], {
        unique: true,
        name: ownerScopedIndexName,
      });
    }
  } catch (error) {
    console.warn("Could not repair service ownership indexes:", error.message || error);
  }
};

const addPostgresEnumValue = async (enumType, value) => {
  try {
    const [types] = await sequelize.query(
      `SELECT typname FROM pg_type WHERE lower(typname) = lower(:enumType) LIMIT 1`,
      { replacements: { enumType } },
    );

    if (!types || types.length === 0) {
      return;
    }

    const [values] = await sequelize.query(
      `SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = :enumType) AND enumlabel = :value LIMIT 1`,
      { replacements: { enumType, value } },
    );

    if (values && values.length > 0) {
      return;
    }

    await sequelize.query(`ALTER TYPE ${enumType} ADD VALUE '${value}'`);
  } catch (error) {
    console.warn(
      `Could not ensure enum value ${value} on ${enumType}:`,
      error.message || error,
    );
  }
};

try {
  // Ensure the appointment status enum includes all supported values before syncing.
  await addPostgresEnumValue("enum_AppointmentModels_status", "in_progress");
  await addPostgresEnumValue("enum_AppointmentModels_status", "completed");
  await addPostgresEnumValue("enum_AppointmentModels_status", "no_show");

  // Attempt to sync models to DB in dev, but don't crash the app on failure.
  await sequelize.sync({ alter: true  });
  await repairServiceOwnershipIndexes();
  lotteryScheduler.start();
} catch (syncErr) {
  console.warn(
    "Sequelize sync (alter) failed. This can happen when the DB schema diverges from models. Skipping sync; please run migrations instead.",
    syncErr.message || syncErr,
  );
}
// Middleware
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
// Allow the default Vite port and a common fallback (5174) used when 5173 is occupied
const allowedOrigins = [
  FRONTEND_URL,
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      } else {
        const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
        return callback(new Error(msg), false);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use(express.json());

import { fileURLToPath } from "node:url";
import path from "node:path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/restaurateurs-services", RestaurantRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/lottery", lotteryRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/uploads", uploadRoutes);
// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

const PORT = process.env.PORT || 5000;
await connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Start background workers
try {
  startOverstayWorker();
} catch (err) {
  console.warn("Could not start overstay worker:", err.message || err);
}
