import { items as Items } from "../../items.js";
import { recipes as Recipes } from "../../recipes.js";
import { Biomes, dataCollections } from "../config/constants.js";
import { loadJsonFile, getIconPath } from "../utils/fileUtils.js";

export class ItemService {
  static getBiomes(item, initial = false) {
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
      const recipe = Recipes.find((recipe) => recipe.item === item.id);

      if (recipe) {
        for (let key in recipe.materials) {
          const material = Items[key];
          if (material) {
            highestBiome =
              highestBiome < material.tier ? material.tier : highestBiome;
          }
        }
        if (highestBiome !== -1) {
          biomes = [Biomes[highestBiome]];
        }
      } else if (item.tier !== undefined) {
        biomes = [Biomes[item.tier]];
      }
    }
    return biomes;
  }

  static getStation(item) {
    if (item.recipe) return item.recipe.station;
    const recipe = Recipes.find((recipe) => recipe.item === item.id);
    return recipe && recipe.source ? recipe.source.station : "";
  }

  static async getItemDetails(itemId, req) {
    const enLang = await loadJsonFile("public/lang/en.json");
    if (!enLang) {
      throw new Error("Language files could not be loaded");
    }

    const item = Items[itemId];

    if (!item || item?.mod) return null;

    const recipe = Recipes.find((recipe) => recipe.item === itemId);
    const iconUrl = await getIconPath(req, item.type, item.iconId || itemId);

    return {
      item: {
        ...item,
        name: enLang[itemId] || item.name || itemId,
        icon: iconUrl,
      },
      recipe: recipe || null,
    };
  }

  static async getAllItems(req) {
    const enLang = await loadJsonFile("public/lang/en.json");
    if (!enLang) {
      throw new Error("Language files could not be loaded");
    }

    const itemsList = await Promise.all(
      Object.entries(Items)
        .filter(([_, item]) => !item.mod)
        .map(async ([itemId, itemData]) => {
          const iconUrl = await getIconPath(
            req,
            itemData.type,
            itemData.iconId || itemId
          );
          const biomes = this.getBiomes(itemData);
          const group = itemData.group || "";
          const station = this.getStation(itemData);

          return {
            id: itemId,
            name: enLang[itemId] || itemData.name || itemId,
            originalName: itemId,
            type: itemData.type,
            icon: iconUrl,
            tier: itemData.tier,
            biomes: biomes,
            group: group,
            station: station,
          };
        })
    );

    return {
      total: itemsList.length,
      items: itemsList,
    };
  }

  static async getCalculatorItems(req) {
    const enLang = await loadJsonFile("public/lang/en.json");
    if (!enLang) {
      throw new Error("Language files could not be loaded");
    }

    const itemsList = await Promise.all(
      Object.entries(Items)
        .filter(
          ([_, item]) =>
            !item.mod &&
            !(
              item.type === "piece" ||
              item.type === "creature" ||
              item.type === "object" ||
              item.type === "spawner" ||
              item.type === "effect" ||
              item.type === "fish"
            ) &&
            !item.Food
        )
        .map(async ([itemId, itemData]) => {
          const iconUrl = await getIconPath(
            req,
            itemData.type,
            itemData.iconId || itemId
          );
          const recipe = Recipes.find((recipe) => recipe.item === itemId);
          const biomes = this.getBiomes(itemData);
          const group = itemData.group || "";
          const station = this.getStation(itemData);

          return {
            id: itemId,
            name: enLang[itemId] || itemData.name || itemId,
            originalName: itemId,
            type: itemData.type,
            icon: iconUrl,
            tier: itemData.tier,
            biomes: biomes,
            group: group,
            station: station,
            set: itemData.set,
            recipe: recipe || null,
          };
        })
    );

    return {
      total: itemsList.length,
      items: itemsList,
    };
  }

  static async getItemsByType(type) {
    const typeIdentifier = dataCollections[type];

    if (!typeIdentifier) return null;

    const itemsList = Object.entries(Items)
      .filter(([_, item]) => item.type === typeIdentifier && !item.mod)
      .reduce((acc, [id, item]) => {
        acc[id] = item;
        return acc;
      }, {});

    return {
      type,
      typeIdentifier,
      itemsList,
    };
  }

  static async getItemsByBiome(biome, initial = false) {
    const biomeItems = Object.entries(Items)
      .filter(([_, item]) => {
        const biomes = this.getBiomes(item, initial);

        if (!biomes || !biomes.length > 0) return false;

        return (biomes ?? []).includes(biome) && !item.mod;
      })
      .reduce((acc, [id, item]) => {
        acc[id] = item;
        return acc;
      }, {});

    return {
      biome,
      biomeItems,
    };
  }
}
