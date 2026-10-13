// Control del personaje por quien juega (T-001-06, prototipo).
//
// Módulo puro: sin React y sin Three, para poder probar las reglas del
// movimiento sin WebGL.
//
// Qué es esto y qué no es. SPEC-001 define el Episodio 1 como diálogo con
// decisiones y manda la exploración libre a SPEC-004; esto es una capa de
// presentación encima, no una mecánica del guion: mover a Capi no dispara
// ninguna línea, no cambia de escena y no afecta a ninguna decisión. El
// episodio se juega entero sin tocar esto, que es lo que AC-8 exige de la
// ruta 2D.
//
// Cuando el mundo deba disparar el guion de verdad —acercarse a alguien y que
// hable— hará falta un modelo espacial en `content/`, que hoy no existe: las
// escenas son grafos de nodos, sin una sola coordenada. Eso es cambio de
// modelo de contenido y va por spec, no por aquí.

import { acercarAZonaCaminable, esCaminable } from "./mundo";
import type { Posicion } from "./posiciones";

/**
 * Lo que pide quien juega. Dos formas, porque hay dos maneras de pedirlo:
 * con el teclado se empuja en una dirección, y con un toque o un clic se
 * señala un sitio al que ir (AC-6: con un solo puntero se puede todo).
 */
export type ComandoDeJugador =
  | { readonly tipo: "direccion"; readonly x: number; readonly z: number }
  | { readonly tipo: "destino"; readonly posicion: Posicion };

/**
 * Hasta dónde llega el suelo que se puede pisar lo decide `mundo.ts`: tres
 * islas y dos puentes. Aquí solo se reexporta la comprobación para que el
 * control y el bucle de caminata usen exactamente la misma regla que el
 * decorado.
 */
export { acercarAZonaCaminable, esCaminable };

/** Teclas de movimiento, por dirección. */
const TECLAS: Readonly<Record<string, readonly [number, number]>> = {
  KeyW: [0, -1],
  KeyS: [0, 1],
  KeyA: [-1, 0],
  KeyD: [1, 0],
};

/**
 * Solo letras: las flechas desplazan la página y mueven la selección de los
 * controles del diálogo, que es la ruta accesible y manda. Robarle esas
 * teclas al teclado sería cambiar el juego por el mundo a costa de quien
 * navega sin ratón.
 */
export function direccionDeTecla(code: string): readonly [number, number] | null {
  return TECLAS[code] ?? null;
}

/** Suma las direcciones de las teclas pulsadas y la normaliza. */
export function direccionDeTeclas(teclas: Iterable<string>): { x: number; z: number } | null {
  let x = 0;
  let z = 0;
  for (const tecla of teclas) {
    const direccion = direccionDeTecla(tecla);
    if (!direccion) continue;
    x += direccion[0];
    z += direccion[1];
  }
  if (x === 0 && z === 0) return null;
  const largo = Math.hypot(x, z);
  return { x: x / largo, z: z / largo };
}

/**
 * Devuelve la posición pedida si se puede pisar, y si no la más cercana que
 * sí: tocar el agua lleva a la orilla en vez de no hacer nada.
 */
export function dentroDelMundo(x: number, z: number): { x: number; z: number } {
  return acercarAZonaCaminable(x, z);
}
