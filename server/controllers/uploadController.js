import TableModel from "../models/tableModel.js";
import fs from "node:fs";
import path from "node:path";

export const uploadTableImages = async (req, res) => {
  try {
    const { id } = req.params;
    const table = await TableModel.findByPk(id);

    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const existingImages = table.images || [];
    const newImages = req.files.map((file) => `/uploads/${file.filename}`);
    const updatedImages = [...existingImages, ...newImages];

    table.images = updatedImages;
    await table.save();

    return res.status(200).json({ images: updatedImages });
  } catch (error) {
    console.error("Error uploading table images:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteTableImage = async (req, res) => {
  try {
    const { id, filename } = req.params;
    const table = await TableModel.findByPk(id);

    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    const existingImages = table.images || [];
    const imagePath = `/uploads/${filename}`;
    const updatedImages = existingImages.filter((img) => img !== imagePath);

    if (updatedImages.length === existingImages.length) {
      return res.status(404).json({ message: "Image not found" });
    }

    const filePath = path.resolve("uploads", filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    table.images = updatedImages;
    await table.save();

    return res.status(200).json({ images: updatedImages });
  } catch (error) {
    console.error("Error deleting table image:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
