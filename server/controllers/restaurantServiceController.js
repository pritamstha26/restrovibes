import { RestaurateurService } from "../models/RestaurateurServices.js";
import { UsersModel } from "../models/model.js";
import AppointmentModel from "../models/appointmentModel.js";
import { Op } from "sequelize";
import { decodeToken } from "./authController.js";

const getAuthenticatedRestaurateurId = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  const decodedToken = decodeToken(token);
  if (!decodedToken) {
    return null;
  }

  return decodedToken.id;
};

const resolveRestaurateurId = (req) => {
  const tokenRestaurateurId = getAuthenticatedRestaurateurId(req);
  const bodyRestaurateurId = req.body?.restaurateurId ?? req.query?.restaurateurId ?? null;

  if (tokenRestaurateurId && bodyRestaurateurId && Number(tokenRestaurateurId) !== Number(bodyRestaurateurId)) {
    return null;
  }

  return tokenRestaurateurId || bodyRestaurateurId || null;
};

export const getRestaurateursById = async (req, res) => {
  try {
    const reqId = req.params.id;

    const restaurateurs = await UsersModel.findOne({
      where: {
        id: reqId,
        role: "restaurateurs",
      },
      attributes: [
        "id",
        "first_name",
        "last_name",
        "email",
        "phone_number",
        "role",
        "seat_capacity",
        "opening_time",
        "closing_time",
        "latitude",
        "longitude",
        "location_name",
      ],
    });
    if (!restaurateurs) {
      return res.status(404).json({
        success: false,
        message: "restaurateurs not found",
      });
    }
    res.status(200).json({
      success: true,
      data: restaurateurs,
    });
  } catch (error) {
    console.error("Error fetching restaurateurs:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user",
      error: error.message,
    });
  }
};

export const getRestaurateursServices = async (req, res) => {
  try {
    const restaurateurId = req.query.restaurateurId || null;

    const services = await RestaurateurService.findAll(
      restaurateurId
        ? {
            where: { restaurateurId },
          }
        : undefined,
    );
    const dynamic = req.query.dynamic === "true" || req.query.dynamic === "1";

    if (!dynamic) {
      return res.json(services);
    }

    if (!restaurateurId) {
      return res.json({
        services,
        demandInfo: null,
      });
    }

    const activeWhere = {
      status: { [Op.in]: ["pending", "accepted", "in_progress"] },
      restaurateurId,
    }

    const activeAppointments = await AppointmentModel.count({
      where: activeWhere,
    });

    const restaurateur = await UsersModel.findOne({
      where: { id: restaurateurId, role: "restaurateurs" },
      attributes: ["seat_capacity"],
    });
    const restaurateurCapacity = restaurateur?.seat_capacity || 10;
    const totalCapacity = restaurateurCapacity;

    const demandInfo = {
      restaurateurId,
      activeAppointments,
      totalCapacity,
      restaurateurCapacity,
    };

    const responseServices = services.map((service) => {
      return {
        ...service.toJSON(),
      };
    });

    res.json({ services: responseServices, demandInfo });
  } catch (error) {
    console.error("Error fetching restaurateurs services:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const deleteRestaurateursService = async (req, res) => {
  try {
    const restaurateurId = resolveRestaurateurId(req);
    if (!restaurateurId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { id } = req.params;
    const service = await RestaurateurService.findOne({
      where: { id, restaurateurId },
    });
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    await service.destroy();
    res.json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error("Error deleting restaurateurs service:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const updateRestaurateursService = async (req, res) => {
  try {
    const restaurateurId = resolveRestaurateurId(req);
    if (!restaurateurId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { id } = req.params;
    const { name, price, duration } = req.body;
    const service = await RestaurateurService.findOne({
      where: { id, restaurateurId },
    });
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    service.name = name;
    service.price = price;
    service.duration = duration;
    await service.save();
    res.json({ message: "Service updated successfully" });
  } catch (error) {
    console.error("Error updating restaurateurs service:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
export const addRestaurateursService = async (req, res) => {
  try {
    const restaurateurId = resolveRestaurateurId(req);
    if (!restaurateurId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, price, duration } = req.body;
    const newService = await RestaurateurService.create({
      name,
      price,
      duration,
      restaurateurId,
    });
    res.status(201).json(newService);
  } catch (error) {
    console.error("Error adding restaurateurs service:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
