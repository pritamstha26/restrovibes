import sequelize from "../config/db.js";
import { DataTypes } from "sequelize";
import ServiceModel from "./service.js";
import { UsersModel } from "./model.js";
import RestaurateurService from "./RestaurateurServices.js";

const AppointmentModel = sequelize.define("AppointmentModel", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  serviceId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: RestaurateurService,
      key: "id",
    },
  },
  clientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: UsersModel,
      key: "id",
    },
  },
  restaurateurId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: UsersModel,
      key: "id",
    },
  },booked_price: {
     type: DataTypes.INTEGER,
     allowNull: false
   },
  party_size: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  table_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "tables",
      key: "id",
    },
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  original_duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: "Original service duration in minutes (before buffer)",
  },
  extended_until: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  extension_status: {
    type: DataTypes.ENUM("none", "pending", "accepted", "rejected"),
    defaultValue: "none",
  },
  overstay_fee: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: "Fee in cents/paise for overstay beyond grace period",
  },
  status: {
    type: DataTypes.ENUM(
      "pending",
      "accepted",
      "rejected",
      "cancelled",
      "in_progress",
      "completed",
      "no_show",
    ),
    defaultValue: "pending",
  },
  clientType: {
    type: DataTypes.ENUM("regular", "vip", "premium", "emergency", "walk_in"),
    defaultValue: "regular",
  },
  isReschedule: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  actual_arrival_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: "When the client actually arrived (set by restaurateur)",
  },
  is_late: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: "True if client arrived more than 15 min after scheduled time",
  },
});

// Associations remain the same
AppointmentModel.belongsTo(UsersModel, {
  foreignKey: "clientId",
  as: "client",
});

AppointmentModel.belongsTo(UsersModel, {
  foreignKey: "restaurateurId",
  as: "restaurateurs",
});

AppointmentModel.belongsTo(RestaurateurService, {
  foreignKey: "serviceId",
  as: "service",
});

export default AppointmentModel;
