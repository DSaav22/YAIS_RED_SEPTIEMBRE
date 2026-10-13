// Los encuentros repartidos por el mundo (T-001-06, exploración).
//
// Une tres cosas que viven separadas a propósito: el contenido de
// `content/encuentros/` (qué se dice), `mundo.ts` (dónde se puede estar) y
// `shared/assets.ts` (quién tiene modelo 3D). Aquí no se escribe ni una
// palabra dirigida a un niño ni una ruta de archivo.
//
// Un encuentro solo llega al mundo si su personaje tiene el GLB sincronizado.
// Los demás quedan en el contenido, listos para el día que su modelo entre en
// el presupuesto de assets: mejor no estar que estar como un hueco.

import { encuentrosVisiblesPara, type AgeMode, type CastId, type Encuentro } from "../../engine";
import { ENCUENTROS_DE_LA_ISLA } from "../../shared/encuentros";
import { PRELOADED_CHARACTER_IDS, type CharacterId } from "../../shared/assets";
import { esCaminable } from "./mundo";

/** Un encuentro ya colocado en el mundo, con su personaje y su sitio. */
export interface EncuentroEnElMundo {
  readonly id: string;
  readonly characterId: CharacterId;
  readonly anclaje: readonly [number, number];
  readonly encuentro: Encuentro;
}

/**
 * A qué distancia del personaje se ofrece hablar. Más corta que la de los
 * claros de misión: hablar con alguien es acercarse a él, y si el radio fuera
 * grande se ofrecería conversación desde el otro lado de la isla.
 */
export const RADIO_PARA_HABLAR = 1.4;

function tieneModelo(castId: CastId): castId is CharacterId {
  return (PRELOADED_CHARACTER_IDS as readonly string[]).includes(castId);
}

/**
 * Los encuentros que este modo de edad puede vivir hoy: visibles por edad,
 * con personaje que tiene modelo, y anclados en suelo pisable.
 *
 * Un anclaje sobre el agua sería un personaje flotando al que nunca se puede
 * llegar; se descarta en silencio aquí y lo vigila un test, en vez de confiar
 * en que las coordenadas del contenido estén bien.
 */
export function encuentrosDelMundo(ageMode: AgeMode): readonly EncuentroEnElMundo[] {
  if (!ENCUENTROS_DE_LA_ISLA.ok) return [];

  return encuentrosVisiblesPara(ENCUENTROS_DE_LA_ISLA.contenido, ageMode).flatMap((encuentro) => {
    if (!tieneModelo(encuentro.castId)) return [];
    const [x, z] = encuentro.anclaje;
    if (!esCaminable(x, z)) return [];
    return [
      {
        id: encuentro.id,
        characterId: encuentro.castId,
        anclaje: encuentro.anclaje,
        encuentro,
      },
    ];
  });
}

/** El encuentro al que uno se ha acercado, o `null`. Gana el más cercano. */
export function encuentroCercano(
  x: number,
  z: number,
  disponibles: readonly EncuentroEnElMundo[],
): EncuentroEnElMundo | null {
  let mejor: EncuentroEnElMundo | null = null;
  let mejorDistancia = RADIO_PARA_HABLAR;

  for (const candidato of disponibles) {
    const distancia = Math.hypot(x - candidato.anclaje[0], z - candidato.anclaje[1]);
    if (distancia > mejorDistancia) continue;
    mejor = candidato;
    mejorDistancia = distancia;
  }

  return mejor;
}
