// Dónde van los props decorativos del mundo (módulo puro).
//
// Separado de `PropsDelMundo.tsx` por la misma razón que `mundo.ts` está
// separado de `IslandScene.tsx`: las coordenadas son datos que se pueden
// probar sin levantar Three ni React, y quien las cambie no tiene que saber
// JSX para hacerlo.

import { ALTURA_DEL_SUELO } from "./mundo";

/** Una posición en el plano x/z, igual que el resto del mundo. */
export type Punto = readonly [number, number];

/** Una pieza ya resuelta en coordenadas de mundo (x, y, z). */
export interface PosicionDeProp {
  readonly clave: string;
  readonly position: readonly [number, number, number];
}

/**
 * La brújula corporal, como objeto físico en la isla de los acuerdos
 * (`isla-acuerdos`, centro [16.5, -0.4] en `mundo.ts`, episodio 1).
 *
 * No es un control: no se pulsa, no abre el minijuego, no sustituye a la
 * interfaz 2D donde se practica de verdad (`BrujulaCorporal.tsx`). Es un
 * recordatorio del concepto central del episodio —notar cómo se siente el
 * cuerpo— en el sitio donde ocurre la conversación, igual que el faro o el
 * banco ya son parte del decorado sin ser interactivos.
 *
 * La posición está elegida a mano para no pisar el resto de piezas de esa
 * isla en `IslandScene.tsx` y para quedar dentro del radio caminable de la
 * isla (2,4 desde su centro): la distancia desde el centro hasta aquí es
 * ~1,77.
 *
 * Las coordenadas de las otras piezas NO son las de `TEMAS_POR_ISLA` (esas
 * son ángulo/distancia deseados, antes de `puntoLibreMasCercano`): son la
 * posición real que produce hoy `decoradoDeIsla` para `isla-acuerdos`,
 * calculada reproduciendo esa función a mano. Faro (`lighthouse`) en
 * ~[15.0,-2.0], árbol (`tree_round`) en ~[14.5,1.6], banco (`bench`) en
 * ~[18.9,1.1]; los cuatro tramos de sendero quedan en ~[17.9,-0.4],
 * ~[16.5,-1.8], ~[15.1,-0.4] y la esquina en [16.5,-0.4]. Si se mueve algún
 * ángulo/distancia de `TEMAS_POR_ISLA["isla-acuerdos"]`, o si cambia el radio
 * caminable de la isla en `mundo.ts`, hay que recalcular esto (no son
 * coordenadas fijas de por vida) y comprobar de nuevo que la brújula sigue
 * libre.
 */
export const POSICION_DE_BRUJULA: PosicionDeProp = {
  clave: "brujula-acuerdos",
  position: [16.0, ALTURA_DEL_SUELO, 1.3],
};

/** Altura a la que flota el bocadillo sobre el ancla de un personaje. */
export const ALTURA_DE_BURBUJA = 1.9;

/**
 * Un bocadillo por cada personaje del mundo abierto, colocado sobre su ancla
 * (`EncuentroEnElMundo.anclaje`). No sigue al personaje cuadro a cuadro: el
 * paseo (`deambular.ts`) lo mantiene cerca de su ancla con un radio corto a
 * propósito, así que la aproximación no se nota y no hace falta compartir el
 * `Group` que ya usa la cámara.
 *
 * No repite lo que hace `SenalDeMision`: aquella marca a dónde ir (un claro
 * de isla), esta marca con quién se puede hablar (una persona). Son dos
 * preguntas distintas y hoy el mundo solo contesta la primera antes de
 * llegar cerca.
 */
export function posicionesDeBurbujas(
  anclajes: readonly { readonly id: string; readonly anclaje: Punto }[],
): readonly PosicionDeProp[] {
  return anclajes.map(({ id, anclaje }) => ({
    clave: id,
    position: [anclaje[0], ALTURA_DE_BURBUJA, anclaje[1]],
  }));
}
