import { items as Items } from "../../items.js";
import { loadLanguageFile } from "../app.js";
import { Biomes, BiomeDescriptions } from "../config/constants.js";
import { getIconPath, getBaseUrl } from "../utils/fileUtils.js";
import { FoodService } from "./foodService.js";
import { ItemService } from "./itemService.js";

export class BiomeService {
  static async getBiomeData(req) {
    const enLang = await loadLanguageFile();
    if (!enLang) {
      throw new Error("Language files could not be loaded");
    }

    const biomeData = await Promise.all(
      Object.entries(Biomes)
        .slice(1, 8)
        .map(async ([biomeId, biomeName]) => {
          const bosses = [];

          for (const [key, item] of Object.entries(Items)) {
            const biomes = ItemService.getBiomes(item, true);

            if (biomes.includes(biomeName)) {
              const iconUrl = await getIconPath(
                req,
                item.type,
                item.iconId || item.id
              );

              if (item.faction === "Boss" || item.group === "semiboss") {
                bosses.push({
                  item: {
                    ...item,
                    readableName: enLang[item.id] || item.name || item.id,
                    icon: iconUrl,
                  },
                  recipe: null,
                });
              }
            }
          }

          // Handle special cases for boss lists
          const filteredBosses =
            biomeName === "Plains"
              ? bosses.slice(2)
              : biomeName === "BlackForest"
              ? bosses.slice(0, 2)
              : bosses;

          const imageUrl = `${getBaseUrl(
            req
          )}/public/icons/bg/${biomeName}.webp`;

          return {
            name: biomeName,
            description:
              BiomeDescriptions[biomeName] || "Description not available",
            bosses: {
              total: filteredBosses.length,
              items: filteredBosses,
            },
            imageUrl,
          };
        })
    );

    return {
      total: biomeData.length,
      items: biomeData,
    };
  }

  static async getBiomeByName(biomeName, extended, req) {
    const allBiomes = await this.getBiomeData(req);
    const biome = allBiomes.items.find((biome) => biome.name === biomeName);

    if (!extended) return biome;
    if (!biome) return null;

    // Create indexes for faster lookups
    const biomeItemsResult = await ItemService.getItemsByBiome(
      biomeName,
      req,
      true
    );
    const biomeItemIds = new Set(biomeItemsResult.items.map((i) => i.item.id));
    const bossIds = new Set(biome.bosses.items.map((boss) => boss.item.id));

    // Get creatures with optimized filtering
    const creatures = await ItemService.getItemsByType("creatures", req);
    const filteredCreatures = creatures.items.filter(
      (item) => biomeItemIds.has(item.item.id) && !bossIds.has(item.item.id)
    );

    // Get resources with optimized filtering
    const resources = await ItemService.getItemsByType("resources", req);
    const food = await FoodService.getFoodData(req, { biome: biomeName });
    const foodIds = new Set(food.items.map((f) => f.item.id));

    const filteredResources = resources.items.filter(
      ({ item }) => !foodIds.has(item.id) && biomeItemIds.has(item.id)
    );

    return {
      ...biome,
      creatures: {
        total: filteredCreatures.length,
        items: filteredCreatures,
      },
      resources: {
        total: filteredResources.length,
        items: filteredResources,
      },
      food,
    };
  }
}
