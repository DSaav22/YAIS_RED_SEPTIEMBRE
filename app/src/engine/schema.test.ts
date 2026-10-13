// Tests del esquema del episodio (T-001-03).
//
// Este archivo vive fuera de `tsconfig.engine.json` (excluido explícitamente:
// `src/engine/**/*.test.ts`), así que sí puede usar `node:fs` para leer el
// contenido real desde disco. El motor de producción (`schema.ts`) no lo usa.
//
// Ningún test de este archivo escribe en disco: solo se lee
// `content/episodes/ep01-saludo.json` con `readFileSync`.
//
// Por instrucción de la tarea, no se copia texto narrativo del contenido:
// las aserciones se apoyan en ids de escena/nodo/locId, nunca en líneas de
// diálogo.

import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  isVisibleForAgeMode,
  parseEpisodeContent,
  PERSISTENCE_ALLOWLIST,
  validateEpisodeContent,
} from "./schema";

const currentDir = dirname(fileURLToPath(import.meta.url));
// app/src/engine -> app/src -> app -> raíz del repo -> content/episodes/...
const realEpisodePath = resolve(currentDir, "../../../content/episodes/ep01-saludo.json");

function readRealEpisodeRaw(): string {
  return readFileSync(realEpisodePath, "utf8");
}

/* ------------------------------------------------------------------------ */
/* Fixture mínimo y válido para los casos de referencias rotas              */
/* ------------------------------------------------------------------------ */

interface MinimalEpisodeOverrides {
  readonly lineNext?: string;
  readonly speaker?: string;
  readonly optionLocId?: string;
  readonly sceneChangeTarget?: string;
  /** Dejar la decisión `c001` con una única opción marcada solo para 9-12. */
  readonly onlyOlderKidsOption?: boolean;
}

/**
 * Construye un episodio mínimo pero completo: cumple el esquema y sus
 * validaciones de integridad referencial "de fábrica". Cada test rompe un
 * único campo a través de `overrides` para aislar exactamente un error.
 */
function buildMinimalEpisode(overrides: MinimalEpisodeOverrides = {}) {
  return {
    schemaVersion: "0.1.0",
    contentVersion: "0.1.0-draft",
    episodeId: "epTest",
    slug: "prueba",
    titleLocId: "TITLE",
    status: "draft-not-validated",
    updated: "2026-09-17",
    source: "fixture-de-prueba",
    reviewPolicy: {
      requiredReviewers: ["psicologia"],
      blockProductionIfPending: true,
      note: "nota",
    },
    defaultLocale: "es-BO",
    locales: ["es-BO"],
    ageModes: ["6-8", "9-12"],
    estimatedPlayMinutes: { "6-8": 5, "9-12": 5 },
    privacy: {
      persistChoices: false,
      persistFlagsOnly: true,
      freeTextInput: false,
      telemetry: "none",
      note: "nota",
    },
    cast: {
      capi: { model: "m1", displayNameLocId: "NAME_CAPI" },
      tomi: { model: "m2", displayNameLocId: "NAME_TOMI" },
      luna: { model: "m3", displayNameLocId: "NAME_LUNA" },
      clara: { model: "m4", displayNameLocId: "NAME_CLARA" },
      beto: { model: "m5", displayNameLocId: "NAME_BETO" },
      all: { model: null, displayNameLocId: "NAME_ALL" },
    },
    props: [],
    environment: [],
    globalUi: {
      pause: {
        alwaysVisible: true,
        promptLocId: "PAUSE_PROMPT",
        options: [{ id: "resume", locId: "PAUSE_RESUME" }],
      },
      replayLineButton: true,
      bodyCompassHud: { unlockedBy: "s01", states: ["calm"] },
    },
    progressFlags: [
      { id: "ep01.completed", persist: true },
      { id: "ep01.started", persist: true },
    ],
    sessionVars: [{ id: "greetCapi", persist: false }],
    entryScene: "s01",
    scenes: [
      {
        id: "s01",
        environment: {},
        camera: "wide",
        cast: ["capi"],
        onEnter: {},
        entryNode: "n001",
        nodes: [
          {
            id: "n001",
            type: "line",
            speaker: overrides.speaker ?? "capi",
            locId: "L001",
            anim: "wave",
            emotion: "happy",
            next: overrides.lineNext ?? "c001",
          },
          {
            id: "c001",
            type: "choice",
            options: overrides.onlyOlderKidsOption
              ? [{ id: "a", locId: "OPT_A", icon: "icon_a", ageModes: ["9-12"], next: "sc001" }]
              : [
                  { id: "a", locId: overrides.optionLocId ?? "OPT_A", icon: "icon_a", next: "sc001" },
                  { id: "b", locId: "OPT_B", icon: "icon_b", ageModes: ["9-12"], next: "sc001" },
                ],
          },
          { id: "sc001", type: "sceneChange", scene: overrides.sceneChangeTarget ?? "s02" },
        ],
      },
      {
        id: "s02",
        environment: {},
        camera: "wide",
        cast: ["capi"],
        onEnter: {},
        entryNode: "n002",
        nodes: [
          {
            id: "n002",
            type: "line",
            speaker: "capi",
            locId: "L001",
            anim: "wave",
            emotion: "happy",
            next: "end001",
          },
          { id: "end001", type: "end", setFlags: ["ep01.completed"] },
        ],
      },
    ],
    localization: {
      "es-BO": {
        TITLE: "Título",
        NAME_CAPI: "Capi",
        NAME_TOMI: "Tomi",
        NAME_LUNA: "Luna",
        NAME_CLARA: "Clara",
        NAME_BETO: "Beto",
        NAME_ALL: "Todos",
        PAUSE_PROMPT: "¿Pausar?",
        PAUSE_RESUME: "Seguir",
        L001: "Línea de prueba",
        OPT_A: "Opción A",
        OPT_B: "Opción B",
      },
    },
  };
}

describe("todos los episodios de content/", () => {
  // No se nombra ninguno: cada episodio nuevo que se añada a `content/` entra
  // solo en esta comprobación, y si no valida, rompe aquí y no en el aula.
  const carpeta = resolve(currentDir, "../../../content/episodes");
  const episodios = readdirSync(carpeta).filter((archivo) => archivo.endsWith(".json"));

  it("hay al menos un episodio versionado", () => {
    expect(episodios.length).toBeGreaterThan(0);
  });

  it.each(episodios)("%s valida contra el esquema y la integridad referencial", (archivo) => {
    const resultado = parseEpisodeContent(readFileSync(resolve(carpeta, archivo), "utf8"));

    if (!resultado.ok) {
      const detalle = resultado.issues
        .map((issue) => `  ${issue.path}: ${issue.message}`)
        .join("; ");
      throw new Error(`${archivo} no valida: ${detalle}`);
    }
    expect(resultado.ok).toBe(true);
  });

  it.each(episodios)("%s declara persistChoices en false y sin texto libre", (archivo) => {
    const resultado = parseEpisodeContent(readFileSync(resolve(carpeta, archivo), "utf8"));
    if (!resultado.ok) return;

    expect(resultado.episode.privacy.persistChoices).toBe(false);
    expect(resultado.episode.privacy.freeTextInput).toBe(false);
    expect(resultado.episode.privacy.telemetry).toBe("none");
  });
});

describe("validateEpisodeContent — fixture mínimo", () => {
  it("acepta el fixture mínimo sin overrides (línea base de los tests siguientes)", () => {
    const result = validateEpisodeContent(buildMinimalEpisode());

    expect(result.ok).toBe(true);
  });
});

describe("validateEpisodeContent — referencias rotas (un caso por assertion)", () => {
  it("reporta un `next` que apunta a un nodo inexistente", () => {
    const result = validateEpisodeContent(buildMinimalEpisode({ lineNext: "nodo_que_no_existe" }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.path === "scenes.s01.nodes.n001.next")).toBe(true);
  });

  it("reporta un `speaker` que no está en el elenco", () => {
    const result = validateEpisodeContent(buildMinimalEpisode({ speaker: "personaje_inventado" }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    // El esquema por forma ya rechaza cualquier `speaker` fuera del enum de
    // `cast`, así que el error llega desde Zod, no desde la integridad
    // referencial; en ambos casos el resultado es `ok: false` con una ruta
    // identificable.
    expect(result.issues.some((issue) => issue.path.includes("speaker"))).toBe(true);
  });

  it("reporta un `locId` de una opción que no existe en localization", () => {
    const result = validateEpisodeContent(buildMinimalEpisode({ optionLocId: "LOC_QUE_NO_EXISTE" }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      result.issues.some(
        (issue) => issue.path === "scenes.s01.nodes.c001.options.a.locId" && issue.message.includes("LOC_QUE_NO_EXISTE"),
      ),
    ).toBe(true);
  });

  it("reporta un `sceneChange` que apunta a una escena inexistente", () => {
    const result = validateEpisodeContent(buildMinimalEpisode({ sceneChangeTarget: "escena_que_no_existe" }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.path === "scenes.s01.nodes.sc001.scene")).toBe(true);
  });

  it("reporta una decisión que se queda sin opciones visibles para un modo de edad", () => {
    const result = validateEpisodeContent(buildMinimalEpisode({ onlyOlderKidsOption: true }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      result.issues.some(
        (issue) => issue.path === "scenes.s01.nodes.c001.options" && issue.message.includes('"6-8"'),
      ),
    ).toBe(true);
  });
});

describe("parseEpisodeContent — JSON corrupto", () => {
  it("falla de forma controlada y legible cuando el texto no es JSON válido", () => {
    const result = parseEpisodeContent("{ esto no es json válido");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.path).toBe("(raíz)");
    expect(result.issues[0]?.message).toMatch(/JSON válido/);
  });
});

describe("locId definido pero no usado", () => {
  it("se reporta como advertencia, no como error", () => {
    const base = buildMinimalEpisode();
    const withUnusedLoc = {
      ...base,
      localization: {
        "es-BO": {
          ...base.localization["es-BO"],
          LOC_SIN_USAR: "Nadie me referencia todavía",
        },
      },
    };

    const result = validateEpisodeContent(withUnusedLoc);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings.some((warning) => warning.path.endsWith("LOC_SIN_USAR"))).toBe(true);
  });
});

/* ------------------------------------------------------------------------ */
/* Contenido real (content/episodes/ep01-saludo.json)                       */
/* ------------------------------------------------------------------------ */

describe("el episodio real (content/episodes/ep01-saludo.json)", () => {
  it("valida sin errores", () => {
    const result = parseEpisodeContent(readRealEpisodeRaw());

    if (!result.ok) {
      throw new Error(`El episodio real no validó:\n${JSON.stringify(result.issues, null, 2)}`);
    }
    expect(result.ok).toBe(true);
    expect(result.episode.episodeId).toBe("ep01");
    expect(result.episode.scenes).toHaveLength(7);
  });

  it("no deja ningún locId real declarado pero sin usar (el contenido vigente los usa todos)", () => {
    const result = parseEpisodeContent(readRealEpisodeRaw());

    if (!result.ok) throw new Error("El episodio real no validó.");
    expect(result.warnings).toHaveLength(0);
  });

  describe("filtrado por edad (AC-3)", () => {
    it('oculta la opción de saludo "choque de puños" (solo 9-12) en modo 6-8 y la muestra en 9-12', () => {
      const result = parseEpisodeContent(readRealEpisodeRaw());
      if (!result.ok) throw new Error("El episodio real no validó.");

      const scene = result.episode.scenes.find((candidate) => candidate.id === "s03_saludo_capi");
      const choiceNode = scene?.nodes.find((node) => node.id === "s03_c001");
      if (!choiceNode || choiceNode.type !== "choice") {
        throw new Error("No se encontró el nodo de decisión s03_c001.");
      }
      const fistBumpOption = choiceNode.options.find((option) => option.id === "fist_bump");
      if (!fistBumpOption) {
        throw new Error("No se encontró la opción fist_bump.");
      }

      expect(isVisibleForAgeMode(fistBumpOption.ageModes, "6-8")).toBe(false);
      expect(isVisibleForAgeMode(fistBumpOption.ageModes, "9-12")).toBe(true);
    });

    it("oculta el nodo de decisión completo ante la insistencia de Don Beto (solo 9-12) en modo 6-8", () => {
      const result = parseEpisodeContent(readRealEpisodeRaw());
      if (!result.ok) throw new Error("El episodio real no validó.");

      const scene = result.episode.scenes.find((candidate) => candidate.id === "s06_adultos");
      const choiceNode = scene?.nodes.find((node) => node.id === "s06_c002");
      if (!choiceNode || choiceNode.type !== "choice") {
        throw new Error("No se encontró el nodo de decisión s06_c002.");
      }

      expect(isVisibleForAgeMode(choiceNode.ageModes, "6-8")).toBe(false);
      expect(isVisibleForAgeMode(choiceNode.ageModes, "9-12")).toBe(true);
    });
  });

  describe("diagnóstico de flags persistentes fuera de la allowlist", () => {
    it("permite persistir únicamente ep01.completed", () => {
      const result = parseEpisodeContent(readRealEpisodeRaw());
      if (!result.ok) throw new Error("El episodio real no validó.");

      expect(result.persistence.allowlist).toEqual(["ep01.completed"]);
      expect(PERSISTENCE_ALLOWLIST).toEqual(["ep01.completed"]);
    });

    it("reporta exactamente los flags con persist:true fuera de la allowlist", () => {
      const result = parseEpisodeContent(readRealEpisodeRaw());
      if (!result.ok) throw new Error("El episodio real no validó.");

      const ignored = [...result.persistence.ignoredFlags].sort();
      const esperado = [
        "ep01.started",
        "ep01.lastScene",
        "island.bridge_main",
        "island.bench",
        "mascot.star_01",
        "ep02.unlocked",
      ].sort();

      expect(ignored).toEqual(esperado);
      expect(ignored).not.toContain("ep01.completed");
    });
  });
});
