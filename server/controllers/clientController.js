import { Op } from "sequelize";
import { UsersModel } from "../models/model.js";
import { decodeToken } from "./authController.js";
import bcrypt from "bcrypt";
import {
  updateRestaurantCapacity,
  getRestaurantCapacity,
} from "../utils/tableCapacity.js";
import jwt from "jsonwebtoken";
import AppointmentModel from "../models/appointmentModel.js";
// GET all users

export const getUsers = async (req, res) => {
  try {
    const users = await UsersModel.findAll({
      attributes: [
        "id",
        "first_name",
        "last_name",
        "email",
        "phone_number",
        "role",
        "opening_time",
        "closing_time",
      ],
    });

    if (!users || users.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        count: 0,
      });
    }

    res.status(200).json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching users",
      error: error.message,
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const decodedToken = jwt.decode(req.headers.authorization.split(" ")[1]);
    const reqId = req.params.id;
    if (!decodeToken) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await UsersModel.findOne({
      where: {
        id: reqId,
        role: decodedToken.role,
      },
      attributes: [
        "id",
        "first_name",
        "last_name",
        "email",
        "phone_number",
        "role",
        "opening_time",
        "closing_time",
        "latitude",
        "longitude",
        "location_name",
      ],
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user",
      error: error.message,
    });
  }
};

// export const updateUser = async (req, res) => {
//   try {
//     const decodedToken = jwt.decode(req.headers.authorization.split(" ")[1]);
//     const tokenId = decodedToken.id;
//     const reqId = req.params.id;

//     if (!decodedToken) {
//       return res.status(401).json({
//         success: false,
//         message: "Unauthorized",
//       });
//     }

//     // Allow if admin or same user
//     if (
//       decodedToken.role !== "admin" &&
//       parseInt(tokenId) !== parseInt(reqId)
//     ) {
//       return res.status(403).json({
//         success: false,
//         message: "Forbidden: Access denied",
//       });
//     }

//     const user = await UsersModel.findOne({
//       where: { id: reqId },
//     });

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     const updatedUser = await UsersModel.update(req.body, {
//       where: { id: reqId },
//       returning: true,
//     });

//     res.json({
//       success: true,
//       message: "User updated successfully",
//       user: updatedUser[1][0],
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };
export const updateUser = async (req, res) => {
  try {
    const decodedToken = jwt.decode(req.headers.authorization.split(" ")[1]);
    const tokenId = decodedToken?.id;

    const reqId = req.params.id;

    if (!decodedToken) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Only allow admin or the same user
    if (
      decodedToken.role !== "admin" &&
      parseInt(tokenId) !== parseInt(reqId)
    ) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Access denied",
      });
    }

    const user = await UsersModel.findOne({ where: { id: reqId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updateData = { ...req.body };

    // Validate phone number if being updated
    if (updateData.phone_number != null && updateData.phone_number !== "") {
      const phoneStr = String(updateData.phone_number).replace(/\D/g, "");
      if (!/^(98|97)\d{8}$/.test(phoneStr)) {
        return res.status(400).json({
          success: false,
          message: "Phone number must be 10 digits starting with 98 or 97",
        });
      }
      updateData.phone_number = parseInt(phoneStr);
    }

    if (updateData.opening_time === "") {
      updateData.opening_time = null;
    }
    if (updateData.closing_time === "") {
      updateData.closing_time = null;
    }

    // 🔐 Hash password if it exists
    if (
      typeof updateData.password === "string" &&
      updateData.password.trim() !== ""
    ) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password.trim(), salt);
    } else {
      delete updateData.password;
    }

    const updatedUser = await UsersModel.update(updateData, {
      where: { id: reqId },
      returning: true,
    });

    res.json({
      success: true,
      message: "User updated successfully",
      user: updatedUser[1][0],
    });
  } catch (error) {
    console.error("UPDATE USER ERROR:", {
      message: error.message,
      stack: error.stack,
      raw: error,
      updateData:
        typeof updateData !== "undefined"
          ? updateData
          : "updateData not defined",
    });
  }
};
// export const deleteUser = async (req, res) => {
//   try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader) {
//       return res
//         .status(401)
//         .json({ success: false, message: "No token provided" });
//     }

//     const decodedToken = jwt.decode(authHeader.split(" ")[1]);
//     if (!decodedToken) {
//       return res.status(401).json({ success: false, message: "Unauthorized" });
//     }

//     const tokenId = decodedToken.id;
//     const reqId = req.params.id;

//     const user = await UsersModel.findOne({
//       where: { id: tokenId },
//       attributes: ["role"],
//     });

//     if (!user || user.role !== "admin") {
//       return res
//         .status(403)
//         .json({ success: false, message: "Access denied. Admins only." });
//     }

//     const userToDelete = await UsersModel.findOne({ where: { id: reqId } });
//     if (!userToDelete) {
//       return res
//         .status(404)
//         .json({ success: false, message: "User to delete not found" });
//     }

//     // ✅ Check if the user is referenced in appointments
//     const isReferenced = await AppointmentModel.findOne({
//       where: {
//         [Op.or]: [{ restaurantId: reqId }, { clientId: reqId }],
//       },
//     });

//     if (isReferenced) {
//       return res.status(400).json({
//         success: false,
//         message: "Cannot delete user with existing appointments.",
//       });
//     }

//     await UsersModel.destroy({ where: { id: reqId } });

//     res.json({ success: true, message: "User deleted successfully" });
//   } catch (error) {
//     console.error("DELETE USER ERROR:", error.message, error.stack);
//     res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: error.message,
//     });
//   }
// };

export const deleteUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }

    const decodedToken = jwt.decode(authHeader.split(" ")[1]);
    if (!decodedToken || !decodeToken.role === "admin") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const tokenId = decodedToken.id;
    const reqId = req.params.id;

    const user = await UsersModel.findOne({
      where: { id: tokenId },
      attributes: ["role"],
    });

    if (!user || user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Access denied. Admins only." });
    }

    const userToDelete = await UsersModel.findOne({ where: { id: reqId } });
    if (!userToDelete) {
      return res
        .status(404)
        .json({ success: false, message: "User to delete not found" });
    }

    // Update appointments status to 'cancelled' where restaurantId or clientId = reqId
    await AppointmentModel.update(
      { status: "cancelled" },
      {
        where: {
          [Op.or]: [{ id: reqId }, { id: reqId }],
        },
      },
    );

    // Now delete the user
    await UsersModel.destroy({ where: { id: reqId } });

    res.json({
      success: true,
      message: "User deleted successfully, related appointments cancelled",
    });
  } catch (error) {
    console.error("DELETE USER ERROR:", error.message, error.stack);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

/**
 * Update restaurateur seat capacity
 * POST /users/restaurateur/:id/capacity
 * Body: { seat_capacity: number }
 * Only restaurateurs can update their own capacity
 */
export const updateRestaurateurCapacity = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }

    const decodedToken = jwt.decode(authHeader.split(" ")[1]);
    if (!decodedToken) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const tokenId = decodedToken.id;
    const restaurateurId = req.params.id;
    const { seat_capacity } = req.body;

    // Validate input
    if (!seat_capacity || typeof seat_capacity !== "number") {
      return res.status(400).json({
        success: false,
        message: "seat_capacity must be a number",
      });
    }

    // Only restaurateurs can update their own capacity, or admin can update any
    if (
      decodedToken.role !== "admin" &&
      (parseInt(tokenId) !== parseInt(restaurateurId) ||
        decodedToken.role !== "restaurateurs")
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Only restaurateurs can update their capacity",
      });
    }

    const result = await updateRestaurantCapacity(
      UsersModel,
      restaurateurId,
      seat_capacity,
    );

    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    console.error("UPDATE CAPACITY ERROR:", error.message);
    res.status(400).json({
      success: false,
      message: error.message || "Error updating capacity",
    });
  }
};

/**
 * Get restaurateur seat capacity
 * GET /users/restaurateur/:id/capacity
 */
export const getRestaurateurCapacity = async (req, res) => {
  try {
    const restaurateurId = req.params.id;

    const result = await getRestaurantCapacity(UsersModel, restaurateurId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("GET CAPACITY ERROR:", error.message);
    res.status(404).json({
      success: false,
      message: error.message || "Error fetching capacity",
    });
  }
};
