import { items as Items } from "../../items.js";
import { recipes as Recipes } from "../../recipes.js";
import { ItemService } from "./itemService.js";

export class FoodService {
  static async getFoodData(req) {
    const foodList = await Promise.all(
      Object.entries(Items)
        .filter(([_, item]) => item.Food && !item.mod)
        .map(async ([itemId, itemData]) => {
          const foodItem = await ItemService.getItemDetails(itemId, req);

          return {
            id: itemId,
            name: foodItem.item.name,
            icon: foodItem.item.icon,
            originalName: foodItem.item.originalName,
            type: foodItem.item.type,
            tier: foodItem.item.tier,
            biomes: ItemService.getBiomes(foodItem.item),
            group: foodItem.item.group,
            station: ItemService.getStation(foodItem.item),
            stats: { ...foodItem.item.Food },
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
