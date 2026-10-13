// Acercarse a un sitio del mundo (T-001-06, exploración).
//
// Módulo puro: sin React y sin Three.
//
// Es lo que convierte el archipiélago en algo que se juega y no solo en algo
// por lo que se anda: al llegar al claro de una isla que tiene episodio, el
// juego ofrece entrar en él.
//
// Ofrece, no entra. La diferencia importa y es deliberada:
//
// - Entrar solo, por pisar un sitio, secuestraría el control justo cuando
//   quien juega estaba explorando. Explorar tiene que poder no llevar a nada.
// - Un episodio arranca porque alguien lo pide, y se puede dejar siempre
//   (Constitución V).
//
// Aquí no hay ni una palabra de contenido: este módulo devuelve el `id` del
// episodio, y el título con el que se ofrece se lee de `content/`.

import { ISLAS_CON_EPISODIO, type IslaDelMundo } from "./mundo";

/** Un sitio del mundo al que acercarse dispara una oferta. */
export interface PuntoDeEncuentro {
  readonly clave: string;
  readonly episodioId: string;
  readonly posicion: readonly [number, number];
}

/**
 * A qué distancia del claro se considera que ya se llegó. Generoso a
 * propósito: si hubiera que pararse en el punto exacto, el mundo parecería
 * que "a veces no funciona", que es el mismo motivo por el que tocar el agua
 * lleva a la orilla en vez de no hacer nada.
 */
export const RADIO_DE_ENCUENTRO = 1.6;

/** Los claros del mundo, derivados de las islas que tienen episodio. */
export const PUNTOS_DE_ENCUENTRO: readonly PuntoDeEncuentro[] = ISLAS_CON_EPISODIO.map(
  (isla: IslaDelMundo & { episodioId: string; puntoDeEncuentro: readonly [number, number] }) => ({
    clave: isla.clave,
    episodioId: isla.episodioId,
    posicion: isla.puntoDeEncuentro,
  }),
);

/**
 * El claro en el que se está, o `null` si no se está en ninguno. Si dos
 * quedaran a tiro —hoy no pasa, y un test lo vigila— gana el más cercano, no
 * el primero de la lista.
 */
export function puntoDeEncuentroCercano(
  x: number,
  z: number,
  puntos: readonly PuntoDeEncuentro[] = PUNTOS_DE_ENCUENTRO,
): PuntoDeEncuentro | null {
  let mejor: PuntoDeEncuentro | null = null;
  let mejorDistancia = RADIO_DE_ENCUENTRO;

  for (const punto of puntos) {
    const distancia = Math.hypot(x - punto.posicion[0], z - punto.posicion[1]);
    if (distancia > mejorDistancia) continue;
    mejor = punto;
    mejorDistancia = distancia;
  }

  return mejor;
}
