// Esquema Zod del episodio completo (T-001-03).
//
// Reglas de este directorio (AGENTS.md y PLAN-001):
// - TypeScript puro: sin React, sin DOM y sin Three. `zod` es una librería de
//   validación pura, no toca el navegador.
// - Nunca se lanza un `throw` opaco: la API pública devuelve un resultado
//   discriminado (`EpisodeValidationResult`) con mensajes legibles para
//   desarrollo (AC-1).
// - Este esquema valida el episodio completo, incluidos los tipos que el
//   primer runtime todavía no presenta (`minigame`, `branch`, `reward`;
//   spec.md «Aclaración de implementación, 2026-09-17»). Marcarlos como no
//   implementados es responsabilidad del runtime (T-001-04), no de este
//   archivo: aquí solo se comprueba que el contenido es válido.

import { z } from "zod";

import { ageModeSchema, castIdSchema, reviewMarkerSchema } from "./comun";
import { buildPersistenceDiagnostics, checkReferentialIntegrity } from "./integridad";
import { branchNodeSchema, minigameNodeSchema, rewardNodeSchema } from "./schema-nodos-pendientes";
import { isVisibleForAgeMode, PERSISTENCE_ALLOWLIST } from "./reglas";

// Se reexportan desde aquí porque son parte de la API del motor desde
// T-001-03 y hay código que las importa de `./schema`.
export { isVisibleForAgeMode, PERSISTENCE_ALLOWLIST };
import type { EpisodeContent, EpisodeValidationResult } from "./types";

// Todos los mensajes incorporados de zod (tipos, uniones, claves
// desconocidas, tamaños de arreglo…) salen en español. Es una llamada global
// de configuración; este módulo es el único punto del motor que usa `zod`,
// así que no compite con otra configuración.
z.config(z.locales.es());

/* ------------------------------------------------------------------------ */
/* Escalares y tipos compartidos                                            */
/* ------------------------------------------------------------------------ */

/* ------------------------------------------------------------------------ */
/* Metadatos del episodio                                                   */
/* ------------------------------------------------------------------------ */

const reviewPolicySchema = z
  .object({
    requiredReviewers: z.array(z.string()),
    blockProductionIfPending: z.boolean(),
    note: z.string(),
  })
  .strict();

const privacyDeclarationSchema = z
  .object({
    persistChoices: z.boolean(),
    persistFlagsOnly: z.boolean(),
    freeTextInput: z.boolean(),
    telemetry: z.string(),
    note: z.string(),
  })
  .strict();

const estimatedPlayMinutesSchema = z
  .object({
    "6-8": z.number(),
    "9-12": z.number(),
  })
  .strict();

const castEntrySchema = z
  .object({
    model: z.string().nullable(),
    displayNameLocId: z.string(),
    nameStatus: z.string().optional(),
    voiceColor: z.string().optional(),
  })
  .strict();

// Claves exhaustivas: `z.record` con una clave enum exige que las seis
// entradas de `cast` estén presentes, igual que el contenido real.
const castSchema = z.record(castIdSchema, castEntrySchema);

const progressFlagDeclarationSchema = z
  .object({
    id: z.string(),
    persist: z.boolean(),
    type: z.string().optional(),
  })
  .strict();

const sessionVarDeclarationSchema = z
  .object({
    id: z.string(),
    persist: z.boolean(),
  })
  .strict();

const globalUiPauseOptionSchema = z
  .object({
    id: z.string(),
    locId: z.string(),
  })
  .strict();

const globalUiPauseSchema = z
  .object({
    alwaysVisible: z.boolean(),
    promptLocId: z.string(),
    options: z.array(globalUiPauseOptionSchema),
  })
  .strict();

const bodyCompassHudSchema = z
  .object({
    unlockedBy: z.string(),
    states: z.array(z.string()),
  })
  .strict();

const globalUiSchema = z
  .object({
    pause: globalUiPauseSchema,
    replayLineButton: z.boolean(),
    bodyCompassHud: bodyCompassHudSchema,
  })
  .strict();

/* ------------------------------------------------------------------------ */
/* Efectos y eventos que disparan las líneas                                */
/* ------------------------------------------------------------------------ */

const uiEventSchema = z
  .object({
    compassPoint: z.string().optional(),
    unlockHud: z.string().optional(),
    hudPulse: z.string().optional(),
  })
  .strict();

const worldEventSchema = z
  .object({
    plankFliesTo: z.string().optional(),
    restore: z.array(z.string()).optional(),
  })
  .strict();

const preActionSchema = z
  .object({
    minigameExtraBeats: z.number().optional(),
  })
  .strict();

// Registro parcial: solo aparecen los personajes que reaccionan en ese punto
// del guion, por eso son seis campos opcionales y no un `z.record` exhaustivo.
const reactionSchema = z
  .object({
    capi: z.string().optional(),
    tomi: z.string().optional(),
    luna: z.string().optional(),
    clara: z.string().optional(),
    beto: z.string().optional(),
    all: z.string().optional(),
  })
  .strict();

/* ------------------------------------------------------------------------ */
/* Nodo `line`                                                              */
/* ------------------------------------------------------------------------ */

const lineNodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("line"),
    speaker: castIdSchema,
    locId: z.string(),
    anim: z.string(),
    emotion: z.string(),
    next: z.string(),
    audio: z.string().optional(),
    camera: z.string().optional(),
    uiEvent: uiEventSchema.optional(),
    review: reviewMarkerSchema.optional(),
    reviewNote: z.string().optional(),
    reviewPriority: z.string().optional(),
    feedbackTone: z.string().optional(),
    ageModes: z.array(ageModeSchema).optional(),
    reaction: reactionSchema.optional(),
    worldEvent: worldEventSchema.optional(),
    preAction: preActionSchema.optional(),
  })
  .strict();

/* ------------------------------------------------------------------------ */
/* Nodo `choice`                                                            */
/* ------------------------------------------------------------------------ */

const choiceOptionSchema = z
  .object({
    id: z.string(),
    locId: z.string(),
    icon: z.string(),
    next: z.string(),
    ageModes: z.array(ageModeSchema).optional(),
    setSession: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
  })
  .strict();

const retryPolicySchema = z
  .object({
    unlimited: z.boolean(),
    showAttemptCount: z.boolean(),
  })
  .strict();

const choiceNodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("choice"),
    options: z.array(choiceOptionSchema).min(1, "Una decisión necesita al menos una opción."),
    layout: z.string().optional(),
    ageModes: z.array(ageModeSchema).optional(),
    retryPolicy: retryPolicySchema.optional(),
  })
  .strict();

/* ------------------------------------------------------------------------ */
/* Nodo `sceneChange`                                                       */
/* ------------------------------------------------------------------------ */

const sceneChangeNodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("sceneChange"),
    scene: z.string(),
  })
  .strict();

/* ------------------------------------------------------------------------ */
/* Nodo `end`                                                               */
/* ------------------------------------------------------------------------ */

const debriefScreenSchema = z
  .object({
    titleLocId: z.string(),
    childLocId: z.string(),
    adultQuestionsLocIds: z.array(z.string()),
    adultQuestionsAgeModes: z.record(z.string(), z.array(ageModeSchema)).optional(),
    activityLocId: z.string(),
    familyLocIds: z.array(z.string()),
    adultOnly: z.boolean(),
  })
  .strict();

const endNodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("end"),
    setFlags: z.array(z.string()),
    clearSessionVars: z.boolean().optional(),
    debriefScreen: debriefScreenSchema.optional(),
  })
  .strict();

/* ------------------------------------------------------------------------ */
/* Unión de nodos y escena                                                  */
/* ------------------------------------------------------------------------ */

const episodeNodeSchema = z.discriminatedUnion("type", [
  lineNodeSchema,
  choiceNodeSchema,
  sceneChangeNodeSchema,
  endNodeSchema,
  minigameNodeSchema,
  branchNodeSchema,
  rewardNodeSchema,
]);

const sceneOnEnterSchema = z
  .object({
    setFlags: z.array(z.string()).optional(),
    setProgress: z.record(z.string(), z.string()).optional(),
  })
  .strict();

const sceneSchema = z
  .object({
    id: z.string(),
    // Subconjunto abierto de `environment`; se valida por referencia más
    // abajo, no aquí (los ids concretos los declara el propio documento).
    environment: z.record(z.string(), z.string()),
    camera: z.string(),
    cast: z.array(castIdSchema),
    onEnter: sceneOnEnterSchema,
    entryNode: z.string(),
    nodes: z.array(episodeNodeSchema).min(1, "Una escena necesita al menos un nodo."),
  })
  .strict();

/* ------------------------------------------------------------------------ */
/* Episodio completo                                                        */
/* ------------------------------------------------------------------------ */

export const episodeContentSchema = z
  .object({
    schemaVersion: z.string(),
    contentVersion: z.string(),
    episodeId: z.string(),
    slug: z.string(),
    titleLocId: z.string(),
    status: z.string(),
    updated: z.string(),
    source: z.string(),
    reviewPolicy: reviewPolicySchema,
    defaultLocale: z.string(),
    locales: z.array(z.string()),
    ageModes: z.array(ageModeSchema),
    estimatedPlayMinutes: estimatedPlayMinutesSchema,
    privacy: privacyDeclarationSchema,
    cast: castSchema,
    props: z.array(z.string()),
    environment: z.array(z.string()),
    globalUi: globalUiSchema,
    progressFlags: z.array(progressFlagDeclarationSchema),
    sessionVars: z.array(sessionVarDeclarationSchema),
    entryScene: z.string(),
    scenes: z.array(sceneSchema).min(1, "El episodio necesita al menos una escena."),
    localization: z.record(z.string(), z.record(z.string(), z.string())),
  })
  .strict();

/* ------------------------------------------------------------------------ */
/* Integridad referencial (lo que Zod solo no puede comprobar)              */
/* ------------------------------------------------------------------------ */

/** Convierte la ruta de un issue de zod en una cadena legible. */
function formatZodPath(path: readonly PropertyKey[]): string {
  let result = "";
  for (const segment of path) {
    if (typeof segment === "number") {
      result += `[${segment}]`;
    } else if (result.length === 0) {
      result += String(segment);
    } else {
      result += `.${String(segment)}`;
    }
  }
  return result.length > 0 ? result : "(raíz)";
}

/* ------------------------------------------------------------------------ */
/* API pública                                                              */
/* ------------------------------------------------------------------------ */

/**
 * Valida un valor ya interpretado (por ejemplo, el resultado de
 * `JSON.parse`) contra el esquema del episodio y sus reglas de integridad
 * referencial. Nunca lanza: siempre devuelve un resultado discriminado
 * (AC-1).
 */
export function validateEpisodeContent(data: unknown): EpisodeValidationResult {
  const parsed = episodeContentSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: formatZodPath(issue.path),
        message: `${issue.message} (código: ${issue.code}).`,
      })),
    };
  }

  const episode: EpisodeContent = parsed.data;
  const { issues, warnings } = checkReferentialIntegrity(episode);
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    episode,
    warnings,
    persistence: buildPersistenceDiagnostics(episode),
  };
}

/**
 * Punto de entrada de más alto nivel: recibe el texto crudo de un archivo de
 * episodio, lo interpreta como JSON y lo valida. Un JSON corrupto o mal
 * formado produce un `issue` legible en vez de una excepción (AC-1).
 */
export function parseEpisodeContent(raw: string): EpisodeValidationResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      issues: [{ path: "(raíz)", message: `El contenido no es JSON válido: ${reason}` }],
    };
  }

  return validateEpisodeContent(data);
}
