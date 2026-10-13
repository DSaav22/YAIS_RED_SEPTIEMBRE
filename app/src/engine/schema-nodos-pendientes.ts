// Esquema de los nodos que el primer runtime todavía no presenta (T-001-03):
// `minigame`, `branch` y `reward`.
//
// Se validan con el mismo rigor que el resto aunque no tengan interfaz: el
// contenido versionado los declara, y dejarlos sin validar sería descubrir
// que están rotos el día que se implementen (spec.md, «Aclaración de
// implementación, 2026-09-17»).
//
// Viven aparte porque son la mitad del esquema en volumen y ninguno se toca
// cuando se edita una línea de diálogo.

import { z } from "zod";

import type { ConditionAll, ConditionAny, ConditionExpression } from "./types";
import { castIdSchema, reviewMarkerSchema, ageModeSchema } from "./comun";

/* ------------------------------------------------------------------------ */
/* Nodo `minigame` (sin UI todavía; se valida con el mismo rigor)           */
/* ------------------------------------------------------------------------ */

const freeLookConfigSchema = z
  .object({
    continueTrigger: z.string(),
    timeLimitSeconds: z.number().nullable(),
  })
  .strict();

const compassCardSchema = z
  .object({
    id: z.string(),
    locId: z.string(),
    art: z.string(),
  })
  .strict();

const compassAnswerSchema = z
  .object({
    id: z.string(),
    locId: z.string(),
    icon: z.string(),
  })
  .strict();

const compassFeedbackSchema = z
  .object({
    speaker: castIdSchema,
    locId: z.string(),
    anim: z.string(),
    review: reviewMarkerSchema.optional(),
    // El guion anota por qué una línea necesita revisión; se conserva para
    // que la nota viaje con la línea y no se pierda en el camino.
    reviewNote: z.string().optional(),
  })
  .strict();

const compassFeedbackVariantSchema = z
  .object({
    speaker: castIdSchema,
    locId: z.string(),
    anim: z.string(),
    review: reviewMarkerSchema.optional(),
    cardIndexFrom: z.number(),
  })
  .strict();

const bodyCompassPracticeConfigSchema = z
  .object({
    anyAnswerValid: z.boolean(),
    storeAnswers: z.boolean(),
    cards: z.array(compassCardSchema),
    answers: z.array(compassAnswerSchema),
    feedbackAfterEachCard: compassFeedbackSchema,
    feedbackVariantAfterCard: compassFeedbackVariantSchema,
  })
  .strict();

const stopButtonSchema = z
  .object({
    locId: z.string(),
    alwaysVisible: z.boolean(),
    keyboard: z.string(),
    onPress: z.string(),
  })
  .strict();

const highFiveRhythmConfigSchema = z
  .object({
    beatsBeforeQuestion: z.number(),
    speedRequired: z.boolean(),
    stopButton: stopButtonSchema,
    questionNode: z.string(),
  })
  .strict();

const bridgePlankCardSchema = z
  .object({
    id: z.string(),
    locId: z.string(),
    prop: z.string(),
  })
  .strict();

const onPlaceEffectSchema = z
  .object({
    sfx: z.string(),
  })
  .strict();

const bridgePlanksConfigSchema = z
  .object({
    anyOrderValid: z.boolean(),
    inputModes: z.array(z.string()),
    cards: z.array(bridgePlankCardSchema),
    onPlace: onPlaceEffectSchema,
  })
  .strict();

const freeLookMinigameNodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("minigame"),
    minigameId: z.literal("free_look"),
    config: freeLookConfigSchema,
    next: z.string(),
  })
  .strict();

const bodyCompassPracticeMinigameNodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("minigame"),
    minigameId: z.literal("body_compass_practice"),
    config: bodyCompassPracticeConfigSchema,
    next: z.string(),
  })
  .strict();

const highFiveRhythmMinigameNodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("minigame"),
    minigameId: z.literal("high_five_rhythm"),
    config: highFiveRhythmConfigSchema,
    next: z.string(),
  })
  .strict();

const bridgePlanksMinigameNodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("minigame"),
    minigameId: z.literal("bridge_planks"),
    config: bridgePlanksConfigSchema,
    next: z.string(),
  })
  .strict();

// Unión discriminada anidada: cada variante comparte `type: "minigame"` y se
// distingue por `minigameId`. Zod resuelve la unión interna antes de la
// externa (probado contra esta versión exacta de la librería).
export 
/* --- Episodio 2: fichas de confianza y círculo de 3 --- */

const trustCardZoneSchema = z
  .object({
    id: z.string().min(1),
    locId: z.string().min(1),
    icon: z.string().min(1),
    ageModes: z.array(ageModeSchema).optional(),
  })
  .strict();

const trustCardSchema = z
  .object({
    id: z.string().min(1),
    locId: z.string().min(1),
    expectedZone: z.string().min(1),
    ageModes: z.array(ageModeSchema).optional(),
    review: reviewMarkerSchema.optional(),
    anyZoneValid: z.boolean().optional(),
  })
  .strict();

const trustCardsConfigSchema = z
  .object({
    anyOrderValid: z.boolean(),
    // Se exige `false`, no solo se declara: guardar lo que un niño clasificó
    // sería un perfil (Constitución I).
    storeAnswers: z.literal(false),
    zones: z.array(trustCardZoneSchema).min(2),
    cards: z.array(trustCardSchema).min(1),
    feedbackByZone: z.record(z.string(), compassFeedbackSchema),
    feedbackUnexpected: compassFeedbackSchema,
    feedbackHint: compassFeedbackSchema,
    feedbackAnyZone: compassFeedbackSchema,
  })
  .strict();

export const trustCardsMinigameNodeSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("minigame"),
    minigameId: z.literal("trust_cards"),
    config: trustCardsConfigSchema,
    next: z.string().min(1),
  })
  .strict();

const circleSlotSchema = z
  .object({
    id: z.string().min(1),
    locId: z.string().min(1),
    icon: z.string().min(1),
  })
  .strict();

const circleOfThreeConfigSchema = z
  .object({
    // Igual que arriba: nunca se guarda en quién pensó el niño.
    storeAnswers: z.literal(false),
    slots: z.array(circleSlotSchema).min(1),
    confirmLocId: z.string().min(1),
    stillThinkingLocId: z.string().min(1),
    feedbackComplete: compassFeedbackSchema,
    feedbackStillThinking: compassFeedbackSchema,
  })
  .strict();

export const circleOfThreeMinigameNodeSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("minigame"),
    minigameId: z.literal("circle_of_three"),
    config: circleOfThreeConfigSchema,
    next: z.string().min(1),
  })
  .strict();

export const minigameNodeSchema = z.discriminatedUnion("minigameId", [
  freeLookMinigameNodeSchema,
  bodyCompassPracticeMinigameNodeSchema,
  highFiveRhythmMinigameNodeSchema,
  bridgePlanksMinigameNodeSchema,
  trustCardsMinigameNodeSchema,
  circleOfThreeMinigameNodeSchema,
]);

/* ------------------------------------------------------------------------ */
/* Nodo `branch` (condiciones recursivas, sin UI todavía)                   */
/* ------------------------------------------------------------------------ */

const conditionComparisonSchema = z
  .object({
    var: z.string(),
    eq: z.string().optional(),
    neq: z.string().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasEq = value.eq !== undefined;
    const hasNeq = value.neq !== undefined;
    if (hasEq === hasNeq) {
      ctx.addIssue({
        code: "custom",
        message: 'Cada condición necesita exactamente una comparación: "eq" o "neq", no ambas ni ninguna.',
      });
    }
  });

// Esquema recursivo: `all`/`any` contienen más expresiones de condición. Los
// tres `const` se refieren entre sí dentro de callbacks de `z.lazy`, que solo
// se ejecutan cuando algo intenta parsear (para entonces los tres ya están
// asignados). Es el patrón que documenta la propia librería para tipos
// recursivos.
const conditionExpressionSchema: z.ZodType<ConditionExpression> = z.lazy(() =>
  z.union([conditionComparisonSchema, conditionAllSchema, conditionAnySchema]),
);

const conditionAllSchema: z.ZodType<ConditionAll> = z.lazy(() =>
  z
    .object({
      all: z.array(conditionExpressionSchema),
    })
    .strict(),
);

const conditionAnySchema: z.ZodType<ConditionAny> = z.lazy(() =>
  z
    .object({
      any: z.array(conditionExpressionSchema),
    })
    .strict(),
);

const branchRuleSchema = z
  .object({
    if: conditionExpressionSchema,
    next: z.string(),
  })
  .strict();

export const branchNodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("branch"),
    conditions: z.array(branchRuleSchema),
    else: z.string(),
    ageModes: z.array(ageModeSchema).optional(),
  })
  .strict();

/* ------------------------------------------------------------------------ */
/* Nodo `reward` (cosmético, nunca puntaje; Constitución V)                 */
/* ------------------------------------------------------------------------ */

const rewardCelebrationSchema = z
  .object({
    cast: z.array(castIdSchema),
    anim: z.string(),
  })
  .strict();

export const rewardNodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("reward"),
    restore: z.array(z.string()),
    cosmetic: z.array(z.string()),
    celebration: rewardCelebrationSchema,
    setFlags: z.array(z.string()),
    conditionalOnPerformance: z.boolean(),
    next: z.string(),
  })
  .strict();
