import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

export type ReportAssets = {
  hero: string;
  ctaFamily: string;
  founder: string;
};

export const SITE_ASSETS: ReportAssets = {
  hero: "/hero.jpg",
  ctaFamily: "/cta-family.jpg",
  founder: "/founder.jpg",
};

export function fileAssets(projectRoot: string): ReportAssets {
  return {
    hero: pathToFileURL(path.join(projectRoot, "public/hero.jpg")).href,
    ctaFamily: pathToFileURL(path.join(projectRoot, "public/cta-family.jpg")).href,
    founder: pathToFileURL(path.join(projectRoot, "public/founder.jpg")).href,
  };
}

function dataUri(filePath: string): string {
  const bytes = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

export function dataUriAssets(projectRoot: string): ReportAssets {
  return {
    hero: dataUri(path.join(projectRoot, "public/hero.jpg")),
    ctaFamily: dataUri(path.join(projectRoot, "public/cta-family.jpg")),
    founder: dataUri(path.join(projectRoot, "public/founder.jpg")),
  };
}
