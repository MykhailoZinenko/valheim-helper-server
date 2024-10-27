import express from "express";
import path from "path";
import fs from "fs/promises";
import cors from "cors";
import compression from "compression";

import { items as Items } from "./items.js";
import { recipes as Recipes } from "./recipes.js";

const app = express();

const dataCollections = {
  armors: "armor",
  arrows: "arrow",
  bolts: "bolt",
  missiles: "missile",
  bombs: "bomb",
  shields: "shield",
  buildings: "piece",
  creatures: "creature",
  effects: "effect",
  fishes: "fish",
  objects: "object",
  resources: "item",
  spawners: "spawner",
  tools: "tool",
  ships: "ship",
  sieges: "siege",
  carts: "cart",
  weapons: "weapon",
};

const Biomes = {
  0: "Meadows",
  1: "Meadows",
  2: "BlackForest",
  3: "Swamp",
  4: "Mountain",
  5: "Plains",
  6: "Mistlands",
  7: "Ashlands",
  8: "Ocean",
  9: "DeepNorth",
};

app.use(compression());

app.use("/public", express.static(path.join(import.meta.dirname, "../public")));
app.use(cors());

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.json({
    message: "API is running",
    availableEndpoints: Object.keys(dataCollections).map(
      (type) => `/api/${type}/:itemId`
    ),
  });
});

const getItemsByType = (type) => {
  const typeIdentifier = dataCollections[type];
  if (!typeIdentifier) return [];

  return Object.entries(Items)
    .filter(([_, item]) => item.type === typeIdentifier)
    .reduce((acc, [id, item]) => {
      acc[id] = item;
      return acc;
    }, {});
};

app.get("/api/items/:itemId", async (req, res) => {
  const { itemId } = req.params;

  const enLang = await loadJsonFile("public/lang/en.json");

  if (!enLang) {
    throw new Error("Language files could not be loaded");
  }

  const item = Items[itemId];

  if (item) {
    const recipe = Recipes.find((recipe) => recipe.item === itemId);

    const iconUrl = await getIconPath(req, item.type, item.iconId || itemId);

    res.json({
      item: {
        ...item,
        name: enLang[itemId] || item.name || itemId,
        icon: iconUrl,
      },
      recipe: recipe || null,
    });
  } else {
    res.status(404).json({ error: "Item not found" });
  }
});

const getBiomes = (item) => {
  let biomes = [];

  item.spawners
    ? item.spawners.forEach((spawner) => {
        biomes = [...new Set([...biomes, ...spawner.biomes])];
      })
    : item.grow
    ? item.grow.forEach((grow) => {
        biomes = [...new Set([...biomes, ...grow.locations])];
      })
    : item.Plant
    ? (biomes = biomes = [...new Set([...biomes, ...item.Plant.biomes])])
    : (biomes = []);

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
    } else {
      item.tier ? (biomes = [Biomes[item.tier]]) : (biomes = []);
    }
  }
  return biomes;
};

const getStation = (item) => {
  if (item.recipe) return item.recipe.station;

  const recipe = Recipes.find((recipe) => recipe.item === item.id);

  return recipe && recipe.source ? recipe.source.station : "";
};

app.get("/api/items", async (req, res) => {
  try {
    const enLang = await loadJsonFile("public/lang/en.json");

    if (!enLang) {
      throw new Error("Language files could not be loaded");
    }

    const itemsList = await Promise.all(
      Object.entries(Items).map(async ([itemId, itemData]) => {
        const iconUrl = await getIconPath(
          req,
          itemData.type,
          itemData.iconId || itemId
        );

        const biomes = getBiomes(itemData);
        const group = itemData.group ? itemData.group : "";
        const station = getStation(itemData);

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

    res.json({
      total: itemsList.length,
      items: itemsList,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Failed to process search request" });
  }
});

app.get("/api/:type", (req, res) => {
  const { type } = req.params;

  if (!dataCollections[type]) {
    return res.status(404).json({ error: `Invalid type: ${type}` });
  }

  const items = getItemsByType(type);

  res.json({
    type,
    typeIdentifier: dataCollections[type],
    items,
  });
});

async function loadJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return null;
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

const getBaseUrl = (req) => {
  return `${req.protocol}://${req.get("host")}`;
};

async function getIconPath(req, type, iconId) {
  const folder = ["ship", "siege", "cart"].includes(type)
    ? "transport"
    : type == "fish"
    ? "creature"
    : ["shield", "bomb"].includes(type)
    ? "weapon"
    : type;

  const baseIconPath = iconId.includes("/")
    ? path.join(
        (iconId.split("/")[0] ?? "").toString(),
        (iconId.split("/")[1] ?? "").toString()
      )
    : path.join(folder, iconId || "");

  const webpPath = path.join("public/icons", `${baseIconPath}.webp`);
  const pngPath = path.join("public/icons", `${baseIconPath}.png`);

  const hasWebp = await fileExists(webpPath);
  const hasPng = await fileExists(pngPath);

  const baseUrl = getBaseUrl(req);

  if (hasWebp) return `${baseUrl}/public/icons/${baseIconPath}.webp`;
  if (hasPng) return `${baseUrl}/public/icons/${baseIconPath}.png`;

  return null;
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

export default app;
