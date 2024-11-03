import fs from "fs/promises";
import path from "path";

export async function loadJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return null;
  }
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function getIconPath(req, type, iconId) {
  const folder = ["ship", "siege", "cart"].includes(type)
    ? "transport"
    : type === "fish"
    ? "creature"
    : ["shield", "bomb"].includes(type)
    ? "weapon"
    : type === "item"
    ? "resource"
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

export const getBaseUrl = (req) => {
  return `${req.protocol}://${req.get("host")}`;
};
