/// <reference types="node" />
// La referencia de arriba trae los tipos ambientales de Node (`node:fs`,
// `node:path`, `node:url`) sin tocar `tsconfig.app.json`, que a propósito
// declara `"types": []` para que el código de `src/` no dependa de globals de
// Node. Esta es la única excepción: el test corre en Node (Vitest), no en el
// navegador, y necesita leer el sistema de archivos real.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CHARACTERS,
  CHARACTER_SOURCE_FILES,
  PRELOADED_CHARACTER_IDS,
  PROP_ASSETS,
  PROP_SOURCE_FILES,
  WORLD_ASSETS,
  WORLD_SOURCE_FILES,
  type CharacterId,
} from "./assets";

// `assets.test.ts` vive en app/src/shared; la raíz del repo está tres
// niveles arriba (app/src/shared -> app/src -> app -> raíz).
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function existsInRepo(relativePath: string): boolean {
  return existsSync(join(REPO_ROOT, relativePath));
}

describe("registro de assets del runtime", () => {
  it("cada modelo y poster de personaje existe de verdad en assets/", () => {
    for (const characterId of Object.keys(CHARACTERS) as CharacterId[]) {
      const source = CHARACTER_SOURCE_FILES[characterId];
      expect(existsInRepo(source.model), `falta ${source.model} (${characterId})`).toBe(true);
      expect(existsInRepo(source.poster), `falta ${source.poster} (${characterId})`).toBe(true);
    }
  });

  it("cada modelo del mundo mínimo existe de verdad en assets/", () => {
    for (const path of Object.values(WORLD_SOURCE_FILES)) {
      expect(existsInRepo(path), `falta ${path}`).toBe(true);
    }
  });

  it("cada prop mínimo existe de verdad en assets/", () => {
    for (const path of Object.values(PROP_SOURCE_FILES)) {
      expect(existsInRepo(path), `falta ${path}`).toBe(true);
    }
  });

  // El objetivo era que TODOS los modelos hechos quepan en el runtime. Ya
  // caben, y este test evita que vuelvan a quedarse fuera en silencio: si
  // alguien añade un modelo al kit y no lo registra aquí, falla la compuerta
  // en vez de descubrirse cuando haga falta en una escena.
  it.each([
    ["world", "assets/production/world/v002", WORLD_SOURCE_FILES],
    ["props", "assets/production/props/v002", PROP_SOURCE_FILES],
  ])("el registro cubre el kit de %s entero", (_kit, dir, registro) => {
    const enDisco = readdirSync(join(REPO_ROOT, dir), { withFileTypes: true })
      .filter((entrada) => entrada.isDirectory())
      .map((entrada) => entrada.name)
      .sort();

    expect(Object.keys(registro).sort()).toEqual(enDisco);
  });

  it("precarga a los cinco personajes del elenco", () => {
    // Luna, Clara y Beto entraron cuando los GLB pasaron a la variante v002 y
    // el elenco completo cupo en el presupuesto de 25 MiB sin subirlo.
    expect([...PRELOADED_CHARACTER_IDS].sort()).toEqual(
      (Object.keys(CHARACTERS) as CharacterId[]).sort(),
    );
  });

  it("ninguna ruta pública sale de la carpeta allowlisted /assets/", () => {
    const urls = [
      ...Object.values(CHARACTERS).flatMap((personaje) => [
        personaje.modelUrl,
        personaje.posterUrl,
      ]),
      ...Object.values(WORLD_ASSETS).map((elemento) => elemento.modelUrl),
      ...Object.values(PROP_ASSETS).map((prop) => prop.modelUrl),
    ];

    expect(urls.length).toBeGreaterThan(0);

    for (const url of urls) {
      expect(url.startsWith("/assets/"), `${url} no empieza con /assets/`).toBe(true);
      expect(url.includes(".."), `${url} intenta salir de la carpeta`).toBe(false);
      expect(url.includes("assets/production"), `${url} referencia la fuente, no el build`).toBe(
        false,
      );
    }
  });
});

// El registro y `scripts/sync-runtime-assets.mjs` mantienen la misma allowlist
// en dos archivos distintos. Si divergen, el código pide un archivo que el build
// nunca copió y el fallo aparece en el aula, no en la compuerta. Estos tests
// cierran ese lazo comparando contra el texto real del script.
describe("registro y script de sincronización no divergen", () => {
  const scriptSource = readFileSync(
    join(REPO_ROOT, "scripts", "sync-runtime-assets.mjs"),
    "utf8",
  );

  function destinoDeUrlPublica(url: string): string {
    return url.replace(/^\/assets\//, "");
  }

  it("todo asset precargado tiene destino en el script", () => {
    const urls = [
      ...PRELOADED_CHARACTER_IDS.flatMap((id) => [
        CHARACTERS[id].modelUrl,
        CHARACTERS[id].posterUrl,
      ]),
      ...Object.values(WORLD_ASSETS).map((elemento) => elemento.modelUrl),
      ...Object.values(PROP_ASSETS).map((prop) => prop.modelUrl),
    ];

    for (const url of urls) {
      const destino = destinoDeUrlPublica(url);
      // Los destinos del mundo y de los props se construyen con plantilla
      // (`world/${id}/${id}.glb`), así que basta con que el id esté declarado.
      const idDeCarpeta = destino.split("/")[1] ?? "";
      const presente =
        scriptSource.includes(destino) || scriptSource.includes(`"${idDeCarpeta}"`);
      expect(presente, `${url} no aparece en la allowlist de sync-runtime-assets.mjs`).toBe(true);
    }
  });

  it("los personajes no precargados no tienen destino en el script", () => {
    const noPrecargados = (Object.keys(CHARACTERS) as CharacterId[]).filter(
      (id) => !PRELOADED_CHARACTER_IDS.includes(id),
    );

    // Hoy están los cinco precargados, así que esta lista está vacía a
    // propósito. El test se conserva porque la regla sigue valiendo: si
    // alguien saca a un personaje de la precarga, su GLB no debe quedarse
    // colgado en la allowlist del script.

    for (const id of noPrecargados) {
      const destino = destinoDeUrlPublica(CHARACTERS[id].modelUrl);
      expect(
        scriptSource.includes(destino),
        `${id} no debe copiarse al build en este hito (PLAN-001)`,
      ).toBe(false);
    }
  });
});
