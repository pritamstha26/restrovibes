import sequelize from "../config/db.js";
import { DataTypes } from "sequelize";
import { UsersModel } from "./model.js";

const TableModel = sequelize.define("TableModel", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  restaurateur_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: UsersModel,
      key: "id",
    },
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  },
  table_number: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  images: {
    type: DataTypes.JSON,
    defaultValue: [],
    allowNull: true,
  },
}, {
  tableName: "tables",
  timestamps: true,
  indexes: [
    { fields: ["restaurateur_id"] },
    { fields: ["restaurateur_id", "table_number"] },
  ],
});

UsersModel.hasMany(TableModel, { foreignKey: "restaurateur_id", as: "tables" });
TableModel.belongsTo(UsersModel, { foreignKey: "restaurateur_id", as: "restaurateur" });

export default TableModel;