import fs from "fs/promises";
import path from "path";

/**
 * Self-hosted fonts for the PDF templates (Cinzel, Cormorant Garamond,
 * Scheherazade New, Amiri, Inter), downloaded once from Google Fonts into
 * public/fonts and described by public/fonts/pdf-fonts.json. They are inlined
 * as base64 @font-face rules so the headless browser never touches the
 * network while rendering a document.
 */

type FontEntry = {
  family: string;
  /** "400" or a variable range such as "400 700". */
  weight: string;
  subset: string;
  file: string;
  unicodeRange: string;
};

const FONT_DIR = path.join(process.cwd(), "public", "fonts");

let cssPromise: Promise<string> | null = null;

async function buildFontFaceCss(): Promise<string> {
  const manifest = JSON.parse(await fs.readFile(path.join(FONT_DIR, "pdf-fonts.json"), "utf8")) as FontEntry[];
  const rules = await Promise.all(
    manifest.map(async (entry) => {
      const bytes = await fs.readFile(path.join(FONT_DIR, entry.file));
      return `@font-face {
  font-family: '${entry.family}';
  font-style: normal;
  font-weight: ${entry.weight};
  font-display: block;
  src: url('data:font/woff2;base64,${bytes.toString("base64")}') format('woff2');
  unicode-range: ${entry.unicodeRange};
}`;
    }),
  );
  return rules.join("\n");
}

/** All @font-face rules for the PDF fonts, inlined; read from disk once per process. */
export function getPdfFontFaceCss(): Promise<string> {
  if (!cssPromise) {
    cssPromise = buildFontFaceCss().catch((error) => {
      cssPromise = null;
      throw error;
    });
  }
  return cssPromise;
}
