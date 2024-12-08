import { items as Items } from "../../items.js";
import { loadLanguageFile } from "../app.js";
import { Biomes, BiomeDescriptions } from "../config/constants.js";
import { getIconPath, getBaseUrl } from "../utils/fileUtils.js";
import { FoodService } from "./foodService.js";
import { ItemService } from "./itemService.js";
import globalCache from "../utils/cacheManager.js";

export class BiomeService {
  static async getBiomeData(req) {
    const cacheKey = `biome_data`;
    const cached = globalCache.get(cacheKey);
    if (cached) return cached;

    const [enLang, itemsByBiome] = await Promise.all([
      loadLanguageFile(),
      this.preProcessItemsByBiome(),
    ]);

    if (!enLang) {
      throw new Error("Language files could not be loaded");
    }

    const baseUrl = getBaseUrl(req);
    const biomePromises = Object.entries(Biomes)
      .slice(1, 8)
      .map(async ([biomeId, biomeName]) => {
        const bosses = [];
        const biomeItems = itemsByBiome.get(biomeName) || [];

        // Process icons in parallel for each biome
        await Promise.all(
          biomeItems
            .filter(
              (item) => item.faction === "Boss" || item.group === "semiboss"
            )
            .map(async (item) => {
              const iconUrl = await getIconPath(
                req,
                item.type,
                item.iconId || item.id
              );
              bosses.push({
                item: {
                  ...item,
                  readableName: enLang[item.id] || item.name || item.id,
                  icon: iconUrl,
                },
                recipe: null,
              });
            })
        );

        // Handle special cases for boss lists
        const filteredBosses =
          biomeName === "Plains"
            ? bosses.slice(2)
            : biomeName === "BlackForest"
            ? bosses.slice(0, 2)
            : bosses;

        return {
          name: biomeName,
          description:
            BiomeDescriptions[biomeName] || "Description not available",
          bosses: {
            total: filteredBosses.length,
            items: filteredBosses,
          },
          imageUrl: `${baseUrl}/public/icons/bg/${biomeName}.webp`,
        };
      });

    const biomeData = await Promise.all(biomePromises);

    const result = {
      total: biomeData.length,
      items: biomeData,
    };

    globalCache.set(cacheKey, result, 3600); // Cache for 1 hour
    return result;
  }

  static async preProcessItemsByBiome() {
    const cacheKey = "items_by_biome_map";
    const cached = globalCache.get(cacheKey);
    if (cached) return cached;

    const biomeMap = new Map();

    for (const [key, item] of Object.entries(Items)) {
      const biomes = ItemService.getBiomes(item, true);
      for (const biomeName of biomes) {
        if (!biomeMap.has(biomeName)) {
          biomeMap.set(biomeName, []);
        }
        biomeMap.get(biomeName).push(item);
      }
    }

    globalCache.set(cacheKey, biomeMap, 3600);
    return biomeMap;
  }

  static async getBiomeByName(biomeName, extended, req) {
    const cacheKey = `biome_${biomeName}_${extended}`;
    const cached = globalCache.get(cacheKey);

    console.log(cached);
    if (cached) return cached;

    const allBiomes = await this.getBiomeData(req);
    const biome = allBiomes.items.find((biome) => biome.name === biomeName);

    if (!extended) {
      globalCache.set(cacheKey, biome, 3600);
      return biome;
    }
    if (!biome) return null;

    // Parallel fetch all required data
    const [biomeItemsResult, creatures, resources, food] = await Promise.all([
      ItemService.getItemsByBiome(biomeName, req, true),
      ItemService.getItemsByType("creatures", req),
      ItemService.getItemsByType("resources", req),
      FoodService.getFoodData(req, { biome: biomeName }),
    ]);

    // Pre-compute all Sets for O(1) lookups
    const biomeItemIds = new Set(biomeItemsResult.items.map((i) => i.item.id));
    const bossIds = new Set(biome.bosses.items.map((boss) => boss.item.id));
    const foodIds = new Set(food.items.map((f) => f.item.id));

    // Single-pass filtering
    const filteredCreatures = creatures.items.filter(
      (item) => biomeItemIds.has(item.item.id) && !bossIds.has(item.item.id)
    );

    const filteredResources = resources.items.filter(
      ({ item }) => !foodIds.has(item.id) && biomeItemIds.has(item.id)
    );

    const result = {
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

    globalCache.set(cacheKey, result, 3600);
    return result;
  }
}
