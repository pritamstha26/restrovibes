import { UsersModel } from "../models/model.js";
import AppointmentModel from "../models/appointmentModel.js";
import {
  findNearbyRestaurateurs,
  calculateDistance,
} from "../utils/location.js";
import { decodeToken } from "./authController.js";
import { Op } from "sequelize";

/**
 * Get nearby restaurateurs based on provided coordinates
 * @route GET /api/location/nearby-restaurateurs
 */
export const getNearbyRestaurateurs = async (req, res) => {
  try {
    const { latitude, longitude, maxDistance } = req.query;
    const clientLat = parseFloat(latitude);
    const clientLng = parseFloat(longitude);
    const maxDistanceKm = maxDistance != null ? parseFloat(maxDistance) : null;
    const hasValidCoordinates = Number.isFinite(clientLat) && Number.isFinite(clientLng);

    let excludeUserId = null;
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      const decodedToken = decodeToken(token);
      if (decodedToken && decodedToken.role === "restaurateurs") {
        excludeUserId = decodedToken.id;
      }
    }

    const whereClause = {
      role: "restaurateurs",
      active_status: true,
    };

    if (excludeUserId) {
      whereClause.id = { [Op.ne]: excludeUserId };
    }

    const restaurateurs = await UsersModel.findAll({
      where: whereClause,
      attributes: [
        "id",
        "first_name",
        "last_name",
        "email",
        "phone_number",
        "latitude",
        "longitude",
        "location_name",
        "seat_capacity",
      ],
      raw: true,
    });

    let withDistance;
    if (hasValidCoordinates) {
      withDistance = findNearbyRestaurateurs(
        clientLat,
        clientLng,
        restaurateurs,
        maxDistanceKm,
      );

      // Estimate driving duration using average city speed (30 km/h)
      withDistance = withDistance.map((r) => ({
        ...r,
        duration: r.distance != null ? Math.round((r.distance / 30) * 3600) : null,
      }));
    } else {
      withDistance = restaurateurs.map((r) => ({ ...r, distance: null }));
    }

    const nearbyWithOccupancy = await Promise.all(
      withDistance.map(async (restaurateur) => {
        const seatCapacity = restaurateur.seat_capacity || 10;
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        const activeAppointments = await AppointmentModel.count({
          where: {
            restaurateurId: restaurateur.id,
            status: { [Op.in]: ["pending", "accepted", "in_progress"] },
            date: { [Op.gte]: startOfToday, [Op.lte]: endOfToday },
          },
        });

        return {
          ...restaurateur,
          seat_capacity: seatCapacity,
          active_appointments: activeAppointments,
          occupancy_rate: Number(
            Math.min(activeAppointments / seatCapacity, 1).toFixed(2),
          ),
          seats_remaining: Math.max(seatCapacity - activeAppointments, 0),
        };
      }),
    );

    return res.status(200).json({
      success: true,
      count: nearbyWithOccupancy.length,
      data: nearbyWithOccupancy,
    });
  } catch (error) {
    console.error("Error finding nearby restaurateurs:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while finding nearby restaurateurs",
      error: error.message,
    });
  }
};

/**
 * Update user's location
 * @route PUT /api/location/update
 */
export const updateUserLocation = async (req, res) => {
  try {
    // Get user from token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decodedToken = decodeToken(token);
    if (!decodedToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = decodedToken.id;
    const { latitude, longitude, location_name } = req.body;

    // Validate required parameters
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    // Convert to numbers
    const userLat = parseFloat(latitude);
    const userLng = parseFloat(longitude);

    // Validate parameters
    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid parameters. Latitude and longitude must be valid numbers.",
      });
    }

    // Update user location
    await UsersModel.update(
      {
        latitude: userLat,
        longitude: userLng,
        location_name: location_name || null,
      },
      { where: { id: userId } },
    );

    return res.status(200).json({
      success: true,
      message: "Location updated successfully",
    });
  } catch (error) {
    console.error("Error updating user location:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating location",
      error: error.message,
    });
  }
};

/**
 * Get user's current location
 * @route GET /api/location/current
 */
export const getCurrentLocation = async (req, res) => {
  try {
    // Get user from token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decodedToken = decodeToken(token);
    if (!decodedToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = decodedToken.id;

    // Get user's location
    const user = await UsersModel.findByPk(userId, {
      attributes: ["id", "latitude", "longitude", "location_name"],
      raw: true,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        latitude: user.latitude,
        longitude: user.longitude,
        location_name: user.location_name,
      },
    });
  } catch (error) {
    console.error("Error getting user location:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while getting location",
      error: error.message,
    });
  }
};

/**
 * Get distance between two users
 * @route GET /api/location/distance/:userId
 */
export const getDistanceToUser = async (req, res) => {
  try {
    // Get user from token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decodedToken = decodeToken(token);
    if (!decodedToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const currentUserId = decodedToken.id;
    const { userId } = req.params;

    // Get both users' locations
    const currentUser = await UsersModel.findByPk(currentUserId, {
      attributes: ["id", "latitude", "longitude"],
      raw: true,
    });

    const otherUser = await UsersModel.findByPk(userId, {
      attributes: [
        "id",
        "first_name",
        "last_name",
        "latitude",
        "longitude",
        "location_name",
      ],
      raw: true,
    });

    if (!currentUser || !otherUser) {
      return res.status(404).json({
        success: false,
        message: "One or both users not found",
      });
    }

    // Check if both users have location data
    if (
      !Number.isFinite(Number(currentUser.latitude)) ||
      !Number.isFinite(Number(currentUser.longitude)) ||
      !Number.isFinite(Number(otherUser.latitude)) ||
      !Number.isFinite(Number(otherUser.longitude))
    ) {
      return res.status(400).json({
        success: false,
        message: "Location data missing for one or both users",
      });
    }

    // Calculate distance using haversine
    const distance = calculateDistance(
      Number(currentUser.latitude),
      Number(currentUser.longitude),
      Number(otherUser.latitude),
      Number(otherUser.longitude),
    );

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: otherUser.id,
          name: `${otherUser.first_name} ${otherUser.last_name}`,
          location_name: otherUser.location_name,
        },
        distance: parseFloat(distance.toFixed(2)),
        duration: Math.round((distance / 30) * 3600),
        unit: "km",
      },
    });
  } catch (error) {
    console.error("Error calculating distance:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while calculating distance",
      error: error.message,
    });
  }
};

/**
 * Debug endpoint to check restaurateurs' location status
 * @route GET /api/location/debug/restaurateurs
 */
export const debugRestaurateurs = async (req, res) => {
  try {
    const allRestaurateurs = await UsersModel.findAll({
      where: { role: "restaurateurs" },
      attributes: [
        "id",
        "first_name",
        "last_name",
        "email",
        "latitude",
        "longitude",
        "location_name",
      ],
      raw: true,
    });

    const withLocation = allRestaurateurs.filter(
      (r) => r.latitude && r.longitude,
    );
    const withoutLocation = allRestaurateurs.filter(
      (r) => !r.latitude || !r.longitude,
    );

    return res.status(200).json({
      success: true,
      total: allRestaurateurs.length,
      withLocation: withLocation.length,
      withoutLocation: withoutLocation.length,
      data: {
        withLocation,
        withoutLocation,
      },
    });
  } catch (error) {
    console.error("Error debugging restaurateurs:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};
