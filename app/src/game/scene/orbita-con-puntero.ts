// Distingue un TOQUE (caminar hasta el punto) de un ARRASTRE (girar la
// cámara) a partir de los eventos de puntero del suelo. Módulo puro: sin
// React, sin DOM y sin Three, para poder probar la máquina de estados sin
// levantar WebGL (igual que `camara.ts`).
//
// Antes, cualquier gesto sobre el suelo se interpretaba como «caminar hasta
// aquí», así que no había manera de mirar alrededor sin moverse. Aquí un
// gesto empieza como candidato a toque y solo se convierte en arrastre si el
// puntero se aleja lo suficiente de donde empezó; mientras tanto no gira
// nada, para no mover la cámara por un toque que tiembla un poco.

/**
 * Distancia en píxeles que hay que recorrer para que un gesto deje de ser un
 * toque y pase a ser un arrastre.
 *
 * Es generoso a propósito: un niño de seis años con el dedo en una tablet no
 * mantiene el punto de contacto quieto, tiembla varios píxeles por el simple
 * hecho de tocar la pantalla. Un umbral pequeño convertiría cada intento de
 * caminar en un giro de cámara accidental, que es justo el problema que este
 * módulo existe para evitar.
 */
export const UMBRAL_DE_ARRASTRE = 12;

/**
 * Radianes que gira la cámara por cada píxel de arrastre horizontal.
 *
 * Es una constante de sensibilidad, no una física: se ajustó para que un
 * arrastre de un ancho de pantalla típico dé más o menos una vuelta cómoda,
 * no una vuelta completa de golpe.
 */
export const RADIANES_POR_PIXEL = 0.008;

/** Estado de un gesto de puntero en curso sobre el suelo. */
export interface GestoDePuntero {
  readonly xInicial: number;
  readonly yInicial: number;
  readonly xAnterior: number;
  readonly yAnterior: number;
  readonly esArrastre: boolean;
}

/** Empieza a seguir un gesto en el punto donde bajó el puntero. */
export function empezarGesto(x: number, y: number): GestoDePuntero {
  return { xInicial: x, yInicial: y, xAnterior: x, yAnterior: y, esArrastre: false };
}

/**
 * Actualiza el gesto con la nueva posición del puntero.
 *
 * Devuelve un gesto nuevo (no muta el recibido) y el `giro`, que es
 * INCREMENTAL: lo que hay que sumar al yaw de la cámara desde la última
 * llamada, no el giro total del gesto. Quien integra este módulo debe ir
 * sumando estos incrementos al yaw actual en cada evento de movimiento.
 *
 * El desplazamiento vertical se ignora por completo: la cámara nunca
 * cabecea. Es deliberado, no una limitación pendiente de resolver — una
 * cámara que se inclina con el dedo marea, y el proyecto exige ser
 * conservador con el movimiento de cámara para cumplir `prefers-reduced-
 * motion` (AC-7).
 */
export function moverGesto(
  gesto: GestoDePuntero,
  x: number,
  y: number,
): { readonly gesto: GestoDePuntero; readonly giro: number } {
  const dxDesdeInicio = x - gesto.xInicial;
  const dyDesdeInicio = y - gesto.yInicial;
  const distanciaDesdeInicio = Math.hypot(dxDesdeInicio, dyDesdeInicio);
  const esArrastre = gesto.esArrastre || distanciaDesdeInicio > UMBRAL_DE_ARRASTRE;

  // Mientras siga siendo candidato a toque no se gira nada, aunque el
  // puntero ya se haya movido un poco: girar antes de cruzar el umbral es
  // precisamente el giro accidental que el umbral existe para evitar.
  if (!esArrastre) {
    return { gesto: { ...gesto, xAnterior: x, yAnterior: y, esArrastre }, giro: 0 };
  }

  const dxDesdeAnterior = x - gesto.xAnterior;

  // Signo: arrastrar hacia la derecha (dx > 0) debe hacer que el mundo se
  // sienta arrastrado hacia la derecha, como si se agarrara el escenario.
  // En `camara.ts`, `posicionDeCamara` pone la cámara en
  // objetivo + R*(sin(yaw), altura, cos(yaw)); derivando esa posición
  // respecto a `yaw`, la cámara se desplaza a lo largo de su propio vector
  // «derecha» cuando `yaw` crece. Una cámara que se mueve hacia su derecha
  // hace que la escena se vea desplazada hacia la IZQUIERDA de la pantalla
  // (como el paisaje visto por la ventanilla de un coche que gira a la
  // derecha). Para que arrastrar a la derecha mueva la escena a la derecha,
  // `yaw` tiene que DISMINUIR con dx positivo: de ahí el signo negativo.
  const giro = -dxDesdeAnterior * RADIANES_POR_PIXEL;

  return { gesto: { ...gesto, xAnterior: x, yAnterior: y, esArrastre }, giro };
}

/** Si el gesto terminó siendo un toque (y por tanto debe hacer caminar). */
export function terminarGesto(gesto: GestoDePuntero): { readonly esToque: boolean } {
  return { esToque: !gesto.esArrastre };
}
