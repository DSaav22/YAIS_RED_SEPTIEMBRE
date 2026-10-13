# Aplicación

Scaffold Vite + React + TypeScript estricto del juego (`T-001-01`). Todavía no hay
episodio jugable: el shell solo muestra el distintivo `Borrador no validado`.

Los comandos se ejecutan desde la raíz del repositorio, que es el workspace npm:

```bash
npm install
npm run dev
npm run verify
```

## Estructura

| Ruta | Qué contiene |
| --- | --- |
| `src/engine/` | Motor de contenido. TypeScript puro: sin React, DOM ni Three. |
| `src/shared/assets.ts` | Única fuente de rutas de arte del runtime (GLB, posters, clips). El subconjunto real lo copia `scripts/sync-runtime-assets.mjs` (`npm run sync:assets`) hacia `public/assets/` (generado). |
| `src/App.tsx` | Shell mínimo con el distintivo de borrador. |
| `src/index.css` | Tokens y base accesible (contraste, foco, reduced motion). |
| `tsconfig.engine.json` | Compuerta de arquitectura: typecheck del motor sin `lib` DOM. |

La pureza del motor la sostienen tres mecanismos independientes:
`tsconfig.engine.json`, el bloque `src/engine/**` de `eslint.config.js` y
`npm run check:safety`.
