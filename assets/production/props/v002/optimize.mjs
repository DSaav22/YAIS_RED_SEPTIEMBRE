#!/usr/bin/env node
// Genera `assets/production/props/v002/` desde los fuentes intactos de v001.
//
// Comparte pipeline con el kit del mundo: la lógica y el porqué están en
// `assets/production/world/v002/optimizar-kit.mjs`, y se reutiliza en vez de
// duplicarse para que las dos mitades del kit no puedan divergir.
//
// Uso:  node assets/production/props/v002/optimize.mjs
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { optimizarKit } from "../../world/v002/optimizar-kit.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
await optimizarKit("props", join(AQUI, "..", "..", "..", ".."));
