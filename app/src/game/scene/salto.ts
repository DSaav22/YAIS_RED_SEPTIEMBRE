// La física del salto y la recuperación al caerse al agua.
//
// Módulo puro: sin React, sin Three, sin DOM. Se prueba sin WebGL y es lo
// mismo que se portaría a React Native si hiciera falta.
//
// Constitución V: caerse al agua no puede ser un castigo. No hay vidas, no
// hay contador de caídas, no hay mensaje de error ni tiempo perdido. Por eso
// este archivo no expone nada parecido a "intentos" o "fallos": solo física
// del salto y memoria del último sitio seguro.

import { PUNTO_DE_PARTIDA, esCaminable } from "./mundo";

// -----------------------------------------------------------------------
// Salto
// -----------------------------------------------------------------------

/**
 * Impulso inicial del salto, en unidades por segundo (eje vertical).
 * Gravedad del salto, en unidades por segundo al cuadrado.
 *
 * Con VELOCIDAD = 1.6 u/s (`useCharacterWalk.ts`) y estas constantes:
 *  - duración total del salto: 2 * IMPULSO / GRAVEDAD = 1.0 s
 *  - altura máxima: IMPULSO² / (2 * GRAVEDAD) = 1.25 u
 *  - distancia horizontal cruzable saltando: 1.6 u/s * 1.0 s = 1.6 u
 *
 * (Estos tres números se corrigieron para que coincidan con las constantes de
 * abajo: la nota de "subido de 4 a 5..." los había cambiado sin actualizar
 * este bloque, así que decían 0.5 s / 0.5 u / 0.8 u, los valores de ANTES del
 * ajuste. Con una altura máxima real de 1.25 u el salto no es pequeño; si
 * cuesta verlo, la cámara era la culpable — ver el comentario de
 * `ultimoSueloConocido` en `GameCanvas.tsx`.)
 *
 * 1.6 u alcanza para saltar un hueco decorativo (una grieta, un escalón de
 * roca) pero no para sustituir un puente: los puentes siguen siendo el modo
 * normal de cruzar entre islas. El salto es para que el mundo se sienta
 * jugable al tacto, no un atajo que rompa el recorrido diseñado en
 * `mundo.ts`.
 */
/*
 * Subido de 4 a 5, y la gravedad bajada de 16 a 10, al meter las piedras de
 * paso: con los valores de antes el salto duraba medio segundo y cruzaba 0,8
 * unidades, que no llegaba a ningún sitio. Así vuela un segundo y cruza 1,6,
 * con los huecos de piedra a 1,3: hay margen para equivocarse de momento y
 * llegar igual, que es lo que evita que saltar se sienta un examen.
 */
export const IMPULSO_DEL_SALTO = 5;
export const GRAVEDAD_DEL_SALTO = 10;

/** Duración total del salto, de que despega a que vuelve a tocar el suelo. */
export const DURACION_DEL_SALTO = (2 * IMPULSO_DEL_SALTO) / GRAVEDAD_DEL_SALTO;

/**
 * No hay doble salto.
 *
 * Se decidió así, no por omisión: todos los huecos del archipiélago que no
 * tienen puente son agua entre islas separadas por más de 0.8 u (la distancia
 * que cubre un solo salto), así que un segundo salto en el aire no abriría
 * ningún camino nuevo — solo añadiría una tecla más que aprender para un
 * juego pensado para niñas y niños en un aula. Si algún día se diseña un
 * hueco pensado para cruzarse saltando dos veces, este es el sitio para
 * añadirlo, con la misma nota de diseño que esta.
 */
export const HAY_DOBLE_SALTO = false;

export type FaseDelSalto = "en-suelo" | "subiendo" | "cayendo";

/** Estado inmutable del salto. Cada función devuelve un estado nuevo. */
export interface EstadoDeSalto {
  readonly fase: FaseDelSalto;
  /** Segundos desde que se despegó. 0 cuando `fase` es "en-suelo". */
  readonly tiempoTranscurrido: number;
}

export const ESTADO_DE_SALTO_INICIAL: EstadoDeSalto = {
  fase: "en-suelo",
  tiempoTranscurrido: 0,
};

/**
 * Intenta despegar. Si ya está en el aire no pasa nada (sin doble salto,
 * ver `HAY_DOBLE_SALTO`): se devuelve el mismo estado, nunca se lanza nada
 * ni se avisa de un "salto fallido", porque no es un fallo, es una tecla que
 * no hace efecto todavía.
 */
export function iniciarSalto(estado: EstadoDeSalto): EstadoDeSalto {
  if (estado.fase !== "en-suelo") return estado;
  return { fase: "subiendo", tiempoTranscurrido: 0 };
}

/** Avanza el salto `deltaSegundos`. No muta `estado`; devuelve uno nuevo. */
export function avanzarSalto(estado: EstadoDeSalto, deltaSegundos: number): EstadoDeSalto {
  if (estado.fase === "en-suelo") return estado;
  if (!Number.isFinite(deltaSegundos) || deltaSegundos <= 0) return estado;

  const nuevoTiempo = estado.tiempoTranscurrido + deltaSegundos;
  if (nuevoTiempo >= DURACION_DEL_SALTO) {
    return ESTADO_DE_SALTO_INICIAL;
  }

  const fase: FaseDelSalto = nuevoTiempo < DURACION_DEL_SALTO / 2 ? "subiendo" : "cayendo";
  return { fase, tiempoTranscurrido: nuevoTiempo };
}

/**
 * Altura sobre el suelo para el estado de salto dado. Nunca negativa: por
 * más que el tiempo se pase de `DURACION_DEL_SALTO` (un cuadro largo, un
 * `deltaSegundos` raro), el personaje no se hunde en el suelo.
 */
export function alturaDelSalto(estado: EstadoDeSalto): number {
  if (estado.fase === "en-suelo") return 0;
  const t = estado.tiempoTranscurrido;
  const altura = IMPULSO_DEL_SALTO * t - 0.5 * GRAVEDAD_DEL_SALTO * t * t;
  return Math.max(0, altura);
}

// -----------------------------------------------------------------------
// Caerse y recuperarse
// -----------------------------------------------------------------------

/**
 * Margen por debajo del suelo LOCAL que ya cuenta como caída.
 *
 * Antes el mundo era plano y esto era una `y` absoluta (-0.5, bajo el único
 * `ALTURA_DEL_SUELO = 0.2` que existía). Con relieve cada punto del mundo
 * tiene su propio suelo — o ninguno, si es agua o un hueco entre islas —, así
 * que "caerse" ya no puede compararse contra un número fijo: una isla alta y
 * una baja no comparten un mismo "por debajo de esto es agua". Ahora es un
 * margen relativo: se cayó si `y` queda más de 0.5 por debajo del suelo que
 * hay (o debería haber) justo bajo los pies, o si ahí no hay suelo alguno.
 * Ver `seCayoDelMundo`.
 */
export const ALTURA_DE_CAIDA = -0.5;

/** Un punto del mundo en el que se sabe que se puede estar de pie. */
export interface PuntoSeguro {
  readonly x: number;
  readonly z: number;
}

/**
 * Recuerda el último punto caminable pisado. Si `x, z` no es caminable
 * (por ejemplo, porque el personaje ya está cayendo hacia el agua) se
 * conserva el recuerdo anterior sin tocarlo: la memoria solo avanza cuando
 * hay un sitio nuevo y seguro que recordar, nunca se borra por un tropiezo.
 *
 * No lanza con entradas raras (NaN, Infinity): simplemente no las considera
 * caminables y devuelve lo que ya se tenía.
 */
export function recordarPuntoSeguro(
  anterior: PuntoSeguro | null,
  x: number,
  z: number,
): PuntoSeguro | null {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return anterior;
  if (!esCaminable(x, z)) return anterior;
  return { x, z };
}

/**
 * A dónde volver tras caerse al agua. Usa el último punto seguro recordado
 * si sigue siendo válido; si no hay ninguno (o quedó corrupto de algún modo)
 * cae en `PUNTO_DE_PARTIDA`, que siempre es caminable por construcción.
 *
 * Nunca devuelve el borde desde el que se cayó: el punto que se recuerda es,
 * por definición de `recordarPuntoSeguro`, uno en el que el personaje ya
 * estuvo de pie y quieto dentro de una isla o un puente, no el instante en
 * el que empezó a caer. Esta función no lanza con ninguna entrada.
 */
export function obtenerPuntoDeRecuperacion(puntoSeguro: PuntoSeguro | null): readonly [number, number] {
  if (
    puntoSeguro !== null &&
    Number.isFinite(puntoSeguro.x) &&
    Number.isFinite(puntoSeguro.z) &&
    esCaminable(puntoSeguro.x, puntoSeguro.z)
  ) {
    return [puntoSeguro.x, puntoSeguro.z];
  }
  return PUNTO_DE_PARTIDA;
}

/**
 * `true` si `y` cuenta como una caída respecto al suelo que hay justo debajo
 * (`sueloLocal`, el resultado de `alturaDelSuelo(x, z)` en ese punto).
 *
 * `sueloLocal` en `null` significa que ahí no hay ningún suelo posible —agua,
 * o el hueco entre dos islas sin puente ni piedra— y eso ya es caída, sin
 * mirar `y`. Con suelo real, se cayó si quedó más de `ALTURA_DE_CAIDA` (en
 * valor absoluto) por debajo de él: lo bastante para no confundir un
 * tambaleo del salto con haberse ido al agua.
 *
 * No lanza con `y` no finito (NaN, Infinity): eso también cuenta como caída,
 * porque no hay un sitio válido que describa.
 */
export function seCayoDelMundo(y: number, sueloLocal: number | null): boolean {
  if (!Number.isFinite(y)) return true;
  if (sueloLocal === null) return true;
  return y < sueloLocal + ALTURA_DE_CAIDA;
}

/* ------------------------------------------------------------------------ */
/* Seguir el suelo                                                           */
/* ------------------------------------------------------------------------ */

/** Unidades por segundo a las que el personaje se acomoda a la altura del suelo. */
export const VELOCIDAD_DE_SUBIDA = 6;

/**
 * Cuánto puede quedar de diferencia para dar la altura por buena. Por debajo
 * de un milímetro nadie lo ve, y seguir pidiendo cuadros por eso mantendría
 * la GPU encendida para siempre.
 */
export const MARGEN_DE_ALTURA = 0.001;

/**
 * Acerca la altura del personaje a la del suelo y dice si ya llegó.
 *
 * El `asentado` es la parte importante y la razón de que esto sea una función
 * aparte y probada. El bucle de render va en modo `demand`: se apaga en
 * cuanto nadie avisa de que se está moviendo. Como la altura se interpolaba
 * dentro del bloque de caminar, al soltar la tecla el bucle se apagaba a
 * mitad de la subida y el personaje se quedaba **flotando** a media altura,
 * congelado en el aire. Se veía exactamente como "simula subir pero en
 * realidad flota".
 *
 * Quien llama tiene que seguir pidiendo cuadros mientras `asentado` sea
 * `false`, aunque no haya nadie caminando.
 *
 * Con `suelo` a `null` —el personaje está sobre un sitio sin suelo, en pleno
 * salto por encima del agua— no se toca la altura: esa la gobierna el salto.
 */
export function seguirAlSuelo(
  yActual: number,
  suelo: number | null,
  paso: number,
): { readonly y: number; readonly asentado: boolean } {
  if (suelo === null || !Number.isFinite(suelo)) {
    return { y: yActual, asentado: true };
  }
  if (!Number.isFinite(yActual)) return { y: suelo, asentado: true };

  const diferencia = suelo - yActual;
  if (Math.abs(diferencia) <= MARGEN_DE_ALTURA) return { y: suelo, asentado: true };

  const avance = Math.min(Math.abs(diferencia), Math.max(0, paso));
  return { y: yActual + Math.sign(diferencia) * avance, asentado: false };
}
