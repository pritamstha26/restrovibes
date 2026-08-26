import sequelize from "../config/db.js";
import { DataTypes } from "sequelize";

const UsersModel = sequelize.define("UsersModel", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  account_created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  phone_number: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: true,
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: true,
  },
  location_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  opening_time: {
    type: DataTypes.TIME,
    allowNull: true,
    defaultValue: "09:00:00",
  },
  closing_time: {
    type: DataTypes.TIME,
    allowNull: true,
    defaultValue: "18:00:00",
  },
  seat_capacity: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 10,
  },
  role: {
    type: DataTypes.ENUM("client", "admin", "restaurateurs"),
    defaultValue: "client",
  },
  active_status: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  reset_token: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  reset_token_expiry: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  refresh_token: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  refresh_token_version: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  flexibility_score: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  loyalty_score: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  penalty_score: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  total_completed_bookings: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  total_no_shows: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  total_late_cancellations: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  total_late_arrivals: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  is_flagged: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: "True if penalty_score > 0.5 (bad customer)",
  },
  reliability_status: {
    type: DataTypes.ENUM("reliable", "at_risk", "flagged"),
    defaultValue: "reliable",
    comment: "reliable=good standing, at_risk=penalty_score>0.25, flagged=penalty_score>0.5",
  },
});

const BookingHistoryModel = sequelize.define("BookingHistoryModel", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  restaurant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  booking_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  booking_time_slot: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 95,
    },
  },
  party_size: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM("completed", "late_cancelled", "no_show", "upcoming", "overstayed", "late_arrival"),
    defaultValue: "upcoming",
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: "booking_history",
  timestamps: false,
  indexes: [
    { fields: ["user_id"] },
    { fields: ["restaurant_id"] },
    { fields: ["user_id", "restaurant_id"] },
  ],
});

const LotteryPoolModel = sequelize.define("LotteryPoolModel", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  restaurant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  booking_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  preferred_time_slot: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0,
      max: 95,
    },
  },
  party_size: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  flexibility_range_minutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  weight: {
    type: DataTypes.FLOAT,
    defaultValue: 100,
  },
  status: {
    type: DataTypes.ENUM("pending", "won", "lost", "expired"),
    defaultValue: "pending",
  },
  alternative_accepted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  entered_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: "lottery_pool",
  timestamps: false,
  indexes: [
    { fields: ["restaurant_id", "booking_date", "preferred_time_slot"] },
    { fields: ["user_id"] },
    { fields: ["status"] },
  ],
});

UsersModel.hasMany(BookingHistoryModel, { foreignKey: "user_id", as: "bookingHistory" });
BookingHistoryModel.belongsTo(UsersModel, { foreignKey: "user_id", as: "user" });

UsersModel.hasMany(LotteryPoolModel, { foreignKey: "user_id", as: "lotteryEntries" });
LotteryPoolModel.belongsTo(UsersModel, { foreignKey: "user_id", as: "user" });

export { UsersModel, BookingHistoryModel, LotteryPoolModel };
