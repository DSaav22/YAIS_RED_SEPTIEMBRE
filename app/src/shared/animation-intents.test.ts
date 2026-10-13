/// <reference types="node" />
// La referencia de arriba trae los tipos ambientales de Node (`node:fs`,
// `node:path`, `node:url`) sin tocar `tsconfig.app.json`, que a propósito
// declara `"types": []` (ver `assets.test.ts`, mismo patrón).

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import { CHARACTERS, CHARACTER_SOURCE_FILES, type CharacterId, type RuntimeClip } from "./assets";
import {
  ANIMATION_INTENT_MAP,
  PREFIJO_SALUDO_DE_SESION,
  esSaludoDeSesion,
  resolveAnimationClip,
} from "./animation-intents";

// app/src/shared -> app/src -> app -> raíz del repositorio (mismo cálculo que assets.test.ts).
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function leerJson(rutaRelativa: string): unknown {
  return JSON.parse(readFileSync(join(REPO_ROOT, rutaRelativa), "utf8"));
}

/** Recolecta todo valor string de una propiedad "anim" en cualquier nivel del episodio. */
function recolectarIntencionesDeAnimacion(valor: unknown, encontradas: Set<string>): void {
  if (Array.isArray(valor)) {
    for (const elemento of valor) recolectarIntencionesDeAnimacion(elemento, encontradas);
    return;
  }
  if (valor !== null && typeof valor === "object") {
    for (const [clave, sub] of Object.entries(valor)) {
      if (clave === "anim" && typeof sub === "string") {
        encontradas.add(sub);
      }
      recolectarIntencionesDeAnimacion(sub, encontradas);
    }
  }
}

/**
 * Intenciones de todos los episodios versionados, no solo del primero: cada
 * episodio nuevo que se añada a `content/` entra aquí solo, y si trae una
 * intención sin entrada en el mapa, rompe este test en vez de reproducir un
 * gesto que nadie decidió.
 */
function intencionesUsadasEnElContenido(): ReadonlySet<string> {
  const carpeta = join(REPO_ROOT, "content/episodes");
  const encontradas = new Set<string>();
  for (const archivo of readdirSync(carpeta).filter((n) => n.endsWith(".json"))) {
    recolectarIntencionesDeAnimacion(leerJson(`content/episodes/${archivo}`), encontradas);
  }
  return encontradas;
}

/** Clips reales por personaje, leídos de los `asset.json` de producción (no de `assets.ts`). */
function clipsRealesPorPersonaje(): ReadonlyMap<CharacterId, ReadonlySet<RuntimeClip>> {
  const mapa = new Map<CharacterId, ReadonlySet<RuntimeClip>>();
  for (const characterId of Object.keys(CHARACTERS) as CharacterId[]) {
    const rutaModelo = CHARACTER_SOURCE_FILES[characterId].model;
    const rutaAssetJson = join(dirname(rutaModelo), "asset.json");
    const assetJson = leerJson(rutaAssetJson) as { clips: ReadonlyArray<{ name: string }> };
    const nombres = new Set(assetJson.clips.map((clip) => clip.name)) as Set<RuntimeClip>;
    mapa.set(characterId, nombres);
  }
  return mapa;
}

describe("mapa de intenciones de animación", () => {
  it("cubre, con entrada explícita, toda intención que usa el contenido", () => {
    const usadas = intencionesUsadasEnElContenido();
    // El contenido real tiene 61 intenciones distintas en la fecha de esta
    // tarea; si crece, esta afirmación falla primero y avisa con claridad.
    expect(usadas.size).toBeGreaterThan(0);

    for (const intencion of usadas) {
      const esFija = Object.prototype.hasOwnProperty.call(ANIMATION_INTENT_MAP, intencion);
      const esDinamica = esSaludoDeSesion(intencion);
      expect(
        esFija || esDinamica,
        `"${intencion}" aparece en el contenido pero no tiene entrada explícita en animation-intents.ts`,
      ).toBe(true);
    }
  });

  it("no deja ninguna intención del mapa sin usarse en el contenido actual (mapa exhaustivo, no adivinado)", () => {
    const usadas = intencionesUsadasEnElContenido();
    for (const intencion of Object.keys(ANIMATION_INTENT_MAP)) {
      expect(usadas.has(intencion), `"${intencion}" está en el mapa pero ningún nodo la usa`).toBe(
        true,
      );
    }
  });

  it("nunca asigna, ni resuelto por personaje, un clip que ese personaje no tenga de verdad", () => {
    const clipsReales = clipsRealesPorPersonaje();
    const personajes = Object.keys(CHARACTERS) as CharacterId[];

    for (const [intentId, entrada] of Object.entries(ANIMATION_INTENT_MAP)) {
      for (const personajeId of personajes) {
        const locomocion = CHARACTERS[personajeId].locomotion;
        const clipEsperado: RuntimeClip = entrada.clip === "Locomotion" ? locomocion : entrada.clip;
        const clipsDelPersonaje = clipsReales.get(personajeId);
        expect(
          clipsDelPersonaje?.has(clipEsperado),
          `"${intentId}" pide "${clipEsperado}" pero ${personajeId} no lo tiene en su asset.json real`,
        ).toBe(true);
      }
    }
  });

  it("resuelve una intención desconocida a Idle sin lanzar", () => {
    expect(() => {
      const clip = resolveAnimationClip("esto_no_existe_en_el_guion", "capi");
      expect(clip).toBe("Idle");
    }).not.toThrow();
  });

  it("resuelve la forma dinámica greet_from_session:* según el valor real de la variable de sesión", () => {
    expect(
      resolveAnimationClip(`${PREFIJO_SALUDO_DE_SESION}greetTomi`, "tomi", { greetTomi: "wave" }),
    ).toBe("Wave");
    expect(
      resolveAnimationClip(`${PREFIJO_SALUDO_DE_SESION}greetTomi`, "tomi", {
        greetTomi: "fist_bump",
      }),
    ).toBe("Wave");
    // Sin variable de sesión reconocida: relleno honesto, no adivinado.
    expect(resolveAnimationClip(`${PREFIJO_SALUDO_DE_SESION}greetBeto`, "beto")).toBe("Idle");
    expect(
      resolveAnimationClip(`${PREFIJO_SALUDO_DE_SESION}greetBeto`, "beto", {
        greetBeto: "algo_no_previsto",
      }),
    ).toBe("Idle");
  });

  it("resuelve la locomoción real de cada personaje (Luna no tiene Walk, usa Roll)", () => {
    expect(resolveAnimationClip("walk_with_player", "capi")).toBe("Walk");
    expect(resolveAnimationClip("walk_with_player", "luna")).toBe("Roll");
    expect(CHARACTERS.luna.availableClips).not.toContain("Walk");
  });

  it("advierte en desarrollo cuando la intención se rellena con otro clip", () => {
    const advertencia = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    // `greet_hug_short` está marcada `fallback`: no existe clip de abrazo y se
    // usa un relleno honesto. Quien dirige arte tiene que enterarse (T-001-06,
    // punto 3), no descubrirlo proyectando.
    resolveAnimationClip("greet_hug_short", "capi");

    expect(advertencia).toHaveBeenCalledTimes(1);
    expect(advertencia.mock.calls[0]?.[0]).toContain("no tiene clip propio");
  });

  it("no advierte cuando la intención tiene un clip que la representa", () => {
    const advertencia = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    // `wave` es "aproximado": el clip `Wave` sí representa la intención.
    resolveAnimationClip("wave", "capi");

    expect(advertencia).not.toHaveBeenCalled();
  });

  it("advierte en desarrollo cuando la intención es desconocida", () => {
    const advertencia = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    resolveAnimationClip("intencion_totalmente_inventada", "capi");
    expect(advertencia).toHaveBeenCalledTimes(1);
  });

  it("los cinco clips reales de un personaje son alcanzables desde alguna intención del contenido", () => {
    // Auditoría pedida tras el reporte de "el capibara no camina": los cinco
    // clips grabados deben poder sonar de verdad, no solo existir en el GLB.
    // `Listen` no aparece como intención de guion: lo asigna
    // `estado-de-escena.ts` cuando alguien preguntó y el niño está por
    // decidir (gesto `{ tipo: "escuchar" }`), así que se comprueba aparte con
    // el mismo `resolveAnimationClip` que usa `Character.tsx` para ese caso.
    const usadas = intencionesUsadasEnElContenido();
    const clipsAlcanzados = new Set<RuntimeClip>(["Listen"]);

    for (const intencion of usadas) {
      if (esSaludoDeSesion(intencion)) {
        for (const valor of ["wave", "distance", "high_five", "fist_bump", "hug", "none"]) {
          clipsAlcanzados.add(
            resolveAnimationClip(intencion, "capi", { [intencion.split(":")[1] ?? ""]: valor }),
          );
        }
        continue;
      }
      clipsAlcanzados.add(resolveAnimationClip(intencion, "capi"));
      clipsAlcanzados.add(resolveAnimationClip(intencion, "luna"));
    }

    for (const clip of ["Idle", "Wave", "Listen", "TalkGesture", "Walk", "Roll"] as const) {
      expect(clipsAlcanzados.has(clip), `ningún nodo del contenido llega a pedir "${clip}"`).toBe(
        true,
      );
    }
  });

  it("no emite ninguna advertencia en producción, aunque la intención sea desconocida o el clip falte", () => {
    const advertencia = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const devOriginal = import.meta.env.DEV;
    Object.assign(import.meta.env, { DEV: false });
    try {
      expect(resolveAnimationClip("intencion_totalmente_inventada", "capi")).toBe("Idle");
      expect(
        resolveAnimationClip(`${PREFIJO_SALUDO_DE_SESION}greetTomi`, "tomi", {
          greetTomi: "no_previsto",
        }),
      ).toBe("Idle");
      expect(advertencia).not.toHaveBeenCalled();
    } finally {
      Object.assign(import.meta.env, { DEV: devOriginal });
    }
  });
});
