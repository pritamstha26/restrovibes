import bcrypt from "bcrypt";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import { UsersModel } from "../models/model.js";
import { sendPasswordReset } from "../utils/email.js";

const RESET_REQUEST_COOLDOWN_MS = 60 * 1000;
const resetRequestTimes = new Map();

export const register = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    let isAdmin = false;

    // Check if requester is admin by decoding token
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.decode(token);

      const adminUser = await UsersModel.findOne({ where: { id: decoded.id } });
      if (adminUser?.role === "admin") {
        isAdmin = true;
      }
    }

    // Extract password and hash it
    const password = req.body.password;
    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if email already exists
    const existingUser = await UsersModel.findOne({
      where: { email: req.body.email },
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ exists: true, message: "Email already registered" });
    }

    let role = "client"; // default role

    const allowedRoles = isAdmin
      ? ["client", "restaurateurs", "admin"]
      : ["client", "restaurateurs"];

    if (req.body.role) {
      if (allowedRoles.includes(req.body.role)) {
        role = req.body.role;
      } else {
        return res.status(400).json({ message: "Invalid role specified" });
      }
    }

    const parseCoordinate = (value) => {
      if (value === undefined || value === null || value === "") {
        return null;
      }

      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const userData = {
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      email: req.body.email,
      phone_number: req.body.phone_number || null,
      password: hashedPassword,
      role,
      latitude: role === "restaurateurs" ? parseCoordinate(req.body.latitude) : null,
      longitude: role === "restaurateurs" ? parseCoordinate(req.body.longitude) : null,
      location_name: role === "restaurateurs" ? req.body.location_name || null : null,
      opening_time: role === "restaurateurs" ? req.body.opening_time || "09:00:00" : null,
      closing_time: role === "restaurateurs" ? req.body.closing_time || "18:00:00" : null,
      seat_capacity:
        role === "restaurateurs" ? req.body.seat_capacity || 10 : null,
    };

    // Save the new user
    const user = await UsersModel.create(userData);

    // Response depends on who registered
    if (!isAdmin) {
      // Public registration returns token
      const token = createToken(user);
      user.refresh_token_version = (user.refresh_token_version || 0) + 1;
      const refreshToken = createRefreshToken(user);
      user.refresh_token = refreshToken;
      await user.save();
      return res.status(201).json({
        message: "User registered successfully",
        access_token: token,
        refresh_token: refreshToken,
      });
    }

    // Admin registration returns user info (no token)
    return res.status(201).json({
      message: "User created successfully by admin",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    });
  } catch (error) {
    console.error("Error during registration:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await UsersModel.findOne({ where: { email, role } });

    if (!user) {
      return res.status(404).json({ message: "Invalid user" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

const token = createToken(user);
user.refresh_token_version = (user.refresh_token_version || 0) + 1;
const refreshToken = createRefreshToken(user);
user.refresh_token = refreshToken;
await user.save();
return res.status(200).json({
  message: "Login successful",
  access_token: token,
  refresh_token: refreshToken,
});
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );
};

export const createRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, tokenVersion: user.refresh_token_version || 0 },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
};

export const decodeToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      );
    } catch (err) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await UsersModel.findOne({ where: { id: decoded.id } });

    if (!user || !user.refresh_token || user.refresh_token !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    if (decoded.tokenVersion !== user.refresh_token_version) {
      return res.status(401).json({ message: "Token version mismatch" });
    }

    const newAccessToken = createToken(user);
    const newRefreshToken = createRefreshToken(user);

    user.refresh_token = newRefreshToken;
    await user.save();

    return res.status(200).json({
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    });
  } catch (error) {
    console.error("Error in refreshToken:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const user = await UsersModel.findOne({ where: { refresh_token: refreshToken } });
      if (user) {
        user.refresh_token = null;
        user.refresh_token_version += 1;
        await user.save();
      }
    }

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error in logout:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const lastRequest = resetRequestTimes.get(email);
    const isDevelopmentEmailMode =
      (process.env.EMAIL_MODE || "dev").toLowerCase() === "dev";
    if (
      !isDevelopmentEmailMode &&
      lastRequest &&
      Date.now() - lastRequest < RESET_REQUEST_COOLDOWN_MS
    ) {
      return res.status(200).json({
        message: "If the email exists, a password reset link has been sent",
      });
    }
    resetRequestTimes.set(email, Date.now());

    const user = await UsersModel.findOne({ where: { email } });

    if (!user) {
      return res.status(200).json({ message: "If the email exists, a password reset link has been sent" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.reset_token = resetToken;
    user.reset_token_expiry = resetTokenExpiry;
    await user.save();

    try {
      await sendPasswordReset(email, resetToken);
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
    }

    const response = {
      message: "If the email exists, a password reset link has been sent",
    };

    if (isDevelopmentEmailMode) {
      response.resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res
        .status(400)
        .json({ message: "Token and new password are required" });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const user = await UsersModel.findOne({
      where: {
        reset_token: token,
        reset_token_expiry: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.reset_token = null;
    user.reset_token_expiry = null;
    await user.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
