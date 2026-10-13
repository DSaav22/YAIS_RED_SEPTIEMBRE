// Punto de entrada del motor de contenido.
//
// Reglas de este directorio (AGENTS.md y PLAN-001):
// - TypeScript puro: sin React, sin DOM y sin Three.
// - El almacenamiento se usa solo a través de la interfaz `ProgressStore`.
// - Las compuertas que lo verifican son `tsconfig.engine.json`, el bloque
//   `src/engine/**` de `eslint.config.js` y `npm run check:safety`.
//
// Reexporta el motor completo de T-001-03 y T-001-04: `types` y `schema`
// (contratos y validación del contenido), `progress` (persistencia mínima) y
// `runtime` (navegación por nodos, edad y variables de sesión).

export type {
  AgeMode,
  BodyCompassHud,
  BranchNode,
  BridgePlankCard,
  BridgePlanksConfig,
  BridgePlanksMinigameNode,
  CircleOfThreeConfig,
  CircleOfThreeMinigameNode,
  CircleSlot,
  TrustCard,
  TrustCardZone,
  TrustCardsConfig,
  TrustCardsMinigameNode,
  Cast,
  CastEntry,
  CastId,
  ChoiceNode,
  ChoiceOption,
  CompassAnswer,
  CompassCard,
  CompassFeedback,
  CompassFeedbackVariant,
  ConditionAll,
  ConditionAny,
  ConditionComparison,
  ConditionExpression,
  BodyCompassPracticeConfig,
  BodyCompassPracticeMinigameNode,
  BranchRule,
  DebriefScreen,
  EndNode,
  EnvironmentId,
  EpisodeContent,
  EpisodeNode,
  EpisodeValidationResult,
  EstimatedPlayMinutes,
  FlagId,
  FreeLookMinigameConfig,
  FreeLookMinigameNode,
  GlobalUi,
  GlobalUiPause,
  GlobalUiPauseOption,
  HighFiveRhythmConfig,
  HighFiveRhythmMinigameNode,
  IconId,
  LineNode,
  LocId,
  MinigameId,
  MinigameNode,
  NodeId,
  NodeType,
  OnPlaceEffect,
  PersistenceDiagnostics,
  PreAction,
  PrivacyDeclaration,
  ProgressFlagDeclaration,
  PropId,
  Reaction,
  RetryPolicy,
  ReviewPolicy,
  RewardCelebration,
  RewardNode,
  Scene,
  SceneChangeNode,
  SceneId,
  SceneOnEnter,
  SessionVarDeclaration,
  SessionVarId,
  StopButton,
  SupportedNodeType,
  UiEvent,
  UnimplementedNodeType,
  ValidationIssue,
  ValidationWarning,
  WorldEvent,
} from "./types";
export { ALL_AGE_MODES } from "./types";

export {
  PERSISTENCE_ALLOWLIST,
  episodeContentSchema,
  isVisibleForAgeMode,
  parseEpisodeContent,
  validateEpisodeContent,
} from "./schema";

export type { AdaptadorDeAlmacenamiento, FlagDePersistencia, ProgressStore } from "./progress";
export {
  crearAlmacenamientoEnMemoria,
  crearProgressStore,
  esFlagDePersistencia,
  FLAGS_PERSISTIBLES,
} from "./progress";

export type {
  ChoiceOptionView,
  ChoiceView,
  EndView,
  ErrorView,
  LineView,
  MinigameView,
  RewardView,
  Runtime,
  RuntimeDiagnostic,
  RuntimeDiagnosticCode,
  RuntimeOptions,
  RuntimeState,
  RuntimeView,
  UnimplementedView,
} from "./runtime";
export { crearRuntime } from "./runtime";

export type {
  Encuentro,
  EncountersContent,
  EncounterValidationIssue,
  EncounterValidationResult,
  EncounterValidationWarning,
  LineaDeEncuentro,
} from "./encuentros";
export { encuentrosVisiblesPara, parseEncuentros, validateEncuentros } from "./encuentros";
