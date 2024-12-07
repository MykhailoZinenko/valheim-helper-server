import { items as Items } from "../../items.js";
import { Biomes, BiomeDescriptions } from "../config/constants.js";
import { loadJsonFile, getIconPath, getBaseUrl } from "../utils/fileUtils.js";
import { FoodService } from "./foodService.js";
import { ItemService } from "./itemService.js";

export class BiomeService {
  static async getBiomeData(req) {
    const enLang = await loadJsonFile("public/lang/en.json");
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

    const biomeItems = await ItemService.getItemsByBiome(biomeName, req, true);

    let creatures = await ItemService.getItemsByType("creatures", req);

    creatures = creatures.items.filter((item) => {
      return biomeItems.items.some((i) => {
        return (
          i.item.id === item.item.id &&
          !biome.bosses.items.map((boss) => boss.item.id).includes(item.item.id)
        );
      });
    });

    let resources = await ItemService.getItemsByType("resources", req);

    const food = await FoodService.getFoodData(req, { biome: biomeName });

    resources = resources.items.filter(({ item }) => {
      return (
        !food.items.some((f) => f.item.id === item.id) &&
        biomeItems.items.some((i) => i.item.id === item.id)
      );
    });

    return {
      ...biome,
      creatures: {
        total: creatures.length,
        items: creatures,
      },
      resources: {
        total: resources.length,
        items: resources,
      },
      food,
    };
  }
}
