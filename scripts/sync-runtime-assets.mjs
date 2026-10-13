#!/usr/bin/env node
// Copia por allowlist explícita el subconjunto de `assets/` que necesita el
// runtime hacia `app/public/assets/`, carpeta generada que Vite sirve bajo
// `/assets/...` en dev y en el build (ver .gitignore).
//
// Los cinco personajes (Capi, Tomi, Luna, Clara y Beto) se sincronizan desde
// `assets/production/animated/v002/`, la variante optimizada que genera
// `assets/production/animated/v002/optimize.mjs`. `v001` sigue intacto como
// fuente de arte y NO se sirve: v002 pesa 15,93 MiB frente a 29,69 MiB sin
// perder un solo triángulo (ver el encabezado de optimize.mjs). Los lotes
// históricos (`mascot/v001..v004`, `npc/v001` salvo el poster de Tomi) siguen
// fuera a propósito.
//
// Uso: node scripts/sync-runtime-assets.mjs   (desde la raíz del repo)
//
// Reglas que hace cumplir:
// - Falla con código 1 y mensaje legible si falta un archivo de la allowlist.
// - Falla si el sha256 de un GLB de personaje no coincide con el que registra
//   `assets/production/animated/v002/manifest.json`, y falla también si el
//   `source_sha256` que ese manifiesto declara no coincide con el sha256 del
//   GLB de v001 correspondiente. Las dos comprobaciones juntas cierran la
//   cadena fuente -> variante servida: el arte no puede cambiar, ni en v001 ni
//   en v002, sin que la sincronización lo note. Los kits del mundo y de props
//   pasan por la misma comprobación contra sus manifiestos de v002, y su
//   `source_sha256` se contrasta contra el GLB real de v001 en disco.
// - Es idempotente: si el destino ya coincide en tamaño y hash, no recopia.
// - Borra del destino cualquier archivo que ya no esté en la allowlist para
//   que el build nunca sirva un sobrante de una corrida anterior.

import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEST_ROOT = join(ROOT, "app", "public", "assets");

// Presupuesto de bytes del subconjunto que se sirve al aula (Constitución VI:
// «un solo dispositivo proyectado, sin instalar nada, con poco ancho de banda y
// con el hardware que la escuela ya tiene»). Medido, no estimado: lo calcula
// este mismo script en cada corrida. Pasarse sigue siendo una decisión
// consciente, no un descuido que se descubre en el aula: por eso el script
// sigue fallando si el total supera el número de abajo, no lo sube solo.
//
// Subido de 25 a 80 MiB por instrucción explícita: se pidió seguir
// incorporando más contenido y arte sin que el techo de 25 frenara cada
// añadido, con ancho de banda de sobra para la sesión de desarrollo actual.
// Esto NO revierte la optimización v001→v002 de los personajes (Idle 5
// clips, sin perder un triángulo, −46 %): esa sigue sirviendo porque es
// gratis en calidad, no un recorte. Lo que este número relaja es el TECHO
// para lo que se añada después (más islas, más props, episodios 3 y 4), no
// una orden de engordar lo que ya está optimizado. Antes de repetir esta
// subida, medir tiempo de carga real en un aula con la conexión que de
// verdad tenga: "no hay problema con Internet" describe esta sesión, no la
// escuela donde se va a usar el juego (Constitución VI y IX).
const PRESUPUESTO_BYTES = 80 * 1024 * 1024;

// Manifiesto de la variante servida (v002) y de la fuente de arte (v001).
// El primero da el sha256 del archivo que se copia; el segundo es contra quien
// se contrasta el `source_sha256` que v002 declara.
const ANIMATED_MANIFEST_REL = "assets/production/animated/v002/manifest.json";
const ANIMATED_MANIFEST_PATH = join(ROOT, ANIMATED_MANIFEST_REL);
const SOURCE_MANIFEST_REL = "assets/production/animated/v001/manifest.json";
const SOURCE_MANIFEST_PATH = join(ROOT, SOURCE_MANIFEST_REL);

// Manifiestos de los kits estáticos optimizados. A diferencia del manifiesto
// animado de v001, los de `world/v001` y `props/v001` no publican sha256, así
// que la cadena de versiones se cierra contra el archivo real en disco: se
// comprueba que el `source_sha256` que declara v002 es el sha256 del GLB de
// v001 del que dice derivar.
const KIT_MANIFESTS = {
  world: "assets/production/world/v002/manifest.json",
  props: "assets/production/props/v002/manifest.json",
};

// El kit del mundo entero: los veinte modelos de `assets/production/world/`.
//
// Antes se servían trece y siete se quedaban fuera por presupuesto, entre
// ellos la isla pequeña, la casa, el puente curvo y la esquina de sendero, que
// son piezas estructurales sin las que no se puede componer un escenario. Ya
// caben todos porque el kit pasó a la variante optimizada v002 (-39,4 %). No
// se ordenan por importancia: si algún día hubiera que recortar, el criterio
// está en el comentario de `PROP_IDS`.
const WORLD_IDS = [
  // Terreno y suelo.
  "island_large",
  "island_small",
  "grass_tile",
  "water_tile",
  // Circulación: senderos, puentes y escalera.
  "path_straight",
  "path_corner",
  "bridge_straight",
  "bridge_curved",
  "stairs_three",
  // Construcciones y mobiliario.
  "house",
  "lighthouse",
  "bench",
  "fence_wood",
  "fence_rope",
  // Vegetación, rocas y cielo.
  "tree_round",
  "palm",
  "flower_bush",
  "rock_small",
  "rock_large",
  "cloud",
];

// El kit de props entero: los veinte modelos de `assets/production/props/`.
//
// Cambio de criterio respecto a la corrida anterior, y conviene dejarlo
// explícito. Antes se sincronizaban solo `compass` y `speech_bubble` porque el
// resto no se dibujaba en ninguna pantalla y cada MiB servido sin usar salía
// del presupuesto de aula. Ahora los veinte juntos pesan 0,92 MiB —menos de lo
// que pesaba el mundo recortado— y varios de ellos (`circle_of_three`,
// `sealed_envelope`, `folded_map`, `heart_token`, las tres piezas de puzle)
// tienen uso directo en el guion de los episodios 1 y 2, que se está
// implementando en paralelo.
//
// Las tarjetas (`card_sun`, `card_leaf`, `card_cloud`) y los dos controles
// (`pause_button`, `sound_button`) siguen sin tener un sitio donde dibujarse:
// las tarjetas ya existen como iconos 2D y los botones serían interfaz dentro
// de una escena que va `aria-hidden` y nunca recibe foco (AC-8). Entran de
// todos modos porque suman 96 KiB entre los cinco y el kit completo es una
// unidad más fácil de razonar que una lista que hay que renegociar cada vez;
// si el presupuesto volviera a apretar, estos cinco son los primeros en salir.
const PROP_IDS = [
  // Con uso previsto en el guion.
  "compass",
  "speech_bubble",
  "circle_of_three",
  "sealed_envelope",
  "folded_map",
  "heart_token",
  "puzzle_blue",
  "puzzle_red",
  "puzzle_yellow",
  "backpack",
  "gift_box",
  "seedling",
  "water_bottle",
  "water_drop",
  "recycling_bin",
  // Sin sitio donde dibujarse todavía; primeros candidatos a salir.
  "card_sun",
  "card_leaf",
  "card_cloud",
  "pause_button",
  "sound_button",
  "banana_peel",
  "disposable_cup",
  "crumpled_wrapper",
];

/**
 * @typedef {Object} AssetEntry
 * @property {string} id identificador legible para mensajes de error.
 * @property {string} src ruta relativa a la raíz del repo.
 * @property {string} dest ruta relativa a `app/public/assets`.
 * @property {string} [manifestCharacterId] si está definido, se verifica el
 *   sha256 del archivo contra `assets/production/animated/v002/manifest.json`
 *   y, a través de su `source_sha256`, contra el GLB original de v001.
 * @property {"world"|"props"} [kit] kit estático al que pertenece el archivo.
 * @property {string} [kitAssetId] id dentro del manifiesto de ese kit; activa
 *   la misma verificación de sha256 y de cadena con v001.
 */

// Los cinco personajes del elenco, con el id que usa el manifiesto animado.
// `capi` y `tomi` ya estaban; `luna`, `clara` y `beto` entran ahora porque los
// GLB de v002 dejan sitio dentro del presupuesto.
const PERSONAJES = [
  { characterId: "capi", animatedId: "mascot", poster: "assets/production/mascot/v005/three-quarter.png" },
  {
    characterId: "tomi",
    animatedId: "child_explorer",
    poster: "assets/production/npc/v001/child_explorer/three-quarter.png",
  },
  {
    characterId: "luna",
    animatedId: "child_wheelchair",
    poster: "assets/production/npc/v002/child_wheelchair/three-quarter.png",
  },
  {
    characterId: "clara",
    animatedId: "educator",
    poster: "assets/production/npc/v002/educator/three-quarter.png",
  },
  {
    characterId: "beto",
    animatedId: "community_guide",
    poster: "assets/production/npc/v002/community_guide/three-quarter.png",
  },
];

/** @returns {AssetEntry[]} */
function buildAllowlist() {
  const entries = [];

  // Los cinco personajes se sirven desde v002 (variante optimizada). El
  // destino conserva el nombre del GLB original para no cambiar las rutas
  // públicas que ya declara `app/src/shared/assets.ts`.
  for (const p of PERSONAJES) {
    entries.push({
      id: `${p.characterId}-modelo`,
      src: `assets/production/animated/v002/${p.animatedId}/${p.animatedId}.glb`,
      dest: `characters/${p.characterId}/${p.animatedId}.glb`,
      manifestCharacterId: p.animatedId,
    });
    entries.push({
      id: `${p.characterId}-poster`,
      src: p.poster,
      dest: `characters/${p.characterId}/poster.png`,
    });
  }


  // El mundo y los props se sirven desde v002, igual que los personajes. El
  // destino no cambia (`world/<id>/<id>.glb`), así que las rutas públicas de
  // `app/src/shared/assets.ts` siguen siendo las mismas.
  for (const id of WORLD_IDS) {
    entries.push({
      id: `mundo-${id}`,
      src: `assets/production/world/v002/${id}/${id}.glb`,
      dest: `world/${id}/${id}.glb`,
      kit: "world",
      kitAssetId: id,
    });
  }

  for (const id of PROP_IDS) {
    entries.push({
      id: `prop-${id}`,
      src: `assets/production/props/v002/${id}/${id}.glb`,
      dest: `props/${id}/${id}.glb`,
      kit: "props",
      kitAssetId: id,
    });
  }

  return entries;
}

function fail(message) {
  console.error(`sync-runtime-assets — ${message}`);
  process.exit(1);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function readManifestAt(path, rel) {
  if (!existsSync(path)) {
    fail(`falta el manifiesto de personajes animados: ${rel}`);
    return { characters: [] };
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    fail(`el manifiesto ${rel} no es JSON válido: ${err.message}`);
    return { characters: [] };
  }
}

function readManifest() {
  return readManifestAt(ANIMATED_MANIFEST_PATH, ANIMATED_MANIFEST_REL);
}

function readSourceManifest() {
  return readManifestAt(SOURCE_MANIFEST_PATH, SOURCE_MANIFEST_REL);
}

/**
 * Comprueba que la variante v002 sigue derivando del arte de v001 que el
 * manifiesto fuente registra. Sin esto, alguien podría regenerar v002 desde
 * un v001 modificado y las dos mitades quedarían coherentes entre sí pero
 * despegadas del arte aprobado.
 */
function verificarCadenaDeVersiones(manifest, sourceManifest) {
  for (const entry of manifest.characters ?? []) {
    const fuente = (sourceManifest.characters ?? []).find((c) => c.id === entry.id);
    if (!fuente) {
      fail(
        `el manifiesto ${SOURCE_MANIFEST_REL} no registra a "${entry.id}", ` +
          `pero ${ANIMATED_MANIFEST_REL} dice derivar de él.`,
      );
      return;
    }
    if (entry.source_sha256 !== fuente.sha256) {
      fail(
        `la variante v002 de "${entry.id}" dice derivar del sha256 ` +
          `${entry.source_sha256}, pero el arte de v001 tiene ${fuente.sha256}. ` +
          "El fuente cambió sin regenerar v002: corre " +
          "`node assets/production/animated/v002/optimize.mjs` y revisa el resultado.",
      );
      return;
    }
  }
}

/**
 * Carga los manifiestos de los kits estáticos y comprueba, para cada modelo,
 * que el `source_sha256` que declara v002 es el sha256 real del GLB de v001
 * del que dice derivar. Los manifiestos de `world/v001` y `props/v001` no
 * publican sha256, así que la referencia es el archivo en disco.
 *
 * @returns {Record<string, Map<string, string>>} sha256 esperado por kit e id.
 */
function cargarKits() {
  /** @type {Record<string, Map<string, string>>} */
  const porKit = {};

  for (const [kit, rel] of Object.entries(KIT_MANIFESTS)) {
    const path = join(ROOT, rel);
    if (!existsSync(path)) {
      fail(
        `falta el manifiesto del kit "${kit}": ${rel}. ` +
          `Genera la variante optimizada con \`node assets/production/${kit}/v002/optimize.mjs\`.`,
      );
      return porKit;
    }

    let manifiesto;
    try {
      manifiesto = JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
      fail(`el manifiesto ${rel} no es JSON válido: ${err.message}`);
      return porKit;
    }

    const esperados = new Map();
    for (const entrada of manifiesto.assets ?? []) {
      const fuenteRel = `assets/production/${kit}/v001/${entrada.id}/${entrada.id}.glb`;
      const fuenteAbs = join(ROOT, fuenteRel);
      if (!existsSync(fuenteAbs)) {
        fail(
          `el manifiesto ${rel} registra "${entrada.id}", pero no existe su fuente ${fuenteRel}.`,
        );
        return porKit;
      }
      const shaFuente = sha256(fuenteAbs);
      if (entrada.source_sha256 !== shaFuente) {
        fail(
          `la variante v002 de "${kit}/${entrada.id}" dice derivar del sha256 ` +
            `${entrada.source_sha256}, pero ${fuenteRel} tiene ${shaFuente}. ` +
            "El fuente cambió sin regenerar v002: corre " +
            `\`node assets/production/${kit}/v002/optimize.mjs\` y revisa el resultado.`,
        );
        return porKit;
      }
      esperados.set(entrada.id, entrada.sha256);
    }
    porKit[kit] = esperados;
  }

  return porKit;
}

function expectedHashFor(manifest, characterId) {
  const entry = (manifest.characters ?? []).find((c) => c.id === characterId);
  if (!entry || typeof entry.sha256 !== "string") {
    fail(
      `el manifiesto ${ANIMATED_MANIFEST_REL} no registra un sha256 para "${characterId}".`,
    );
    return "";
  }
  return entry.sha256;
}

function pruneStale(destRoot, keepRelPaths) {
  if (!existsSync(destRoot)) return 0;
  let removedFiles = 0;

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        if (readdirSync(full).length === 0) {
          rmSync(full, { recursive: true });
        }
        continue;
      }
      const rel = relative(destRoot, full).split(sep).join("/");
      if (!keepRelPaths.has(rel)) {
        rmSync(full);
        removedFiles += 1;
      }
    }
  }

  walk(destRoot);
  return removedFiles;
}

function main() {
  const manifest = readManifest();
  verificarCadenaDeVersiones(manifest, readSourceManifest());
  const kits = cargarKits();
  const allowlist = buildAllowlist();

  let copied = 0;
  let skipped = 0;
  let totalBytes = 0;
  const keepRelPaths = new Set();

  for (const entry of allowlist) {
    const srcAbs = join(ROOT, entry.src);
    const destAbs = join(DEST_ROOT, entry.dest);

    if (!existsSync(srcAbs)) {
      fail(
        `falta un archivo de la allowlist para "${entry.id}": ${entry.src}. ` +
          "Revisa que assets/ tenga el lote esperado antes de sincronizar.",
      );
      continue;
    }

    if (entry.kit) {
      const esperado = (kits[entry.kit] ?? new Map()).get(entry.kitAssetId);
      if (typeof esperado !== "string") {
        fail(
          `el manifiesto ${KIT_MANIFESTS[entry.kit]} no registra un sha256 para ` +
            `"${entry.kitAssetId}".`,
        );
        continue;
      }
      const actual = sha256(srcAbs);
      if (actual !== esperado) {
        fail(
          `el sha256 de ${entry.src} no coincide con el manifiesto ` +
            `(esperado ${esperado}, obtenido ${actual}). ` +
            "El arte cambió sin publicar una nueva versión: no se sincroniza.",
        );
        continue;
      }
    }

    if (entry.manifestCharacterId) {
      const expected = expectedHashFor(manifest, entry.manifestCharacterId);
      const actual = sha256(srcAbs);
      if (actual !== expected) {
        fail(
          `el sha256 de ${entry.src} no coincide con el manifiesto ` +
            `(esperado ${expected}, obtenido ${actual}). ` +
            "El arte cambió sin publicar una nueva versión: no se sincroniza.",
        );
        continue;
      }
    }

    const srcStat = statSync(srcAbs);
    totalBytes += srcStat.size;
    keepRelPaths.add(entry.dest);

    mkdirSync(dirname(destAbs), { recursive: true });

    if (existsSync(destAbs)) {
      const destStat = statSync(destAbs);
      const matches = destStat.size === srcStat.size && sha256(destAbs) === sha256(srcAbs);
      if (matches) {
        skipped += 1;
        continue;
      }
    }

    copyFileSync(srcAbs, destAbs);
    copied += 1;
  }

  const removed = pruneStale(DEST_ROOT, keepRelPaths);

  const mib = (bytes) => (bytes / 1024 / 1024).toFixed(2);

  console.log("sync-runtime-assets — resumen:");
  console.log(`  copiados: ${copied}`);
  console.log(`  omitidos (ya sincronizados): ${skipped}`);
  console.log(`  eliminados (fuera de la allowlist): ${removed}`);
  console.log(
    `  bytes totales de la allowlist: ${totalBytes} (${mib(totalBytes)} MiB de ${mib(PRESUPUESTO_BYTES)} MiB de presupuesto)`,
  );

  if (totalBytes > PRESUPUESTO_BYTES) {
    console.error("");
    console.error(
      `sync-runtime-assets — el subconjunto del runtime pesa ${mib(totalBytes)} MiB y el presupuesto declarado es ${mib(PRESUPUESTO_BYTES)} MiB.`,
    );
    console.error(
      "Constitución VI: esto corre en un aula con poco ancho de banda y el hardware que la escuela ya tiene.",
    );
    console.error(
      "Subir el presupuesto es una decisión deliberada: edita PRESUPUESTO_BYTES en este archivo y explica por qué en el commit,",
    );
    console.error(
      "o baja el peso (optimizar un GLB crea una versión nueva, nunca sobrescribe el fuente).",
    );
    process.exit(1);
  }
}

main();
