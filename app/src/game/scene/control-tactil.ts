// Joystick virtual para caminar en tablet y celular (controles táctiles).
//
// Módulo puro: sin React, sin DOM y sin Three, para poder probar la
// matemática del arrastre sin WebGL, igual que `control-del-jugador.ts` y
// `camara.ts`.
//
// La dirección que devuelve este módulo es CRUDA, en el mismo sistema de ejes
// que `direccionDeTeclas` (W es (0,-1), D es (1,0)): quien integra la
// proyecta sobre la cámara con `direccionRelativaALaCamara`. Mezclar esa
// proyección aquí duplicaría la regla y las dos matemáticas se
// desincronizarían tarde o temprano.

/**
 * Radio del joystick en píxeles de pantalla. Es el mismo número que usa el
 * componente para dibujar el círculo exterior: si un valor cambia sin el
 * otro, el dedo se sale del dibujo antes de saturar el movimiento.
 */
export const RADIO_DEL_JOYSTICK = 44;

/**
 * Fracción del radio que hay que arrastrar antes de que el joystick pida
 * algo. Un dedo posado no está siempre perfectamente quieto (el pulso tiembla
 * unos pocos píxeles), y sin esta zona muerta el personaje caminaría solo
 * porque alguien apoyó el dedo. 0.15 es chico a propósito: el control tiene
 * que sentirse inmediato, no perezoso.
 */
export const ZONA_MUERTA = 0.15;

/**
 * Convierte un arrastre en píxeles de pantalla a una dirección del mundo.
 *
 * `centro` es dónde empezó el toque (el pulgar del joystick en reposo) y
 * `punto` es dónde está el dedo ahora. Devuelve `null` si el arrastre no
 * llega a la zona muerta: es la señal de "soltar todo", no un vector (0,0)
 * que habría que comparar aparte en cada sitio que lo consuma.
 *
 * El eje Y de pantalla crece hacia abajo, así que arrastrar hacia arriba
 * (dy negativo) es "adelante", z negativo, igual que la tecla W.
 */
export function direccionDeArrastre(
  centro: { readonly x: number; readonly y: number },
  punto: { readonly x: number; readonly y: number },
  radio: number = RADIO_DEL_JOYSTICK,
): { readonly x: number; readonly z: number } | null {
  const dx = punto.x - centro.x;
  const dy = punto.y - centro.y;
  const distancia = Math.hypot(dx, dy);

  if (distancia < radio * ZONA_MUERTA) return null;

  // Se satura en el radio: arrastrar más lejos del círculo no camina más
  // rápido, solo dice "al máximo en esta dirección". Sin este tope, un dedo
  // que se desliza fuera del joystick (algo frecuente en pantallas chicas)
  // le pediría al personaje una velocidad que el resto del juego no conoce.
  //
  // `distancia` no puede ser 0 en este punto: si lo fuera, ya habría vuelto
  // `null` en la comprobación de la zona muerta de arriba.
  const distanciaSaturada = Math.min(distancia, radio);
  const magnitud = distanciaSaturada / radio;

  return {
    x: (dx / distancia) * magnitud,
    z: (dy / distancia) * magnitud,
  };
}
