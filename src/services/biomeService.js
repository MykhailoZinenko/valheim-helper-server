import { items as Items } from "../../items.js";
import { Biomes, BiomeDescriptions } from "../config/constants.js";
import { loadJsonFile, getIconPath, getBaseUrl } from "../utils/fileUtils.js";
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
            const biomes = ItemService.getBiomes(item);

            if (biomes.includes(biomeName)) {
              const iconUrl = await getIconPath(
                req,
                item.type,
                item.iconId || item.id
              );

              if (item.faction === "Boss" || item.group === "semiboss") {
                bosses.push({
                  id: item.id,
                  name: enLang[item.id] || item.name || item.id,
                  icon: iconUrl,
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
            bosses: filteredBosses,
            imageUrl,
          };
        })
    );

    return {
      total: biomeData.length,
      biomes: biomeData,
    };
  }

  static async getBiomeByName(biomeName, req) {
    const allBiomes = await this.getBiomeData(req);
    return allBiomes.biomes.find((biome) => biome.name === biomeName);
  }
}
