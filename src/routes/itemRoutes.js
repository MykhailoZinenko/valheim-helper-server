import express from "express";
import { ItemService } from "../services/itemService.js";

const router = express.Router();

// Get all items
router.get("/", async (req, res, next) => {
  try {
    const result = await ItemService.getAllItems(req);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/calculator", async (req, res, next) => {
  try {
    const result = await ItemService.getCalculatorItems(req);

    if (!result) {
      return res.status(404).json({ error: "Items not found" });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get specific item by ID
router.get("/:itemId", async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const result = await ItemService.getItemDetails(itemId, req);

    if (!result) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get items by type
router.get("/type/:type", async (req, res, next) => {
  try {
    const { type } = req.params;
    const result = await ItemService.getItemsByType(type, req);

    if (!result) {
      return res.status(404).json({ error: `Invalid type: ${type}` });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
