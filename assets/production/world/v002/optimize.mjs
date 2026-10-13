#!/usr/bin/env node
// Genera `assets/production/world/v002/` desde los fuentes intactos de v001.
// El pipeline, el porqué de cada paso y la medición de cajas contenedoras
// están documentados en `optimizar-kit.mjs`.
//
// Uso:  node assets/production/world/v002/optimize.mjs
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { optimizarKit } from "./optimizar-kit.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
await optimizarKit("world", join(AQUI, "..", "..", "..", ".."));
