import express from "express";
import { BiomeService } from "../services/biomeService.js";

const router = express.Router();

// Get all biomes
router.get("/", async (req, res, next) => {
  try {
    const result = await BiomeService.getBiomeData(req);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get specific biome by name
router.get("/:biomeName", async (req, res, next) => {
  try {
    const { biomeName } = req.params;
    const biome = await BiomeService.getBiomeByName(biomeName, true, req);

    if (!biome) {
      return res.status(404).json({ error: "Biome not found" });
    }

    res.json(biome);
  } catch (error) {
    next(error);
  }
});

export default router;
