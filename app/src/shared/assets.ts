// Única fuente de rutas de arte del runtime (AGENTS.md, PLAN-001).
//
// Ningún componente debe escribir una ruta de GLB o poster como string
// literal: todas entran por este archivo. `scripts/sync-runtime-assets.mjs`
// copia el subconjunto allowlisted del primer hito hacia `app/public/assets/`
// (carpeta generada, ver `.gitignore`), que Vite sirve bajo `/assets/...`
// tanto en `npm run dev` como en el build.

/** Elenco de personajes del contenido. No todos se precargan en este hito. */
export type CharacterId = "capi" | "tomi" | "luna" | "clara" | "beto";

/**
 * Clips reales disponibles en los GLB v001 (PLAN-001: "el mapa de animaciones
 * nunca adivina por nombre en tiempo de ejecución"). Solo hay cinco por
 * personaje: `Idle`, locomoción (`Walk` o `Roll`), `Wave`, `Listen` y
 * `TalkGesture`.
 */
export type RuntimeClip = "Idle" | "Walk" | "Roll" | "Wave" | "Listen" | "TalkGesture";

/** Contrato de PLAN-001 para un personaje animado del runtime. */
export interface CharacterAsset {
  readonly modelUrl: string;
  readonly posterUrl: string;
  readonly locomotion: "Walk" | "Roll";
  readonly availableClips: readonly RuntimeClip[];
}

const CLIPS_DE_PIE: readonly RuntimeClip[] = ["Idle", "Walk", "Wave", "Listen", "TalkGesture"];
const CLIPS_EN_SILLA: readonly RuntimeClip[] = ["Idle", "Roll", "Wave", "Listen", "TalkGesture"];

/**
 * Registro de los cinco personajes. `modelUrl`/`posterUrl` son rutas
 * públicas del build (p. ej. `/assets/characters/capi/mascot.glb`), nunca
 * rutas de `assets/production/...`.
 */
export const CHARACTERS: Readonly<Record<CharacterId, CharacterAsset>> = {
  capi: {
    modelUrl: "/assets/characters/capi/mascot.glb",
    posterUrl: "/assets/characters/capi/poster.png",
    locomotion: "Walk",
    availableClips: CLIPS_DE_PIE,
  },
  tomi: {
    modelUrl: "/assets/characters/tomi/child_explorer.glb",
    posterUrl: "/assets/characters/tomi/poster.png",
    locomotion: "Walk",
    availableClips: CLIPS_DE_PIE,
  },
  luna: {
    modelUrl: "/assets/characters/luna/child_wheelchair.glb",
    posterUrl: "/assets/characters/luna/poster.png",
    locomotion: "Roll",
    availableClips: CLIPS_EN_SILLA,
  },
  clara: {
    modelUrl: "/assets/characters/clara/educator.glb",
    posterUrl: "/assets/characters/clara/poster.png",
    locomotion: "Walk",
    availableClips: CLIPS_DE_PIE,
  },
  beto: {
    modelUrl: "/assets/characters/beto/community_guide.glb",
    posterUrl: "/assets/characters/beto/poster.png",
    locomotion: "Walk",
    availableClips: CLIPS_DE_PIE,
  },
} as const;

/**
 * Personajes que `scripts/sync-runtime-assets.mjs` copia de verdad y que, por
 * tanto, pueden aparecer en 3D. Ahora son los cinco.
 *
 * Luna, Clara y Beto estaban fuera porque sus GLB no cabían en el presupuesto
 * de 25 MiB del subconjunto de aula. Ya caben: los cinco modelos se sirven
 * desde `assets/production/animated/v002/`, una variante que baja la precisión
 * de almacenamiento de los atributos de malla (KHR_mesh_quantization, que
 * three.js entiende de serie) sin quitar un solo triángulo ni un solo clip.
 * Los cinco GLB pasaron de 29,69 MiB a 15,93 MiB y la allowlist completa queda
 * en 24,36 MiB con el kit del mundo y los props al completo. El presupuesto NO se tocó.
 */
export const PRELOADED_CHARACTER_IDS: readonly CharacterId[] = [
  "capi",
  "tomi",
  "luna",
  "clara",
  "beto",
] as const;

/**
 * El kit del mundo al completo: los veinte modelos de
 * `assets/production/world/`.
 *
 * Antes se registraban trece y siete se quedaban fuera por presupuesto, entre
 * ellos la isla pequeña, la casa, el puente curvo y la esquina de sendero, que
 * son piezas estructurales sin las que no se puede componer un escenario. Ya
 * caben todos porque el kit pasó a la variante optimizada v002: 7,59 MiB ->
 * 4,60 MiB (-39,4 %) sin quitar un solo triángulo. El presupuesto de 25 MiB NO
 * se tocó.
 */
export type WorldAssetId =
  | "island_large"
  | "island_small"
  | "grass_tile"
  | "water_tile"
  | "path_straight"
  | "path_corner"
  | "bridge_straight"
  | "bridge_curved"
  | "stairs_three"
  | "house"
  | "lighthouse"
  | "bench"
  | "fence_wood"
  | "fence_rope"
  | "tree_round"
  | "palm"
  | "flower_bush"
  | "rock_small"
  | "rock_large"
  | "cloud";

export interface WorldAsset {
  readonly modelUrl: string;
}

/**
 * CAJAS CONTENEDORAS REALES de cada modelo del mundo.
 *
 * Las medidas de cada entrada están MEDIDAS, no estimadas: salen de
 * `assets/production/world/v002/manifest.json`, campo `size_glb`, que calcula
 * `assets/production/world/v002/optimizar-kit.mjs` recorriendo los vértices
 * del GLB servido con las transformaciones de nodo ya aplicadas.
 *
 * Están en el espacio que ve three.js: Y ARRIBA, en metros, con el orden
 * `ancho X x alto Y x largo Z`. Cada comentario añade además el rango vertical
 * `y min..max` respecto al origen del modelo, que es lo que hace falta para
 * apoyar algo sin que flote ni se hunda: un modelo con `y 0..h` se apoya
 * poniéndolo en y = 0, y uno con y mínimo negativo ya viene preparado para
 * enterrarse un poco.
 *
 * Ojo: el campo `bounds` de los `asset.json` de v001 está en espacio Blender
 * (Z arriba) y NO sirve para colocar nada en la escena. Usa estas medidas, o
 * `size_glb` del manifiesto de v002.
 */
export const WORLD_ASSETS: Readonly<Record<WorldAssetId, WorldAsset>> = {
  // 6.271 x 1.786 x 6.297 m, y -1.541..0.245 — isla grande; superficie pisable en y = 0.245, faldón hasta y = -1.541
  island_large: { modelUrl: "/assets/world/island_large/island_large.glb" },
  // 3.632 x 1.778 x 3.612 m, y -1.532..0.245 — isla pequeña; misma superficie pisable en y = 0.245 que la grande
  island_small: { modelUrl: "/assets/world/island_small/island_small.glb" },
  // 2 x 0.433 x 2 m, y -0.24..0.193 — baldosa de césped de 2 x 2; cara superior en y = 0.193
  grass_tile: { modelUrl: "/assets/world/grass_tile/grass_tile.glb" },
  // 2 x 0.189 x 2 m, y -0.17..0.019 — baldosa de agua de 2 x 2; lámina en y = 0.019, se hunde hasta -0.17
  water_tile: { modelUrl: "/assets/world/water_tile/water_tile.glb" },
  // 2 x 0.433 x 2 m, y -0.24..0.193 — baldosa de sendero de 2 x 2; cara pisable en y = 0.193, igual que el césped
  path_straight: { modelUrl: "/assets/world/path_straight/path_straight.glb" },
  // 2 x 0.433 x 2 m, y -0.24..0.193 — esquina de sendero; misma caja de 2 x 2 y misma cara pisable que path_straight
  path_corner: { modelUrl: "/assets/world/path_corner/path_corner.glb" },
  // 1.634 x 0.907 x 2.134 m, y -0.025..0.882 — cruza 2.134 a lo largo de Z; tablero en y = 0.19, barandas hasta y = 0.883
  bridge_straight: { modelUrl: "/assets/world/bridge_straight/bridge_straight.glb" },
  // 1.834 x 0.907 x 3.972 m, y -0.025..0.882 — cruza 3.972 a lo largo de Z con curva en X; barandas hasta y = 0.882
  bridge_curved: { modelUrl: "/assets/world/bridge_curved/bridge_curved.glb" },
  // 1.24 x 0.6 x 1.27 m, y 0..0.6 — tres peldaños; sube 0.6 en 1.27 de fondo, base apoyada en y = 0
  stairs_three: { modelUrl: "/assets/world/stairs_three/stairs_three.glb" },
  // 2.465 x 3.079 x 2.57 m, y 0..3.079 — casa cerrada, sin interior; apoyada en y = 0, cumbrera en y = 3.079
  house: { modelUrl: "/assets/world/house/house.glb" },
  // 2.088 x 4.65 x 2.02 m, y 0..4.65 — faro; la pieza más alta del kit, apoyado en y = 0
  lighthouse: { modelUrl: "/assets/world/lighthouse/lighthouse.glb" },
  // 1.62 x 1.135 x 0.641 m, y 0..1.135 — banco; asiento apoyado en y = 0, respaldo hasta y = 1.135
  bench: { modelUrl: "/assets/world/bench/bench.glb" },
  // 1.974 x 0.863 x 0.174 m, y 0..0.863 — tramo de valla de madera de 1.974 a lo largo de X; muy delgado en Z
  fence_wood: { modelUrl: "/assets/world/fence_wood/fence_wood.glb" },
  // 1.974 x 0.863 x 0.174 m, y 0..0.863 — tramo de valla de cuerda; misma caja que fence_wood, se alternan sin recalcular
  fence_rope: { modelUrl: "/assets/world/fence_rope/fence_rope.glb" },
  // 2.15 x 2.922 x 1.758 m, y -0.005..2.917 — árbol; tronco en y = 0 (baja 0.005 para enterrarse), copa hasta y = 2.917
  tree_round: { modelUrl: "/assets/world/tree_round/tree_round.glb" },
  // 2.258 x 2.676 x 2.258 m, y 0.003..2.678 — palmera; base en y = 0.003, hojas hasta y = 2.678
  palm: { modelUrl: "/assets/world/palm/palm.glb" },
  // 0.645 x 0.237 x 0.645 m, y 0.051..0.288 — mata de flores baja; flota 0.051 sobre y = 0, conviene hundirla al colocarla
  flower_bush: { modelUrl: "/assets/world/flower_bush/flower_bush.glb" },
  // 0.463 x 0.389 x 0.433 m, y -0.038..0.351 — roca pequeña; centrada en el origen, baja 0.038 bajo y = 0 para enterrarse
  rock_small: { modelUrl: "/assets/world/rock_small/rock_small.glb" },
  // 0.963 x 0.876 x 0.784 m, y -0.097..0.779 — roca grande; baja 0.097 bajo y = 0
  rock_large: { modelUrl: "/assets/world/rock_large/rock_large.glb" },
  // 1.62 x 0.92 x 0.8 m, y -0.03..0.89 — nube; pensada para colocarse en alto, la caja no toca el suelo
  cloud: { modelUrl: "/assets/world/cloud/cloud.glb" },
} as const;

/**
 * El kit de props al completo: los veinte modelos de
 * `assets/production/props/`.
 *
 * Antes solo se registraban dos, con el argumento de que un modelo que nadie
 * dibuja no debe pesar en el presupuesto de aula. El argumento era bueno
 * mientras el kit venía sin optimizar; ahora los veinte props juntos pesan
 * 0,92 MiB (variante v002, -38,6 %) y la allowlist completa cabe en 24,36 MiB
 * de los 25 de presupuesto original (hoy el techo es 80, ver el comentario
 * de `PRESUPUESTO_BYTES` en `scripts/sync-runtime-assets.mjs`). Que un id
 * esté aquí no significa que ya se dibuje en algún sitio: `seedling`,
 * `water_bottle`, `water_drop` y `recycling_bin` se sumaron como decorado
 * ambiental en `IslandScene.tsx` recién el 2026-09-18 (ver
 * `docs/ESTADO-IMPLEMENTACION.md`); antes de eso, y todavía para el resto de
 * los que no aparecen en `TEMAS_POR_ISLA` ni en un minijuego, están
 * registrados y sincronizados pero sin usar en ninguna pantalla — son los
 * primeros en salir si el presupuesto vuelve a apretar.
 *
 * Igual que en el mundo, cada comentario trae la caja medida en el espacio del
 * GLB (Y arriba): `ancho X x alto Y x largo Z` y el rango vertical respecto al
 * origen del modelo.
 */
export type PropAssetId =
  | "compass"
  | "speech_bubble"
  | "circle_of_three"
  | "sealed_envelope"
  | "folded_map"
  | "heart_token"
  | "puzzle_blue"
  | "puzzle_red"
  | "puzzle_yellow"
  | "backpack"
  | "gift_box"
  | "seedling"
  | "water_bottle"
  | "water_drop"
  | "recycling_bin"
  | "card_sun"
  | "card_leaf"
  | "card_cloud"
  | "pause_button"
  | "sound_button";

export interface PropAsset {
  readonly modelUrl: string;
}

export const PROP_ASSETS: Readonly<Record<PropAssetId, PropAsset>> = {
  // 0.74 x 0.903 x 0.202 m, y 0.07..0.973 — brújula
  compass: { modelUrl: "/assets/props/compass/compass.glb" },
  // 0.84 x 0.665 x 0.114 m, y 0.025..0.69 — bocadillo de diálogo
  speech_bubble: { modelUrl: "/assets/props/speech_bubble/speech_bubble.glb" },
  // 0.78 x 0.57 x 0.405 m, y -0.005..0.565 — círculo de tres, el minijuego del episodio 2
  circle_of_three: { modelUrl: "/assets/props/circle_of_three/circle_of_three.glb" },
  // 0.72 x 0.5 x 0.145 m, y 0.01..0.51 — sobre cerrado
  sealed_envelope: { modelUrl: "/assets/props/sealed_envelope/sealed_envelope.glb" },
  // 0.878 x 0.69 x 0.113 m, y 0.015..0.705 — mapa plegado
  folded_map: { modelUrl: "/assets/props/folded_map/folded_map.glb" },
  // 0.8 x 0.723 x 0.075 m, y -0.065..0.658 — ficha de corazón
  heart_token: { modelUrl: "/assets/props/heart_token/heart_token.glb" },
  // 0.606 x 0.606 x 0.085 m, y 0.07..0.676 — pieza de puzle azul
  puzzle_blue: { modelUrl: "/assets/props/puzzle_blue/puzzle_blue.glb" },
  // 0.606 x 0.606 x 0.085 m, y 0.07..0.676 — pieza de puzle roja
  puzzle_red: { modelUrl: "/assets/props/puzzle_red/puzzle_red.glb" },
  // 0.606 x 0.606 x 0.085 m, y 0.07..0.676 — pieza de puzle amarilla
  puzzle_yellow: { modelUrl: "/assets/props/puzzle_yellow/puzzle_yellow.glb" },
  // 0.748 x 0.771 x 0.868 m, y 0..0.771 — mochila
  backpack: { modelUrl: "/assets/props/backpack/backpack.glb" },
  // 0.65 x 0.925 x 0.58 m, y 0..0.925 — caja de regalo
  gift_box: { modelUrl: "/assets/props/gift_box/gift_box.glb" },
  // 0.686 x 0.697 x 0.5 m, y -0.025..0.672 — plántula
  seedling: { modelUrl: "/assets/props/seedling/seedling.glb" },
  // 0.53 x 1.032 x 0.48 m, y 0.055..1.087 — botella de agua
  water_bottle: { modelUrl: "/assets/props/water_bottle/water_bottle.glb" },
  // 0.47 x 0.96 x 0.47 m, y 0..0.96 — gota de agua
  water_drop: { modelUrl: "/assets/props/water_drop/water_drop.glb" },
  // 0.66 x 0.79 x 0.57 m, y 0..0.79 — contenedor de reciclaje
  recycling_bin: { modelUrl: "/assets/props/recycling_bin/recycling_bin.glb" },
  // 0.47 x 0.71 x 0.091 m, y 0.005..0.715 — tarjeta del sol; sin sitio donde dibujarse todavía
  card_sun: { modelUrl: "/assets/props/card_sun/card_sun.glb" },
  // 0.47 x 0.71 x 0.194 m, y 0.005..0.715 — tarjeta de la hoja; sin sitio donde dibujarse todavía
  card_leaf: { modelUrl: "/assets/props/card_leaf/card_leaf.glb" },
  // 0.47 x 0.71 x 0.103 m, y 0.005..0.715 — tarjeta de la nube; sin sitio donde dibujarse todavía
  card_cloud: { modelUrl: "/assets/props/card_cloud/card_cloud.glb" },
  // 0.7 x 0.7 x 0.127 m, y 0.04..0.74 — botón de pausa modelado en 3D; sin sitio donde dibujarse todavía
  pause_button: { modelUrl: "/assets/props/pause_button/pause_button.glb" },
  // 0.7 x 0.7 x 0.135 m, y 0.04..0.74 — botón de sonido modelado en 3D; sin sitio donde dibujarse todavía
  sound_button: { modelUrl: "/assets/props/sound_button/sound_button.glb" },
} as const;

/**
 * Origen real de cada archivo dentro de `assets/`, relativo a la raíz del
 * repositorio. Solo lo usa `assets.test.ts` para comprobar que el registro
 * de arriba apunta a archivos que existen de verdad; el runtime nunca
 * importa ni sirve esta ruta por HTTP (esa es la carpeta fuente, no el
 * build). Debe reflejar la allowlist de `scripts/sync-runtime-assets.mjs`.
 *
 * Los modelos apuntan a `animated/v002`, que es lo que la allowlist copia de
 * verdad. `animated/v001` sigue en el repositorio intacto como fuente de arte
 * y referencia de revisión, pero no se sirve.
 */
export const CHARACTER_SOURCE_FILES: Readonly<
  Record<CharacterId, { readonly model: string; readonly poster: string }>
> = {
  capi: {
    model: "assets/production/animated/v002/mascot/mascot.glb",
    poster: "assets/production/mascot/v005/three-quarter.png",
  },
  tomi: {
    model: "assets/production/animated/v002/child_explorer/child_explorer.glb",
    poster: "assets/production/npc/v001/child_explorer/three-quarter.png",
  },
  luna: {
    model: "assets/production/animated/v002/child_wheelchair/child_wheelchair.glb",
    poster: "assets/production/npc/v002/child_wheelchair/three-quarter.png",
  },
  clara: {
    model: "assets/production/animated/v002/educator/educator.glb",
    poster: "assets/production/npc/v002/educator/three-quarter.png",
  },
  beto: {
    model: "assets/production/animated/v002/community_guide/community_guide.glb",
    poster: "assets/production/npc/v002/community_guide/three-quarter.png",
  },
} as const;

export const WORLD_SOURCE_FILES: Readonly<Record<WorldAssetId, string>> = {
  island_large: "assets/production/world/v002/island_large/island_large.glb",
  island_small: "assets/production/world/v002/island_small/island_small.glb",
  grass_tile: "assets/production/world/v002/grass_tile/grass_tile.glb",
  water_tile: "assets/production/world/v002/water_tile/water_tile.glb",
  path_straight: "assets/production/world/v002/path_straight/path_straight.glb",
  path_corner: "assets/production/world/v002/path_corner/path_corner.glb",
  bridge_straight: "assets/production/world/v002/bridge_straight/bridge_straight.glb",
  bridge_curved: "assets/production/world/v002/bridge_curved/bridge_curved.glb",
  stairs_three: "assets/production/world/v002/stairs_three/stairs_three.glb",
  house: "assets/production/world/v002/house/house.glb",
  lighthouse: "assets/production/world/v002/lighthouse/lighthouse.glb",
  bench: "assets/production/world/v002/bench/bench.glb",
  fence_wood: "assets/production/world/v002/fence_wood/fence_wood.glb",
  fence_rope: "assets/production/world/v002/fence_rope/fence_rope.glb",
  tree_round: "assets/production/world/v002/tree_round/tree_round.glb",
  palm: "assets/production/world/v002/palm/palm.glb",
  flower_bush: "assets/production/world/v002/flower_bush/flower_bush.glb",
  rock_small: "assets/production/world/v002/rock_small/rock_small.glb",
  rock_large: "assets/production/world/v002/rock_large/rock_large.glb",
  cloud: "assets/production/world/v002/cloud/cloud.glb",
} as const;

export const PROP_SOURCE_FILES: Readonly<Record<PropAssetId, string>> = {
  compass: "assets/production/props/v002/compass/compass.glb",
  speech_bubble: "assets/production/props/v002/speech_bubble/speech_bubble.glb",
  circle_of_three: "assets/production/props/v002/circle_of_three/circle_of_three.glb",
  sealed_envelope: "assets/production/props/v002/sealed_envelope/sealed_envelope.glb",
  folded_map: "assets/production/props/v002/folded_map/folded_map.glb",
  heart_token: "assets/production/props/v002/heart_token/heart_token.glb",
  puzzle_blue: "assets/production/props/v002/puzzle_blue/puzzle_blue.glb",
  puzzle_red: "assets/production/props/v002/puzzle_red/puzzle_red.glb",
  puzzle_yellow: "assets/production/props/v002/puzzle_yellow/puzzle_yellow.glb",
  backpack: "assets/production/props/v002/backpack/backpack.glb",
  gift_box: "assets/production/props/v002/gift_box/gift_box.glb",
  seedling: "assets/production/props/v002/seedling/seedling.glb",
  water_bottle: "assets/production/props/v002/water_bottle/water_bottle.glb",
  water_drop: "assets/production/props/v002/water_drop/water_drop.glb",
  recycling_bin: "assets/production/props/v002/recycling_bin/recycling_bin.glb",
  card_sun: "assets/production/props/v002/card_sun/card_sun.glb",
  card_leaf: "assets/production/props/v002/card_leaf/card_leaf.glb",
  card_cloud: "assets/production/props/v002/card_cloud/card_cloud.glb",
  pause_button: "assets/production/props/v002/pause_button/pause_button.glb",
  sound_button: "assets/production/props/v002/sound_button/sound_button.glb",
} as const;
