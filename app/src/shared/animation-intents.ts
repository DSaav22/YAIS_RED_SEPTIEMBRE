// Mapa temporal de intenciones narrativas de ep01-saludo.json a los cinco
// clips reales de animación (PLAN-001 "Contratos", T-001-06,
// docs/HANDOFF-DESARROLLO.md).
//
// El guion usa 61 intenciones distintas ("anim") y cada personaje solo tiene
// cinco clips: `Idle`, locomoción (`Walk` o `Roll`), `Wave`, `Listen` y
// `TalkGesture`. Este archivo nunca adivina un clip por parecido de nombre en
// tiempo de ejecución: cada intención tiene una entrada explícita, con una
// marca honesta de fidelidad (Constitución IX, "Honestidad sobre el
// estado"):
//
// - "aproximado": el clip disponible representa razonablemente la
//   intención original del guion.
// - "fallback": no existe nada parecido en los cinco clips; se usa el clip
//   disponible más neutral como relleno honesto, no como actuación real de
//   la intención.
//
// La tabla legible para quien dirige el arte (no programador) vive en
// `docs/MAPA-ANIMACIONES.md`. `animation-intents.test.ts` comprueba que este
// mapa cubre exactamente las intenciones que usa
// `content/episodes/ep01-saludo.json` y que ningún clip asignado le falta al
// personaje real (`assets/production/animated/v001/*/asset.json`).

import { CHARACTERS, type CharacterAsset, type CharacterId, type RuntimeClip } from "./assets";

/** Qué tan bien representa el clip asignado a la intención original del guion. */
export type AnimationFidelity = "aproximado" | "fallback";

/**
 * Clip "lógico" de una intención antes de resolverse a un personaje real.
 * `"Locomotion"` no es un `RuntimeClip`: se resuelve a `Walk` o `Roll` según
 * `CHARACTERS[personaje].locomotion` (Luna no tiene `Walk`, PLAN-001). Ningún
 * dato del mapa fija `"Walk"` ni `"Roll"` directamente para no romper a Luna
 * si una intención de locomoción llega a usarse con ella (p. ej.
 * `cross_bridge_celebrate`, que reúne a todo el elenco).
 */
export type LogicalClip = "Idle" | "Wave" | "Listen" | "TalkGesture" | "Locomotion";

/** Entrada explícita del mapa: un clip lógico más su marca de fidelidad. */
export interface AnimationIntentEntry {
  readonly clip: LogicalClip;
  readonly fidelity: AnimationFidelity;
}

/**
 * Las intenciones fijas del guion (no dependen de una variable de
 * sesión). Las 2 intenciones restantes del guion usan la forma dinámica
 * `greet_from_session:*` (ver `PREFIJO_SALUDO_DE_SESION` más abajo); juntas
 * suman las 61 intenciones distintas de `content/episodes/ep01-saludo.json`.
 */
export type AnimationIntentId =
  | "apologize_from_distance"
  | "arms_half_open_no_approach"
  | "arrive_kind_firm"
  | "arrive_wave_distance"
  | "ask"
  | "calm_firm"
  | "cap_on_smile"
  | "celebrate"
  | "come_close"
  | "compass_pulse"
  | "cross_bridge_celebrate"
  | "crouch_eye_level"
  | "explain"
  | "give_compass"
  | "greet_distance"
  | "greet_fist_bump"
  | "greet_high_five"
  | "greet_hug_short"
  | "greet_hug_side_short"
  | "greet_wave"
  | "head_tilt"
  | "hold_compass"
  | "idle"
  | "invite"
  | "jump"
  | "look_around"
  | "look_path"
  | "lower_hands_smile"
  | "nod"
  | "nod_apologetic"
  | "nod_smile"
  | "open_arms"
  | "open_palm_soft"
  | "place_compass_hud"
  | "playful_one_step"
  | "point_bridge"
  | "point_horizon"
  | "point_star"
  | "raise_both_hands"
  | "raise_hand_soft"
  | "run_open_arms"
  | "scratch_head"
  | "scratch_head_smile"
  | "shrug_happy"
  | "sit_bench"
  | "small_bubble"
  | "smile"
  | "smile_roll_forward"
  | "star_glow"
  | "step_back_hand_chest"
  | "stop_notice"
  | "thumbs_up"
  | "tip_cap"
  | "touch_backpack"
  | "touch_belly_cheeks"
  | "touch_wheel"
  | "uh_face_soft"
  | "walk_with_player"
  | "wave"
  | "wave_turn_chair"
  // Episodio 2
  | "hand_on_shoulder"
  | "point_self"
  | "give_map"
  | "wink";

/**
 * Mapa explícito y exhaustivo de las 59 intenciones fijas. `Record` total
 * (no parcial): si `AnimationIntentId` gana un miembro sin entrada aquí, el
 * typecheck falla antes que cualquier test.
 */
export const ANIMATION_INTENT_MAP: Readonly<Record<AnimationIntentId, AnimationIntentEntry>> = {
  // Habla y gestos genéricos de conversación (piden explicar, preguntar,
  // invitar, disculparse): el gesto de charla los cubre razonablemente.
  apologize_from_distance: { clip: "TalkGesture", fidelity: "aproximado" },
  ask: { clip: "TalkGesture", fidelity: "aproximado" },
  calm_firm: { clip: "TalkGesture", fidelity: "aproximado" },
  explain: { clip: "TalkGesture", fidelity: "aproximado" },
  invite: { clip: "TalkGesture", fidelity: "aproximado" },
  small_bubble: { clip: "TalkGesture", fidelity: "aproximado" },
  smile: { clip: "TalkGesture", fidelity: "aproximado" },

  // Habla con un gesto físico concreto que ningún clip representa: relleno
  // honesto con el mismo clip de charla, sin fingir el gesto específico.
  arrive_kind_firm: { clip: "TalkGesture", fidelity: "fallback" },
  arms_half_open_no_approach: { clip: "Wave", fidelity: "fallback" },
  cap_on_smile: { clip: "TalkGesture", fidelity: "fallback" },
  celebrate: { clip: "TalkGesture", fidelity: "fallback" },
  come_close: { clip: "TalkGesture", fidelity: "fallback" },
  give_compass: { clip: "TalkGesture", fidelity: "fallback" },
  hold_compass: { clip: "TalkGesture", fidelity: "fallback" },
  jump: { clip: "TalkGesture", fidelity: "fallback" },
  lower_hands_smile: { clip: "TalkGesture", fidelity: "fallback" },
  place_compass_hud: { clip: "TalkGesture", fidelity: "fallback" },
  point_bridge: { clip: "TalkGesture", fidelity: "fallback" },
  // Añadida junto con `EP01_S06_F003` (borrador sin aprobar, ver
  // content/episodes/ep01-saludo.json): Capi señala hacia afuera de la isla
  // al hablar de contarle a un adulto en la vida real. Mismo patrón que el
  // resto de gestos de señalar: no hay un clip de "apuntar" propio, así que
  // cae en `TalkGesture` como las demás.
  point_horizon: { clip: "TalkGesture", fidelity: "fallback" },
  point_star: { clip: "TalkGesture", fidelity: "fallback" },
  scratch_head: { clip: "TalkGesture", fidelity: "fallback" },
  scratch_head_smile: { clip: "TalkGesture", fidelity: "fallback" },
  shrug_happy: { clip: "TalkGesture", fidelity: "fallback" },
  step_back_hand_chest: { clip: "TalkGesture", fidelity: "fallback" },
  stop_notice: { clip: "TalkGesture", fidelity: "fallback" },
  thumbs_up: { clip: "TalkGesture", fidelity: "fallback" },
  tip_cap: { clip: "TalkGesture", fidelity: "fallback" },
  touch_backpack: { clip: "TalkGesture", fidelity: "fallback" },
  touch_belly_cheeks: { clip: "TalkGesture", fidelity: "fallback" },
  touch_wheel: { clip: "TalkGesture", fidelity: "fallback" },
  uh_face_soft: { clip: "TalkGesture", fidelity: "fallback" },

  // Saludos y gestos de brazos/manos: el saludo con la mano es el más
  // cercano a "aproximado" cuando la intención ya es un saludo o una
  // despedida a distancia; el resto son contactos distintos (abrazo, choque
  // de puños o de manos, brazos abiertos) que no tienen clip propio.
  arrive_wave_distance: { clip: "Wave", fidelity: "aproximado" },
  greet_distance: { clip: "Wave", fidelity: "aproximado" },
  greet_wave: { clip: "Wave", fidelity: "aproximado" },
  greet_fist_bump: { clip: "Wave", fidelity: "fallback" },
  greet_high_five: { clip: "Wave", fidelity: "fallback" },
  greet_hug_short: { clip: "Wave", fidelity: "fallback" },
  greet_hug_side_short: { clip: "Wave", fidelity: "fallback" },
  open_arms: { clip: "Wave", fidelity: "fallback" },
  open_palm_soft: { clip: "Wave", fidelity: "fallback" },
  raise_both_hands: { clip: "Wave", fidelity: "fallback" },
  raise_hand_soft: { clip: "Wave", fidelity: "fallback" },
  wave: { clip: "Wave", fidelity: "aproximado" },
  wave_turn_chair: { clip: "Wave", fidelity: "fallback" },

  // Episodio 2. Ninguna tiene clip propio: no existe gesto de mano en el
  // hombro, de señalarse, de entregar algo ni de guiño en los cinco clips
  // grabados, así que se rellenan con el más neutral que no mienta.
  hand_on_shoulder: { clip: "Listen", fidelity: "fallback" },
  point_self: { clip: "TalkGesture", fidelity: "fallback" },
  give_map: { clip: "TalkGesture", fidelity: "fallback" },
  wink: { clip: "TalkGesture", fidelity: "fallback" },

  // Escucha, asentimiento y atención: el clip de escucha cubre bien la
  // idea de "prestar atención"; mirar alrededor no tiene equivalente, así
  // que cae a un estado neutral en vez de fingir una mirada que no existe.
  head_tilt: { clip: "Listen", fidelity: "aproximado" },
  nod: { clip: "Listen", fidelity: "aproximado" },
  nod_apologetic: { clip: "Listen", fidelity: "aproximado" },
  nod_smile: { clip: "Listen", fidelity: "aproximado" },
  look_around: { clip: "Idle", fidelity: "fallback" },
  look_path: { clip: "Idle", fidelity: "fallback" },

  // Estados neutrales o resueltos por el HUD/props, no por el cuerpo.
  compass_pulse: { clip: "Idle", fidelity: "aproximado" },
  idle: { clip: "Idle", fidelity: "aproximado" },
  star_glow: { clip: "Idle", fidelity: "aproximado" },
  crouch_eye_level: { clip: "Idle", fidelity: "fallback" },
  sit_bench: { clip: "Idle", fidelity: "fallback" },

  // Locomoción: se resuelve a `Walk` o `Roll` según el personaje.
  walk_with_player: { clip: "Locomotion", fidelity: "aproximado" },
  cross_bridge_celebrate: { clip: "Locomotion", fidelity: "fallback" },
  playful_one_step: { clip: "Locomotion", fidelity: "fallback" },
  run_open_arms: { clip: "Locomotion", fidelity: "fallback" },
  smile_roll_forward: { clip: "Locomotion", fidelity: "fallback" },
} as const;

/**
 * Prefijo de la forma dinámica de saludo: el gesto depende del valor de una
 * variable de sesión (`greetTomi`, `greetBeto`), no de un nombre fijo. El
 * guion la usa como `greet_from_session:greetTomi` y
 * `greet_from_session:greetBeto`; se modela como una forma con prefijo, no
 * como dos literales sueltos.
 */
export const PREFIJO_SALUDO_DE_SESION = "greet_from_session:";

/** Intención dinámica: `greet_from_session:` seguido del nombre de la variable de sesión. */
export type SessionGreetingIntent = `${typeof PREFIJO_SALUDO_DE_SESION}${string}`;

/** Toda intención de animación válida del episodio: fija o dependiente de sesión. */
export type AnimationIntent = AnimationIntentId | SessionGreetingIntent;

/**
 * `true` si `intent` es la forma dinámica `greet_from_session:*`. Es una
 * comprobación estructural explícita (el prefijo), nunca una adivinanza por
 * substring del resto del nombre.
 */
export function esSaludoDeSesion(intent: string): intent is SessionGreetingIntent {
  return intent.startsWith(PREFIJO_SALUDO_DE_SESION);
}

/**
 * Clip por valor real de la variable de sesión de saludo (`greetCapi`,
 * `greetTomi`, `greetBeto`; ver `sessionVars` en ep01-saludo.json). Usa la
 * misma fidelidad que su intención estática equivalente arriba: un saludo
 * con la mano o a distancia es "aproximado"; los demás son "fallback"
 * porque no existe un clip de abrazo ni de choque de puños/manos. `"none"`
 * (nadie eligió saludo) cae a `Idle`, que es lo que ya ocurre en la calma
 * neutral del personaje.
 */
const SALUDO_POR_VALOR_SESION: Readonly<Record<string, AnimationIntentEntry>> = {
  wave: { clip: "Wave", fidelity: "aproximado" },
  distance: { clip: "Wave", fidelity: "aproximado" },
  high_five: { clip: "Wave", fidelity: "fallback" },
  fist_bump: { clip: "Wave", fidelity: "fallback" },
  hug: { clip: "Wave", fidelity: "fallback" },
  none: { clip: "Idle", fidelity: "aproximado" },
};

function esIntentoFijo(intent: string): intent is AnimationIntentId {
  return Object.prototype.hasOwnProperty.call(ANIMATION_INTENT_MAP, intent);
}

/** Advertencia solo de desarrollo (PLAN-001): nunca en producción, nunca visible para un niño. */
function advertirEnDesarrollo(mensaje: string): void {
  if (import.meta.env.DEV) {
    console.warn(`[animation-intents] ${mensaje}`);
  }
}

/**
 * Clips que representan un gesto puntual: empiezan, terminan y devuelven al
 * personaje a `Idle`. Los demás (`Idle`, `Listen` y la locomoción) son
 * estados sostenidos que se mantienen mientras dure la situación.
 *
 * Los cinco clips grabados están marcados `loop: true` en los `asset.json`
 * de `assets/production/animated/v001`, así que esta distinción no
 * la trae el archivo: es una decisión de reproducción, y por eso vive aquí,
 * declarada y con nombre, en vez de deducirse en la escena (T-001-06).
 */
export const CLIPS_DE_GESTO_PUNTUAL: readonly RuntimeClip[] = ["Wave", "TalkGesture"];

/** `true` si el clip debe reproducirse una vez y volver a `Idle`. */
export function esGestoPuntual(clip: RuntimeClip): boolean {
  return CLIPS_DE_GESTO_PUNTUAL.includes(clip);
}

/**
 * `true` si la intención del guion implica desplazarse (`walk_with_player`,
 * `run_open_arms`, `cross_bridge_celebrate`, `playful_one_step`,
 * `smile_roll_forward`). La escena lo usa para mover al personaje de verdad
 * y no solo reproducirle el clip de caminar en el sitio, que se vería como
 * andar sobre una cinta.
 */
export function esIntencionDeLocomocion(intent: string): boolean {
  return esIntentoFijo(intent) && ANIMATION_INTENT_MAP[intent].clip === "Locomotion";
}

/**
 * Avisa, solo en desarrollo, de que esta intención no tiene un clip que la
 * represente y se está usando un relleno honesto. Es el punto 3 de T-001-06
 * ("advertir solo en desarrollo cuando haya fallback"): sin esto, las 40
 * intenciones marcadas `fallback` se reproducirían en silencio y nadie que
 * dirija arte sabría cuáles se ven aproximadas.
 */
function advertirSiEsRelleno(entrada: AnimationIntentEntry, intent: string): void {
  if (entrada.fidelity !== "fallback") return;
  advertirEnDesarrollo(
    `la intención "${intent}" no tiene clip propio; se rellena con "${entrada.clip}". Ver docs/MAPA-ANIMACIONES.md.`,
  );
}

/** Resuelve un clip lógico al `RuntimeClip` real de un personaje, con fallback a `Idle`. */
function resolverClipParaPersonaje(
  clipLogico: LogicalClip,
  personaje: CharacterAsset,
  intent: string,
): RuntimeClip {
  const clip: RuntimeClip = clipLogico === "Locomotion" ? personaje.locomotion : clipLogico;
  if (!personaje.availableClips.includes(clip)) {
    advertirEnDesarrollo(
      `la intención "${intent}" pide el clip "${clip}", que este personaje no tiene; se usa "Idle".`,
    );
    return "Idle";
  }
  return clip;
}

/**
 * Resuelve una intención de animación del guion a un `RuntimeClip` que el
 * personaje realmente tiene (PLAN-001: "el mapa de animaciones nunca adivina
 * por nombre en tiempo de ejecución"). Solo usa las entradas explícitas de
 * `ANIMATION_INTENT_MAP` y, para `greet_from_session:*`, el valor real de la
 * variable de sesión indicada.
 *
 * Una intención desconocida, sin valor de sesión reconocido, o cuyo clip no
 * existe para ese personaje, cae siempre a `"Idle"` y solo advierte en
 * desarrollo (`import.meta.env.DEV`); nunca lanza y nunca es visible para un
 * niño.
 */
export function resolveAnimationClip(
  intent: string,
  character: CharacterId,
  sessionVars?: Readonly<Record<string, string | boolean>>,
): RuntimeClip {
  const personaje = CHARACTERS[character];

  if (esSaludoDeSesion(intent)) {
    const nombreVariable = intent.slice(PREFIJO_SALUDO_DE_SESION.length);
    const valor = sessionVars?.[nombreVariable];
    const entrada = typeof valor === "string" ? SALUDO_POR_VALOR_SESION[valor] : undefined;
    if (!entrada) {
      advertirEnDesarrollo(
        `"${intent}" no tiene un valor de sesión de saludo reconocido ("${String(valor)}"); se usa "Idle".`,
      );
      return "Idle";
    }
    advertirSiEsRelleno(entrada, intent);
    return resolverClipParaPersonaje(entrada.clip, personaje, intent);
  }

  if (!esIntentoFijo(intent)) {
    advertirEnDesarrollo(`intención de animación desconocida "${intent}"; se usa "Idle".`);
    return "Idle";
  }

  const entrada = ANIMATION_INTENT_MAP[intent];
  advertirSiEsRelleno(entrada, intent);
  return resolverClipParaPersonaje(entrada.clip, personaje, intent);
}
