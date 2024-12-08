import { items as Items } from "../../items.js";
import { recipes as Recipes } from "../../recipes.js";
import { ItemService } from "./itemService.js";
import globalCache from "../utils/cacheManager.js";

export class FoodService {
  static async getFoodData(req, params = {}) {
    const { type, biome } = params;
    const cacheKey = `food_data_${type || "all"}_${biome || "all"}`;

    // Try to get from cache first
    const cached = globalCache.get(cacheKey);
    if (cached) return cached;

    // Pre-filter food items to avoid unnecessary processing
    const foodItems = this._getFilteredFoodItems(type, biome);

    // Process items in batches to avoid memory spikes
    const BATCH_SIZE = 50;
    const foodList = [];

    for (let i = 0; i < foodItems.length; i += BATCH_SIZE) {
      const batch = foodItems.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(([itemId, itemData]) => this._processFoodItem(itemId, req))
      );
      foodList.push(...batchResults.filter(Boolean));
    }

    const result = {
      total: foodList.length,
      items: foodList,
    };

    // Cache the results
    globalCache.set(cacheKey, result, 3600); // Cache for 1 hour
    return result;
  }

  static async getFoodDetails(itemId, req) {
    const cacheKey = `food_details_${itemId}`;

    // Try to get from cache first
    const cached = globalCache.get(cacheKey);
    if (cached) return cached;

    const item = Items[itemId];
    if (!item || !item.Food) {
      return null;
    }

    const details = await ItemService.getItemDetails(item.id, req);
    if (details) {
      globalCache.set(cacheKey, details, 3600);
    }
    return details;
  }

  // Private helper methods
  static _getFilteredFoodItems(type, biome) {
    const cacheKey = `filtered_food_${type || "all"}_${biome || "all"}`;
    const cached = globalCache.get(cacheKey);
    if (cached) return cached;

    const filtered = Object.entries(Items).filter(([_, item]) => {
      const matchesType = type ? item.type === type : true;
      const matchesBiome = biome
        ? ItemService.getBiomes(item).includes(biome)
        : true;
      return item.Food && !item.mod && matchesType && matchesBiome;
    });

    globalCache.set(cacheKey, filtered, 3600);
    return filtered;
  }

  static async _processFoodItem(itemId, req) {
    const cacheKey = `processed_food_${itemId}`;
    const cached = globalCache.get(cacheKey);
    if (cached) return cached;

    try {
      const foodItem = await ItemService.getItemDetails(itemId, req);
      if (!foodItem) return null;

      const processedItem = {
        item: {
          id: itemId,
          readableName: foodItem.item.readableName,
          icon: foodItem.item.icon,
          originalName: foodItem.item.originalName,
          type: foodItem.item.type,
          tier: foodItem.item.tier,
          biomes: ItemService.getBiomes(foodItem.item),
          group: foodItem.item.group,
          station: ItemService.getStation(foodItem.item),
          Food: { ...foodItem.item.Food },
        },
        recipe: foodItem.recipe,
      };

      globalCache.set(cacheKey, processedItem, 3600);
      return processedItem;
    } catch (error) {
      console.error(`Error processing food item ${itemId}:`, error);
      return null;
    }
  }
}
