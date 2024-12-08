import { items as Items } from "../../items.js";
import { recipes as Recipes } from "../../recipes.js";
import { Biomes, dataCollections } from "../config/constants.js";
import { getIconPath } from "../utils/fileUtils.js";
import { loadLanguageFile } from "../app.js";
import globalCache from "../utils/cacheManager.js";

export class ItemService {
  // Pre-compute recipe lookup map
  static recipeMap = new Map(Recipes.map((recipe) => [recipe.item, recipe]));

  static getBiomes(item, initial = false) {
    const cacheKey = `biomes_${item.id}_${initial}`;
    const cached = globalCache.get(cacheKey);
    if (cached) return cached;

    let biomes = [];

    if (item.spawners) {
      item.spawners.forEach((spawner) => {
        if (initial && spawner.killed) return biomes;
        biomes = [...new Set([...biomes, ...spawner.biomes])];
      });
    } else if (item.grow) {
      item.grow.forEach((grow) => {
        biomes = [...new Set([...biomes, ...grow.locations])];
      });
    } else if (item.Plant) {
      biomes = [...new Set([...biomes, ...item.Plant.biomes])];
    }

    if (biomes.length === 0) {
      let highestBiome = -1;
      const recipe = this.recipeMap.get(item.id);

      if (recipe) {
        for (let key in recipe.materials) {
          const material = Items[key];
          if (material) {
            highestBiome = Math.max(highestBiome, material.tier);
          }
        }
        if (highestBiome !== -1) {
          biomes = [Biomes[highestBiome]];
        }
      } else if (item.tier !== undefined) {
        biomes = [Biomes[item.tier]];
      }
    }

    globalCache.set(cacheKey, biomes, 3600); // Cache for 1 hour
    return biomes;
  }

  static getStation(item) {
    const cacheKey = `station_${item.id}`;
    const cached = globalCache.get(cacheKey);
    if (cached) return cached;

    const station =
      item.recipe?.station ||
      this.recipeMap.get(item.id)?.source?.station ||
      "";

    globalCache.set(cacheKey, station, 3600);
    return station;
  }

  static async getItemDetails(itemId, req) {
    const cacheKey = `item_details_${itemId}`;
    const cached = globalCache.get(cacheKey);
    if (cached) return cached;

    const [enLang, iconUrl] = await Promise.all([
      loadLanguageFile(),
      getIconPath(req, Items[itemId]?.type, Items[itemId]?.iconId || itemId),
    ]);

    const item = Items[itemId];
    if (!item || item?.mod) return null;

    const result = {
      item: {
        ...item,
        readableName: enLang[itemId] || item.name || itemId,
        originalName: item.id,
        icon: iconUrl,
      },
      recipe: this.recipeMap.get(itemId) || null,
    };

    globalCache.set(cacheKey, result, 3600);
    return result;
  }

  static async getAllItems(req) {
    const cacheKey = `all_items`;
    const cached = globalCache.get(cacheKey);
    if (cached) return cached;

    const enLang = await loadLanguageFile();
    if (!enLang) {
      throw new Error("Language files could not be loaded");
    }

    // Pre-filter valid items
    const validItems = Object.entries(Items).filter(([_, item]) => !item.mod);

    // Process items in batches to avoid memory pressure
    const batchSize = 50;
    const itemsList = [];

    for (let i = 0; i < validItems.length; i += batchSize) {
      const batch = validItems.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async ([itemId, itemData]) => {
          const iconUrl = await getIconPath(
            req,
            itemData.type,
            itemData.iconId || itemId
          );
          const biomes = this.getBiomes(itemData);

          return {
            id: itemId,
            readableName: enLang[itemId] || itemData.name || itemId,
            originalName: itemId,
            type: itemData.type,
            icon: iconUrl,
            tier: itemData.tier,
            biomes,
            group: itemData.group || "",
            station: this.getStation(itemData),
          };
        })
      );
      itemsList.push(...batchResults);
    }

    const result = {
      total: itemsList.length,
      items: itemsList,
    };

    globalCache.set(cacheKey, result, 1800); // Cache for 30 minutes
    return result;
  }

  static async getCalculatorItems(req) {
    const cacheKey = `calculator_items`;
    const cached = globalCache.get(cacheKey);
    if (cached) return cached;

    const enLang = await loadLanguageFile();
    if (!enLang) {
      throw new Error("Language files could not be loaded");
    }

    const excludedTypes = new Set([
      "piece",
      "creature",
      "object",
      "spawner",
      "effect",
      "fish",
    ]);

    const validItems = Object.entries(Items).filter(
      ([_, item]) => !item.mod && !excludedTypes.has(item.type) && !item.Food
    );

    // Process items in batches
    const batchSize = 50;
    const itemsList = [];

    for (let i = 0; i < validItems.length; i += batchSize) {
      const batch = validItems.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async ([itemId, itemData]) => {
          const [iconUrl, biomes] = await Promise.all([
            getIconPath(req, itemData.type, itemData.iconId || itemId),
            Promise.resolve(this.getBiomes(itemData)),
          ]);

          return {
            item: {
              id: itemId,
              readableName: enLang[itemId] || itemData.name || itemId,
              originalName: itemId,
              type: itemData.type,
              icon: iconUrl,
              tier: itemData.tier,
              biomes,
              group: itemData.group || "",
              station: this.getStation(itemData),
              set: itemData.set,
            },
            recipe: this.recipeMap.get(itemId) || null,
          };
        })
      );
      itemsList.push(...batchResults);
    }

    const result = {
      total: itemsList.length,
      items: itemsList,
    };

    globalCache.set(cacheKey, result, 1800);
    return result;
  }

  static async getItemsByType(typeIdentifier, req) {
    const cacheKey = `items_by_type_${typeIdentifier}`;
    const cached = globalCache.get(cacheKey);
    if (cached) return cached;

    const type = dataCollections[typeIdentifier];
    if (!type) return null;

    const validItems = Object.values(Items).filter(
      (item) => item.type === type && !item.mod
    );

    const items = await Promise.all(
      validItems.map((item) => this.getItemDetails(item.id, req))
    );

    const result = {
      total: items.length,
      typeIdentifier,
      type,
      items,
    };

    globalCache.set(cacheKey, result, 1800);
    return result;
  }

  static async getItemsByBiome(biome, req, initial = false) {
    const cacheKey = `items_by_biome_${biome}_${initial}`;
    const cached = globalCache.get(cacheKey);
    if (cached) return cached;

    // Pre-filter items by biome
    const validItems = Object.values(Items).filter((item) => {
      const biomes = this.getBiomes(item, initial);
      return biomes?.includes(biome) && !item.mod;
    });

    const items = await Promise.all(
      validItems.map((item) => this.getItemDetails(item.id, req))
    );

    const result = {
      total: items.length,
      biome,
      items,
    };

    globalCache.set(cacheKey, result, 1800);
    return result;
  }
}
