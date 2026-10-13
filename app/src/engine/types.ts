// Tipos puros del contenido narrativo (T-001-03).
//
// Reglas de este directorio (AGENTS.md y PLAN-001):
// - TypeScript puro: sin React, sin DOM y sin Three.
// - Este archivo no importa `zod`. `schema.ts` construye el validador en
//   tiempo de ejecución y, si el contenido es válido, produce valores de
//   estos mismos tipos (la asignación final los mantiene sincronizados:
//   si un campo no coincide, el typecheck de `schema.ts` falla).
//
// Los campos opcionales se declaran como `T | undefined` (no solo `T`)
// porque el proyecto compila con `exactOptionalPropertyTypes` y el
// resultado de `zod` (`.optional()`) infiere exactamente esa forma.

// La unión `EpisodeNode` de más abajo necesita el tipo, además de
// reexportarlo. Los dos archivos se importan entre sí y no pasa nada: son
// tipos, no valores, y se borran al compilar.
import type { MinigameNode } from "./types-minijuegos";

/** Modo de edad leído del contenido (PLAN-001, contrato fijo). */
export type AgeMode = "6-8" | "9-12";

/** Los dos modos de edad declarados por PLAN-001, en un orden estable. */
export const ALL_AGE_MODES: readonly AgeMode[] = ["6-8", "9-12"];

/**
 * Tipos de nodo que el primer runtime sabe presentar (PLAN-001, contrato
 * fijo).
 */
export type SupportedNodeType = "line" | "choice" | "sceneChange" | "end";

/**
 * Tipos de nodo que el episodio completo declara pero que el primer runtime
 * todavía no presenta (spec.md, «Aclaración de implementación, 2026-09-17»).
 * El esquema los valida con el mismo rigor que los soportados; el runtime
 * debe mostrar un diagnóstico de desarrollo si los alcanza, nunca
 * presentarlos como contenido jugable terminado.
 */
export type UnimplementedNodeType = "minigame" | "branch" | "reward";

/** Unión de todos los tipos de nodo presentes en el contenido versionado. */
export type NodeType = SupportedNodeType | UnimplementedNodeType;

/**
 * Identificador de integrante del elenco declarado en `cast`, incluida la
 * entrada `"all"`: no tiene modelo propio, representa al elenco completo en
 * eventos como la celebración final.
 */
export type CastId = "capi" | "tomi" | "luna" | "clara" | "beto" | "all";

export type SceneId = string;
export type NodeId = string;
export type LocId = string;
export type FlagId = string;
export type SessionVarId = string;
export type IconId = string;
export type PropId = string;
export type EnvironmentId = string;

/** Identificador de minijuego declarado en el contenido versionado. */
export type MinigameId =
  | "free_look"
  | "body_compass_practice"
  | "high_five_rhythm"
  | "bridge_planks"
  // Episodio 2
  | "trust_cards"
  | "circle_of_three";

export interface CastEntry {
  readonly model: string | null;
  readonly displayNameLocId: LocId;
  readonly nameStatus?: string | undefined;
  readonly voiceColor?: string | undefined;
}

/** El elenco completo del episodio: exactamente las seis entradas fijas. */
export type Cast = Readonly<Record<CastId, CastEntry>>;

export interface ReviewPolicy {
  readonly requiredReviewers: readonly string[];
  readonly blockProductionIfPending: boolean;
  readonly note: string;
}

export interface PrivacyDeclaration {
  readonly persistChoices: boolean;
  readonly persistFlagsOnly: boolean;
  readonly freeTextInput: boolean;
  readonly telemetry: string;
  readonly note: string;
}

export interface EstimatedPlayMinutes {
  readonly "6-8": number;
  readonly "9-12": number;
}

export interface ProgressFlagDeclaration {
  readonly id: FlagId;
  readonly persist: boolean;
  readonly type?: string | undefined;
}

export interface SessionVarDeclaration {
  readonly id: SessionVarId;
  readonly persist: boolean;
}

export interface GlobalUiPauseOption {
  readonly id: string;
  readonly locId: LocId;
}

export interface GlobalUiPause {
  readonly alwaysVisible: boolean;
  readonly promptLocId: LocId;
  readonly options: readonly GlobalUiPauseOption[];
}

export interface BodyCompassHud {
  readonly unlockedBy: SceneId;
  readonly states: readonly string[];
}

export interface GlobalUi {
  readonly pause: GlobalUiPause;
  readonly replayLineButton: boolean;
  readonly bodyCompassHud: BodyCompassHud;
}

/** Evento de interfaz que dispara una línea (brújula corporal, HUD). */
export interface UiEvent {
  readonly compassPoint?: string | undefined;
  readonly unlockHud?: string | undefined;
  readonly hudPulse?: string | undefined;
}

/**
 * Efecto sobre el mundo 3D que dispara una línea. Es solo el dato; la
 * interpretación visual vive en `app/src/game`, nunca aquí.
 */
export interface WorldEvent {
  readonly plankFliesTo?: EnvironmentId | undefined;
  readonly restore?: readonly EnvironmentId[] | undefined;
}

/** Ajuste que una línea aplica al minijuego siguiente antes de mostrarse. */
export interface PreAction {
  readonly minigameExtraBeats?: number | undefined;
}

/**
 * Reacción física de otros integrantes del elenco ante una línea (p. ej.
 * Tomi se detiene en seco). Cada clave es opcional: solo aparecen los
 * personajes que reaccionan en ese punto del guion.
 */
export interface Reaction {
  readonly capi?: string | undefined;
  readonly tomi?: string | undefined;
  readonly luna?: string | undefined;
  readonly clara?: string | undefined;
  readonly beto?: string | undefined;
  readonly all?: string | undefined;
}

export interface LineNode {
  readonly id: NodeId;
  readonly type: "line";
  readonly speaker: CastId;
  readonly locId: LocId;
  readonly anim: string;
  readonly emotion: string;
  readonly next: NodeId;
  readonly audio?: string | undefined;
  readonly camera?: string | undefined;
  readonly uiEvent?: UiEvent | undefined;
  readonly review?: "VALIDAR" | undefined;
  readonly reviewNote?: string | undefined;
  readonly reviewPriority?: string | undefined;
  readonly feedbackTone?: string | undefined;
  readonly ageModes?: readonly AgeMode[] | undefined;
  readonly reaction?: Reaction | undefined;
  readonly worldEvent?: WorldEvent | undefined;
  readonly preAction?: PreAction | undefined;
}

export interface ChoiceOption {
  readonly id: string;
  readonly locId: LocId;
  readonly icon: IconId;
  readonly next: NodeId;
  readonly ageModes?: readonly AgeMode[] | undefined;
  readonly setSession?: Readonly<Record<SessionVarId, string | boolean>> | undefined;
}

export interface RetryPolicy {
  readonly unlimited: boolean;
  readonly showAttemptCount: boolean;
}

export interface ChoiceNode {
  readonly id: NodeId;
  readonly type: "choice";
  readonly options: readonly ChoiceOption[];
  readonly layout?: string | undefined;
  readonly ageModes?: readonly AgeMode[] | undefined;
  readonly retryPolicy?: RetryPolicy | undefined;
}

export interface SceneChangeNode {
  readonly id: NodeId;
  readonly type: "sceneChange";
  readonly scene: SceneId;
}

export interface DebriefScreen {
  readonly titleLocId: LocId;
  readonly childLocId: LocId;
  readonly adultQuestionsLocIds: readonly LocId[];
  readonly adultQuestionsAgeModes?: Readonly<Record<LocId, readonly AgeMode[]>> | undefined;
  readonly activityLocId: LocId;
  readonly familyLocIds: readonly LocId[];
  readonly adultOnly: boolean;
}

export interface EndNode {
  readonly id: NodeId;
  readonly type: "end";
  readonly setFlags: readonly FlagId[];
  readonly clearSessionVars?: boolean | undefined;
  readonly debriefScreen?: DebriefScreen | undefined;
}

// Los tipos de los minijuegos viven en `types-minijuegos.ts` y se reexportan
// aquí: quien importa `./types` los sigue encontrando donde siempre.
export type {
  BodyCompassPracticeConfig,
  CircleOfThreeConfig,
  CircleOfThreeMinigameNode,
  CircleSlot,
  TrustCard,
  TrustCardZone,
  TrustCardsConfig,
  TrustCardsMinigameNode,
  BodyCompassPracticeMinigameNode,
  BridgePlankCard,
  BridgePlanksConfig,
  BridgePlanksMinigameNode,
  CompassAnswer,
  CompassCard,
  CompassFeedback,
  CompassFeedbackVariant,
  FreeLookMinigameConfig,
  FreeLookMinigameNode,
  HighFiveRhythmConfig,
  HighFiveRhythmMinigameNode,
  MinigameNode,
  OnPlaceEffect,
  StopButton,
} from "./types-minijuegos";

/* --- Ramas condicionales (`branch`): sin UI en el primer runtime. --- */

export interface ConditionComparison {
  readonly var: string;
  readonly eq?: string | undefined;
  readonly neq?: string | undefined;
}

export interface ConditionAll {
  readonly all: readonly ConditionExpression[];
}

export interface ConditionAny {
  readonly any: readonly ConditionExpression[];
}

export type ConditionExpression = ConditionComparison | ConditionAll | ConditionAny;

export interface BranchRule {
  readonly if: ConditionExpression;
  readonly next: NodeId;
}

export interface BranchNode {
  readonly id: NodeId;
  readonly type: "branch";
  readonly conditions: readonly BranchRule[];
  readonly else: NodeId;
  readonly ageModes?: readonly AgeMode[] | undefined;
}

/* --- Recompensas (`reward`): siempre cosméticas y por completar, nunca por
 * acertar (Constitución V). --- */

export interface RewardCelebration {
  readonly cast: readonly CastId[];
  readonly anim: string;
}

export interface RewardNode {
  readonly id: NodeId;
  readonly type: "reward";
  readonly restore: readonly EnvironmentId[];
  readonly cosmetic: readonly FlagId[];
  readonly celebration: RewardCelebration;
  readonly setFlags: readonly FlagId[];
  readonly conditionalOnPerformance: boolean;
  readonly next: NodeId;
}

/** Unión discriminada por `type` de todos los nodos que el contenido puede declarar. */
export type EpisodeNode =
  | LineNode
  | ChoiceNode
  | SceneChangeNode
  | EndNode
  | MinigameNode
  | BranchNode
  | RewardNode;

export interface SceneOnEnter {
  readonly setFlags?: readonly FlagId[] | undefined;
  readonly setProgress?: Readonly<Record<FlagId, string>> | undefined;
}

export interface Scene {
  readonly id: SceneId;
  /** Subconjunto de `EnvironmentId` de esta escena y su estado (`"broken"`, etc.). */
  readonly environment: Readonly<Record<string, string>>;
  readonly camera: string;
  readonly cast: readonly CastId[];
  readonly onEnter: SceneOnEnter;
  readonly entryNode: NodeId;
  readonly nodes: readonly EpisodeNode[];
}

export interface EpisodeContent {
  readonly schemaVersion: string;
  readonly contentVersion: string;
  readonly episodeId: string;
  readonly slug: string;
  readonly titleLocId: LocId;
  readonly status: string;
  readonly updated: string;
  readonly source: string;
  readonly reviewPolicy: ReviewPolicy;
  readonly defaultLocale: string;
  readonly locales: readonly string[];
  readonly ageModes: readonly AgeMode[];
  readonly estimatedPlayMinutes: EstimatedPlayMinutes;
  readonly privacy: PrivacyDeclaration;
  readonly cast: Cast;
  readonly props: readonly PropId[];
  readonly environment: readonly EnvironmentId[];
  readonly globalUi: GlobalUi;
  readonly progressFlags: readonly ProgressFlagDeclaration[];
  readonly sessionVars: readonly SessionVarDeclaration[];
  readonly entryScene: SceneId;
  readonly scenes: readonly Scene[];
  readonly localization: Readonly<Record<string, Readonly<Record<LocId, string>>>>;
}

/* --- Resultado de validación (AC-1): nunca un throw opaco ni una pantalla
 * en blanco. --- */

/** Ruta legible del problema (p. ej. `scenes.s06_adultos.nodes.s06_b001.else`). */
export interface ValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface ValidationWarning {
  readonly path: string;
  readonly message: string;
}

/**
 * Diagnóstico de desarrollo sobre `progressFlags` (T-001-03, punto 3 de la
 * tarea). El JSON vigente declara siete flags con `persist: true`, pero
 * SPEC-001 y AGENTS.md solo permiten persistir `ep01.completed`.
 * `ignoredFlags` enumera los que el runtime va a ignorar: se mantienen en
 * memoria de desarrollo y nunca llegan a `ProgressStore`.
 */
export interface PersistenceDiagnostics {
  readonly allowlist: readonly FlagId[];
  readonly ignoredFlags: readonly FlagId[];
}

/** Resultado discriminado de validar el episodio completo. */
export type EpisodeValidationResult =
  | {
      readonly ok: true;
      readonly episode: EpisodeContent;
      readonly warnings: readonly ValidationWarning[];
      readonly persistence: PersistenceDiagnostics;
    }
  | {
      readonly ok: false;
      readonly issues: readonly ValidationIssue[];
    };
