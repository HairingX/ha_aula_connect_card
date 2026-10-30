import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/", "coverage/"] },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    // Every decision is made in the pure layers, so that it is tested without rendering.
    files: ["src/core/**/*.ts", "src/model/**/*.ts", "src/config/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["lit", "lit/*"], message: "Only src/ui and src/cards render." },
            {
              group: ["**/ui/**", "**/cards/**"],
              message: "The pure layers do not import the UI.",
            },
          ],
        },
      ],
    },
  },
  {
    // The layers depend downward only: core on nothing of the cards, model on core.
    files: ["src/core/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["lit", "lit/*"], message: "Only src/ui and src/cards render." },
            {
              group: ["**/ui/**", "**/cards/**", "**/model/**", "**/config/**"],
              message: "The core imports no layer above it.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/model/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["lit", "lit/*"], message: "Only src/ui and src/cards render." },
            {
              group: ["**/ui/**", "**/cards/**", "**/config/**"],
              message: "The model imports no layer above it.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
);
