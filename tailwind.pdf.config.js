/**
 * Tailwind (v3 engine) config for the server-rendered PDF templates.
 * It mirrors the inline Play-CDN config the templates used to load at render
 * time; `npm run build:pdf-css` compiles it to generated/pdf.css, which
 * services/pdf-generator.ts inlines into every document.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./utils/*-html.ts", "./services/pdf-generator.ts"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0f3d2e",
          "primary-light": "#1a4d2e",
          gold: "#d4af37",
        },
        surface: {
          cream: "#fdfaf3",
        },
        gold: {
          DEFAULT: "#d4a017",
          light: "#f0c14a",
          dark: "#b8860b",
        },
        teal: {
          DEFAULT: "#0d4a4a",
          dark: "#083333",
        },
      },
      spacing: {
        "pdf-id-width": "1011px",
        "pdf-id-height": "638px",
        "pdf-cert-width": "1123px",
        "pdf-cert-height": "794px",
        "pdf-label-w": "180px",
        "pdf-photo-w": "230px",
        "pdf-photo-h": "270px",
      },
      borderWidth: {
        "pdf-hairline": "1.5px",
        "pdf-xs": "3px",
        "pdf-sm": "4px",
        "pdf-md": "6px",
        "pdf-lg": "8px",
        "pdf-xl": "12px",
        "pdf-thick": "10px",
      },
      borderRadius: {
        "pdf-lg": "36px",
      },
      fontSize: {
        "pdf-7": "7px",
        "pdf-9": "9px",
        "pdf-10": "10px",
        "pdf-11": "11px",
        "pdf-16": "16px",
        "pdf-17": "17px",
        "pdf-20": "20px",
        "pdf-22": "22px",
        "pdf-26": "26px",
        "pdf-28": "28px",
        "pdf-34": "34px",
        "pdf-38": "38px",
        "pdf-44": "44px",
        "pdf-46": "46px",
        "pdf-56": "56px",
        "pdf-72": "72px",
      },
    },
  },
  corePlugins: { preflight: true },
};
