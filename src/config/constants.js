export const dataCollections = {
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

export const Biomes = {
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

export const BiomeDescriptions = {
  Meadows:
    "Starting biome of new worlds filled with Birch, Beech, and Oak trees which is inhabited by low level mobs.",
  BlackForest:
    "Dark and hostile forest of Fir and Pine trees with more resources, including Core wood, Tin, and Copper.",
  Swamp:
    "Dangerous, shadowy area with shallow water full of Leeches, Crypts filled with Draugrs, and poisonous Blobs.",
  Mountain:
    "Tall frozen mountains teeming with Wolves and flying Drakes that resist the biome's biting cold.",
  Plains:
    "Warm sunny area with golden grass and killer bugs. Home to the Fuling clan, Lox and Deathsquitoes.",
  Mistlands:
    "A fog-covered land with rocky terrain and Yggdrasil shoots, inhabited by Hares, Dvergrs and hostile insects such as Seekers.",
  Ashlands:
    "A fiery realm, the terrain changes the more inland one travels, with central parts taken up by lava. The undead army of Charred make up most of the population.",
  Ocean:
    "Found off the coast in deep waters. Home to Leviathans and Sea Serpents.",
  DeepNorth: "Deep North biome of fir and pine trees with low level mobs.",
};

export const PLAN_TYPES = {
  BASIC: "BASIC",
  PRO: "PRO",
};

export const Plans = {
  [PLAN_TYPES.BASIC]: {
    name: "Basic",
    allowedApiKeys: 3,
    allowedPaths: ["*"],
    rateLimit: 1000,
    rateLimitWindow: 60 * 60 * 1000,
    maxDataSize: 10 * 1024 * 1024,
  },
  [PLAN_TYPES.PRO]: {
    name: "Pro",
    allowedApiKeys: 10,
    allowedPaths: ["*"],
    rateLimit: 10000,
    rateLimitWindow: 60 * 60 * 1000,
    maxDataSize: 100 * 1024 * 1024,
  },
};

export const SUPPORT_EMAIL_ADDRESS = "valheim.helper.work@gmail.com";
