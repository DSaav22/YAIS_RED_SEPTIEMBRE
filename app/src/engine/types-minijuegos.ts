// Tipos de los minijuegos del episodio (T-001-03).
//
// Se validan con el mismo rigor que el resto del contenido aunque el primer
// runtime no los presente (spec.md, «Aclaración de implementación,
// 2026-09-17»). Viven aparte porque son un tercio de los tipos del contenido
// y ninguno se toca cuando se edita una línea de diálogo.
//
// Reglas de este directorio (AGENTS.md): TypeScript puro, sin React, sin DOM
// y sin Three. Los campos opcionales se declaran como `T | undefined` porque
// el proyecto compila con `exactOptionalPropertyTypes`.

import type { AgeMode, CastId, IconId, LocId, NodeId, PropId } from "./types";

/* --- Minijuegos: se validan con el mismo rigor que el resto del contenido
 * aunque el primer runtime todavía no los presenta (spec.md, «Aclaración de
 * implementación, 2026-09-17»; PLAN-001). --- */

export interface FreeLookMinigameConfig {
  readonly continueTrigger: string;
  readonly timeLimitSeconds: number | null;
}

export interface CompassCard {
  readonly id: string;
  readonly locId: LocId;
  readonly art: string;
}

export interface CompassAnswer {
  readonly id: string;
  readonly locId: LocId;
  readonly icon: IconId;
}

export interface CompassFeedback {
  readonly speaker: CastId;
  readonly locId: LocId;
  readonly anim: string;
  readonly review?: "VALIDAR" | undefined;
  readonly reviewNote?: string | undefined;
}

export interface CompassFeedbackVariant extends CompassFeedback {
  readonly cardIndexFrom: number;
}

export interface BodyCompassPracticeConfig {
  readonly anyAnswerValid: boolean;
  readonly storeAnswers: boolean;
  readonly cards: readonly CompassCard[];
  readonly answers: readonly CompassAnswer[];
  readonly feedbackAfterEachCard: CompassFeedback;
  readonly feedbackVariantAfterCard: CompassFeedbackVariant;
}

export interface StopButton {
  readonly locId: LocId;
  readonly alwaysVisible: boolean;
  readonly keyboard: string;
  readonly onPress: NodeId;
}

export interface HighFiveRhythmConfig {
  readonly beatsBeforeQuestion: number;
  readonly speedRequired: boolean;
  readonly stopButton: StopButton;
  readonly questionNode: NodeId;
}

export interface BridgePlankCard {
  readonly id: string;
  readonly locId: LocId;
  readonly prop: PropId;
}

export interface OnPlaceEffect {
  readonly sfx: string;
}

export interface BridgePlanksConfig {
  readonly anyOrderValid: boolean;
  readonly inputModes: readonly string[];
  readonly cards: readonly BridgePlankCard[];
  readonly onPlace: OnPlaceEffect;
}

export interface FreeLookMinigameNode {
  readonly id: NodeId;
  readonly type: "minigame";
  readonly minigameId: "free_look";
  readonly config: FreeLookMinigameConfig;
  readonly next: NodeId;
}

export interface BodyCompassPracticeMinigameNode {
  readonly id: NodeId;
  readonly type: "minigame";
  readonly minigameId: "body_compass_practice";
  readonly config: BodyCompassPracticeConfig;
  readonly next: NodeId;
}

export interface HighFiveRhythmMinigameNode {
  readonly id: NodeId;
  readonly type: "minigame";
  readonly minigameId: "high_five_rhythm";
  readonly config: HighFiveRhythmConfig;
  readonly next: NodeId;
}

export interface BridgePlanksMinigameNode {
  readonly id: NodeId;
  readonly type: "minigame";
  readonly minigameId: "bridge_planks";
  readonly config: BridgePlanksConfig;
  readonly next: NodeId;
}

export type MinigameNode =
  | FreeLookMinigameNode
  | BodyCompassPracticeMinigameNode
  | HighFiveRhythmMinigameNode
  | BridgePlanksMinigameNode
  | TrustCardsMinigameNode
  | CircleOfThreeMinigameNode;

/* --- Episodio 2: fichas de confianza (`trust_cards`) --- */

/**
 * Una zona donde se coloca una ficha. El guion declara tres: «Eso es
 * cuidar», «Eso no es cuidar» y «No sé, lo pregunto», esta última solo para
 * 9-12.
 */
export interface TrustCardZone {
  readonly id: string;
  readonly locId: LocId;
  readonly icon: IconId;
  readonly ageModes?: readonly AgeMode[] | undefined;
}

/**
 * Una ficha con una conducta. `expectedZone` es dónde la coloca el guion,
 * pero equivocarse no es perder: el contenido declara una pista y, al tercer
 * intento, Capi la coloca y lo explica. `anyZoneValid` marca la ficha que el
 * guion acepta en cualquier zona («Es una persona grande»).
 */
export interface TrustCard {
  readonly id: string;
  readonly locId: LocId;
  readonly expectedZone: string;
  readonly ageModes?: readonly AgeMode[] | undefined;
  readonly review?: "VALIDAR" | undefined;
  readonly anyZoneValid?: boolean | undefined;
}

export interface TrustCardsConfig {
  readonly anyOrderValid: boolean;
  /** Siempre `false`: lo que el niño clasificó no se guarda (Constitución I). */
  readonly storeAnswers: boolean;
  readonly zones: readonly TrustCardZone[];
  readonly cards: readonly TrustCard[];
  /** Qué responde Capi cuando la ficha cae donde el guion espera. */
  readonly feedbackByZone: Readonly<Record<string, CompassFeedback>>;
  /** Cuando cae en otra zona: nunca un error, una pregunta. */
  readonly feedbackUnexpected: CompassFeedback;
  readonly feedbackHint: CompassFeedback;
  /** Para la ficha que vale en cualquier zona. */
  readonly feedbackAnyZone: CompassFeedback;
}

export interface TrustCardsMinigameNode {
  readonly id: NodeId;
  readonly type: "minigame";
  readonly minigameId: "trust_cards";
  readonly config: TrustCardsConfig;
  readonly next: NodeId;
}

/* --- Episodio 2: mi círculo de 3 (`circle_of_three`) --- */

/** Un sitio del círculo: casa, escuela o comunidad. Sin nombres ni fotos. */
export interface CircleSlot {
  readonly id: string;
  readonly locId: LocId;
  readonly icon: IconId;
}

/**
 * El círculo de tres. No se escribe ni se guarda a nadie: el niño solo marca
 * que ya pensó en alguien, o que todavía lo está pensando, y el círculo se
 * ilumina igual en los dos casos (Constitución I y III).
 */
export interface CircleOfThreeConfig {
  /** Siempre `false`: nunca se guarda en quién pensó. */
  readonly storeAnswers: boolean;
  readonly slots: readonly CircleSlot[];
  readonly confirmLocId: LocId;
  readonly stillThinkingLocId: LocId;
  readonly feedbackComplete: CompassFeedback;
  readonly feedbackStillThinking: CompassFeedback;
}

export interface CircleOfThreeMinigameNode {
  readonly id: NodeId;
  readonly type: "minigame";
  readonly minigameId: "circle_of_three";
  readonly config: CircleOfThreeConfig;
  readonly next: NodeId;
}
