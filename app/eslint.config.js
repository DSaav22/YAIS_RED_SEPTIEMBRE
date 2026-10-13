import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

// Módulos que el motor no puede importar: `src/engine` es TypeScript puro (AGENTS.md).
const MODULOS_PROHIBIDOS_EN_ENGINE = [
  "react",
  "react-dom",
  "react/*",
  "react-dom/*",
  "three",
  "three/*",
  "@react-three/*",
  "zustand",
  "zustand/*",
];

const GLOBALES_PROHIBIDOS_EN_ENGINE = [
  "window",
  "document",
  "localStorage",
  "sessionStorage",
  "navigator",
  "fetch",
  "XMLHttpRequest",
];

export default defineConfig([
  globalIgnores(["dist", "coverage", "node_modules"]),

  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },

  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat["recommended-latest"], reactRefresh.configs.vite],
  },

  {
    // Compuerta de arquitectura: el motor no depende de React, DOM ni Three.
    files: ["src/engine/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: MODULOS_PROHIBIDOS_EN_ENGINE,
              message:
                "src/engine es TypeScript puro: sin React, DOM ni Three (AGENTS.md).",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        ...GLOBALES_PROHIBIDOS_EN_ENGINE.map((name) => ({
          name,
          message:
            "src/engine no toca el navegador. El almacenamiento entra por la interfaz ProgressStore (PLAN-001).",
        })),
      ],
    },
  },

  {
    files: ["*.{js,ts}", "vitest.setup.ts"],
    languageOptions: {
      globals: globals.node,
    },
  },
]);
