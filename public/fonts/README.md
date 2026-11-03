# Fonts bundled for PDF rendering

The documents (receipts, certificates, ID cards, grade and attendance cards)
are rendered by a headless browser with the network disabled, so every font
they use is bundled here and inlined as base64 by `services/pdf-fonts.ts`.
`pdf-fonts.json` lists each file with its family, weight (or variable weight
range), subset and `unicode-range`.

| Family | Files | Source | Licence |
|---|---|---|---|
| Cinzel | `cinzel-latin.woff2` (variable 400–700) | Google Fonts | SIL Open Font License 1.1 |
| Cormorant Garamond | `cormorant-garamond-latin.woff2` (variable 400–700) | Google Fonts | SIL Open Font License 1.1 |
| Scheherazade New | `scheherazade-new-{400,700}-{arabic,latin}.woff2` | Google Fonts | SIL Open Font License 1.1 |
| Amiri | `amiri-{400,700}-{arabic,latin}.woff2` | Google Fonts | SIL Open Font License 1.1 |
| Inter | `inter-latin.woff2` (variable 400–700) | Google Fonts | SIL Open Font License 1.1 |
| IndoPak Nastaleeq | `indopak-nastaleeq.woff2` | project asset (pre-existing) | see project licence |

To refresh a family, download the `woff2` files from the Google Fonts CSS
API (request with a modern browser user agent), replace the files and update
`pdf-fonts.json`; the `@font-face` rules are generated from the manifest.
