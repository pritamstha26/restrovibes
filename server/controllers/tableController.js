import TableModel from "../models/tableModel.js";
import { UsersModel } from "../models/model.js";
import { Op } from "sequelize";
import { decodeToken } from "./authController.js";

export const getAllTables = async (req, res) => {
  try {
    const tables = await TableModel.findAll({
      include: [
        {
          model: UsersModel,
          as: "restaurateur",
          attributes: ["id", "first_name", "last_name", "email"],
        },
      ],
      order: [["restaurateur_id", "ASC"], ["table_number", "ASC"]],
      raw: true,
    });

    const mapped = tables.map((t) => ({
      id: t.id,
      table_number: t.table_number,
      capacity: t.capacity,
      is_active: t.is_active,
      restaurateur_id: t.restaurateur_id,
      restaurateur_name: t.restaurateur
        ? `${t.restaurateur.first_name || ""} ${t.restaurateur.last_name || ""}`.trim()
        : `Restaurant ${t.restaurateur_id}`,
    }));

    return res.status(200).json({
      success: true,
      data: mapped,
    });
  } catch (error) {
    console.error("Error fetching all tables:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching tables",
      error: error.message,
    });
  }
};

export const getRestaurantTables = async (req, res) => {
  try {
    const { restaurateurId } = req.params;

    const tables = await TableModel.findAll({
      where: { restaurateur_id: restaurateurId },
      order: [["table_number", "ASC"]],
      raw: true,
    });

    return res.status(200).json({
      success: true,
      data: tables,
    });
  } catch (error) {
    console.error("Error fetching restaurant tables:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching tables",
      error: error.message,
    });
  }
};

export const createTable = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decodedToken = token ? decodeToken(token) : null;
    if (!decodedToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      restaurateurId,
      restaurateur_id,
      table_number,
      capacity,
      is_active,
    } = req.body;

    const resolvedRestaurantId = restaurateurId ?? restaurateur_id;

    if (!resolvedRestaurantId || !table_number || !capacity) {
      return res.status(400).json({
        success: false,
        message: "restaurant identifier, table_number, and capacity are required",
      });
    }

    if (
      !["admin", "restaurateurs"].includes(decodedToken.role) ||
      (decodedToken.role !== "admin" &&
        Number(decodedToken.id) !== Number(resolvedRestaurantId))
    ) {
      return res.status(403).json({ message: "You can only manage your own tables" });
    }

    if (!Number.isInteger(Number(capacity)) || Number(capacity) < 1) {
      return res.status(400).json({ message: "capacity must be a positive integer" });
    }

    const restaurateur = await UsersModel.findByPk(resolvedRestaurantId);
    if (!restaurateur || restaurateur.role !== "restaurateurs") {
      return res.status(404).json({
        success: false,
        message: "Restaurant not found",
      });
    }

    const existingTable = await TableModel.findOne({
      where: {
        restaurateur_id: resolvedRestaurantId,
        table_number,
      },
    });

    if (existingTable) {
      return res.status(409).json({
        success: false,
        message: `Table ${table_number} already exists for this restaurant`,
      });
    }

    const table = await TableModel.create({
      restaurateur_id: resolvedRestaurantId,
      table_number,
      capacity: Number(capacity),
      is_active: is_active !== undefined ? is_active : true,
    });

    return res.status(201).json({
      success: true,
      data: table,
    });
  } catch (error) {
    console.error("Error creating table:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating table",
      error: error.message,
    });
  }
};

export const updateTable = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decodedToken = token ? decodeToken(token) : null;
    if (!decodedToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { table_number, capacity, is_active } = req.body;

    const table = await TableModel.findByPk(id);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    if (
      decodedToken.role !== "admin" &&
      Number(table.restaurateur_id) !== Number(decodedToken.id)
    ) {
      return res.status(403).json({ message: "You can only manage your own tables" });
    }

    if (table_number !== undefined) table.table_number = table_number;
    if (capacity !== undefined) {
      if (!Number.isInteger(Number(capacity)) || Number(capacity) < 1) {
        return res.status(400).json({ message: "capacity must be a positive integer" });
      }
      table.capacity = Number(capacity);
    }
    if (is_active !== undefined) table.is_active = is_active;

    await table.save();

    return res.status(200).json({
      success: true,
      data: table,
    });
  } catch (error) {
    console.error("Error updating table:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating table",
      error: error.message,
    });
  }
};

export const deleteTable = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decodedToken = token ? decodeToken(token) : null;
    if (!decodedToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;

    const table = await TableModel.findByPk(id);
    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Table not found",
      });
    }

    if (
      decodedToken.role !== "admin" &&
      Number(table.restaurateur_id) !== Number(decodedToken.id)
    ) {
      return res.status(403).json({ message: "You can only manage your own tables" });
    }

    await table.destroy();

    return res.status(200).json({
      success: true,
      message: "Table deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting table:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting table",
      error: error.message,
    });
  }
};