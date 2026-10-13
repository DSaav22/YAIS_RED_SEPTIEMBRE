// Dónde está y hacia dónde va cada personaje en la isla (T-001-06).
//
// Módulo puro: sin React y sin Three, para poder probar el movimiento sin
// WebGL. Los números salen de las cajas contenedoras reales de los GLB: la
// isla mide 6,27 × 6,30 con el césped a y≈0,2, y el claro donde se conversa
// está en el centro.
//
// El personaje no aparece de golpe en su sitio: entra caminando desde el
// sendero cada vez que empieza una escena, y vuelve a caminar cuando el guion
// pide locomoción. Fuera de eso se queda donde está: la conversación no es
// una coreografía y moverse por moverse le robaría atención al diálogo.

import { esIntencionDeLocomocion } from "../../shared/animation-intents";
import type { CharacterId } from "../../shared/assets";
import type { GestoDeEscena } from "./estado-de-escena";

export type Posicion = readonly [number, number, number];

/** Sitio de cada personaje en el claro, mirando a la cámara. */
export const POSICION_BASE: Readonly<Record<CharacterId, Posicion>> = {
  capi: [-0.65, 0, 0.5],
  tomi: [0.65, 0, 0.5],
  luna: [1.7, 0, 0.3],
  clara: [-1.7, 0, 0.3],
  beto: [2.4, 0, 0.1],
};

/**
 * Por dónde se entra: el extremo del sendero, al frente de la isla. Está
 * dentro del borde (la isla llega a z≈3,1) para que nadie aparezca flotando
 * sobre el agua.
 */
export const ENTRADA: Posicion = [-1.4, 0, 2.3];

/**
 * A dónde camina quien tiene una intención de locomoción: un paso al frente
 * del claro, donde la cámara lo ve entero.
 */
export const PUNTO_DE_ENCUENTRO: Posicion = [0, 0, 1.5];

/**
 * A dónde debe dirigirse un personaje. Solo quien tiene el turno se mueve por
 * el guion; el resto espera en su sitio.
 */
export function destinoDe(
  characterId: CharacterId,
  gesto: GestoDeEscena,
  esProtagonista: boolean,
): Posicion {
  if (esProtagonista && gesto.tipo === "intencion" && esIntencionDeLocomocion(gesto.intent)) {
    return PUNTO_DE_ENCUENTRO;
  }
  return POSICION_BASE[characterId];
}
