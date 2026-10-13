// La cámara que gira alrededor del personaje (T-001-06, exploración).
//
// Módulo puro: sin React y sin Three, para poder probar la matemática de la
// cámara sin WebGL.
//
// Hasta ahora la cámara estaba clavada detrás del personaje y el mundo se
// veía siempre desde el mismo lado, que es lo que hacía que la escena
// pareciera un decorado de frente y no un sitio por el que se anda. Aquí la
// cámara orbita: quien juega la gira y el mundo se recorre por detrás, como
// en los juegos de plataformas 3D que sirvieron de referencia.
//
// Dos reglas que no son cosméticas:
//
// 1. El giro es SIEMPRE de quien juega. No hay cámara automática que se
//    reencuadre sola: una cámara que se mueve sin que nadie la mueva marea, y
//    con `prefers-reduced-motion` el módulo se usa sin suavizado (AC-7).
// 2. El movimiento es relativo a la cámara. Si «adelante» no fuera hacia
//    donde se está mirando, girar la cámara rompería el control; es el error
//    clásico de las cámaras fijas y es justo lo que se está corrigiendo.

/** Vuelta completa, para normalizar ángulos. */
const VUELTA = Math.PI * 2;

/**
 * Distancia horizontal de la cámara al personaje y su altura. Están lo
 * bastante atrás y alto para que se vean la isla donde se está y la
 * siguiente, sin que el faro (4,65 de alto) se salga por arriba.
 */
export const RADIO_DE_CAMARA = 8.2;
export const ALTURA_DE_CAMARA = 4.2;

/**
 * A qué altura del personaje mira la cámara. Baja a propósito: apunta casi a
 * sus pies, así que el personaje queda por encima del centro de la pantalla y
 * no lo tapa el panel de diálogo, que se apoya abajo.
 */
export const ALTURA_DE_MIRA = 0.15;

/** Radianes por segundo al girar la cámara con el teclado. */
export const VELOCIDAD_DE_ORBITA = 1.8;

/**
 * Radianes por segundo a los que la cámara se acomoda sola detrás de hacia
 * dónde se está caminando, cuando nadie la está girando a mano.
 *
 * Mucho más lenta que `VELOCIDAD_DE_ORBITA`: esto no es un giro que se pida,
 * es una corrección de fondo para que un rato caminando en diagonal (la
 * entrada normal de un joystick, que casi nunca da exactamente 90°) no deje
 * la cámara mirando cada vez más de lado sin que nadie la haya movido. Se
 * reportó como "tengo que estar moviendo con los dedos el ángulo, no
 * debería ocurrir eso": el personaje ya gira para mirar hacia donde camina
 * en cualquier ángulo (`useCharacterWalk.ts`); la cámara, hasta ahora, se
 * quedaba fija donde el último Q/E/arrastre la hubiera dejado, y las dos
 * cosas se iban separando.
 */
export const VELOCIDAD_DE_SEGUIMIENTO_DE_MARCHA = 1.4;

/** Cuánto de la distancia pendiente recorre la cámara por segundo. */
export const SUAVIDAD_DE_CAMARA = 3.5;

/**
 * Teclas que giran la cámara, con su sentido. Son Q y E, y las flechas
 * quedan fuera por lo mismo que en `control-del-jugador.ts`: son de la ruta
 * accesible y el mundo no puede quitárselas a quien navega sin ratón.
 */
const TECLAS_DE_ORBITA: Readonly<Record<string, number>> = {
  KeyQ: -1,
  KeyE: 1,
};

/** Sentido de giro de una tecla, o `null` si esa tecla no gira nada. */
export function giroDeTecla(code: string): number | null {
  return TECLAS_DE_ORBITA[code] ?? null;
}

/** Suma el giro pedido por las teclas pulsadas: -1, 0 o 1. */
export function giroDeTeclas(teclas: Iterable<string>): number {
  let giro = 0;
  for (const tecla of teclas) giro += giroDeTecla(tecla) ?? 0;
  return Math.sign(giro);
}

/** Deja un ángulo en (-π, π]. */
export function normalizarAngulo(angulo: number): number {
  let normalizado = angulo % VUELTA;
  if (normalizado > Math.PI) normalizado -= VUELTA;
  if (normalizado <= -Math.PI) normalizado += VUELTA;
  return normalizado;
}

/**
 * Dónde se coloca la cámara para ver al personaje desde el ángulo pedido.
 *
 * Con `yaw = 0` y `alturaDelPersonaje = 0` queda exactamente donde estaba la
 * cámara fija anterior (detrás, en +z, a `ALTURA_DE_CAMARA` absoluta), así
 * que el encuadre de salida no cambia: girar es algo que se elige, no algo
 * que pasa.
 *
 * `alturaDelPersonaje` es opcional y por defecto 0 a propósito: es el `y` del
 * suelo bajo el personaje (antes el mundo era plano y esa altura no hacía
 * falta). Con relieve, en una isla alta `ALTURA_DE_CAMARA` sola dejaría la
 * cámara a la altura de los pies o por debajo del césped; sumar la altura del
 * personaje mantiene la misma cámara "de hombro" en cualquier isla.
 * `GameCanvas.tsx` puede seguir llamando esta función sin tocarla: el
 * parámetro nuevo es compatible con las llamadas existentes.
 */
export function posicionDeCamara(
  objetivo: { readonly x: number; readonly z: number },
  yaw: number,
  alturaDelPersonaje = 0,
): readonly [number, number, number] {
  return [
    objetivo.x + Math.sin(yaw) * RADIO_DE_CAMARA,
    ALTURA_DE_CAMARA + alturaDelPersonaje,
    objetivo.z + Math.cos(yaw) * RADIO_DE_CAMARA,
  ];
}

/**
 * Convierte lo que se pulsa en el teclado a una dirección del mundo, girada
 * según hacia dónde mira la cámara: «adelante» es siempre alejarse de la
 * cámara, esté donde esté.
 *
 * La entrada llega en el mismo sistema que `direccionDeTeclas`: W es (0,-1).
 */
export function direccionRelativaALaCamara(
  entrada: { readonly x: number; readonly z: number },
  yaw: number,
): { readonly x: number; readonly z: number } {
  const seno = Math.sin(yaw);
  const coseno = Math.cos(yaw);
  return {
    x: entrada.x * coseno + entrada.z * seno,
    z: -entrada.x * seno + entrada.z * coseno,
  };
}

/**
 * El ángulo de cámara (`yaw`) que deja la cámara justo detrás de un
 * personaje que camina hacia `anguloDeMarcha` — el mismo ángulo que
 * `useCharacterWalk.ts` usa para girar el `Group` (`Math.atan2(orden.x,
 * orden.z)`). Es la inversa de esa relación: con `yaw = 0` un personaje que
 * camina de frente (entrada `{0,-1}`) queda mirando a `π` (ver el test), así
 * que "detrás de la marcha" es `anguloDeMarcha + π`.
 */
export function yawDetrasDeLaMarcha(anguloDeMarcha: number): number {
  return normalizarAngulo(anguloDeMarcha + Math.PI);
}

/**
 * Acerca `actual` a `objetivo` por el camino corto del círculo, sin pasarse
 * de `maximoPorCuadro`. Es la misma idea que `girarHacia` de
 * `useCharacterWalk.ts` (que gira el personaje); esta gira la cámara y vive
 * aquí, en el módulo puro y probado de la cámara, para no importar entre los
 * dos archivos de escena solo por una función de diez líneas.
 */
export function girarYawHacia(actual: number, objetivo: number, maximoPorCuadro: number): number {
  const diferencia = normalizarAngulo(objetivo - actual);
  if (Math.abs(diferencia) <= Math.abs(maximoPorCuadro)) return normalizarAngulo(objetivo);
  return normalizarAngulo(actual + Math.sign(diferencia) * Math.abs(maximoPorCuadro));
}
