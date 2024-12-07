import { items as Items } from "../../items.js";
import { recipes as Recipes } from "../../recipes.js";
import { ItemService } from "./itemService.js";

export class FoodService {
  static async getFoodData(req, params = {}) {
    const { type, biome } = params;

    const foodList = await Promise.all(
      Object.entries(Items)
        .filter(([_, item]) => {
          const matchesType = type ? item.type === type : true;
          const matchesBiome = biome
            ? ItemService.getBiomes(item).includes(biome)
            : true;
          return item.Food && !item.mod && matchesType && matchesBiome;
        })
        .map(async ([itemId, itemData]) => {
          const foodItem = await ItemService.getItemDetails(itemId, req);

          return {
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
        })
    );

    return {
      total: foodList.length,
      items: foodList,
    };
  }

  static async getFoodDetails(itemId, req) {
    const item = Items[itemId];

    if (!item || !item.Food) {
      return null;
    }

    return await ItemService.getItemDetails(item.id, req);
  }
}
