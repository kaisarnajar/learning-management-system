// Run by the Husky pre-commit hook (.husky/pre-commit).
// ESLint sees only the staged files; tsc has no per-file mode, so it checks the whole project once.
const config = {
  "*.{ts,tsx,mjs}": ["eslint", () => "tsc --noEmit"],
};

export default config;
