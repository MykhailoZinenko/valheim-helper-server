import express from "express";
import { FoodService } from "../services/foodService.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const result = await FoodService.getFoodData(req);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/:foodId", async (req, res, next) => {
  try {
    const { foodId } = req.params;
    const result = await FoodService.getFoodDetails(foodId, req);

    if (!result) {
      return res.status(404).json({ error: "Food not found" });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
