// Dónde no se puede plantar decorado (queja de aula: bancos y NPCs en medio
// del sendero o en la boca de un puente).
//
// Módulo puro: sin React y sin Three, para poder probar las reglas de
// colocación sin WebGL. No sabe dibujar nada; solo sabe decir «aquí estorba»
// y «el sitio libre más cercano es este otro».
//
// Las zonas prohibidas se arman a partir de los datos reales del mundo
// (`mundo.ts`, `cercania.ts`), nunca de coordenadas sueltas: si el mapa
// cambia de forma, las zonas cambian solas.

import { PUNTOS_DE_ENCUENTRO, RADIO_DE_ENCUENTRO, type PuntoDeEncuentro } from "./cercania";
import type { PuenteDelMundo } from "./mundo";

export interface Punto {
  readonly x: number;
  readonly z: number;
}

/** Zona circular prohibida: un claro de episodio, el sitio de un NPC. */
export interface ZonaCircular {
  readonly tipo: "circulo";
  readonly centro: Punto;
  readonly radio: number;
}

/**
 * Zona rectangular prohibida, alineada a los ejes: un puente o su boca de
 * acceso. Igual que en `mundo.ts`, `medioAncho` es la mitad del ancho en x y
 * `medioLargo` la mitad del largo en z; no hay que rotarla porque los
 * puentes ya se declaran así (ver `esCaminable` en `mundo.ts`).
 */
export interface ZonaRectangular {
  readonly tipo: "rectangulo";
  readonly centro: Punto;
  readonly medioAncho: number;
  readonly medioLargo: number;
}

export type ZonaProhibida = ZonaCircular | ZonaRectangular;

function esFinito(valor: number): boolean {
  return Number.isFinite(valor);
}

function distancia(a: Punto, b: Punto): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/**
 * `true` si un círculo de radio `radioPieza` centrado en `punto` invade la
 * zona. Se expande la zona por `radioPieza` en vez de tratar la pieza como un
 * punto: una silla tiene bulto, no es un pixel.
 *
 * Entradas raras (NaN, radios negativos) nunca lanzan: se tratan como «no
 * estorba», porque negarse a colocar nada por un dato roto sería peor que
 * colocar de más.
 */
export function zonaEstorba(punto: Punto, radioPieza: number, zona: ZonaProhibida): boolean {
  if (!esFinito(punto.x) || !esFinito(punto.z) || !esFinito(radioPieza)) return false;
  const radio = Math.max(0, radioPieza);

  if (zona.tipo === "circulo") {
    if (!esFinito(zona.centro.x) || !esFinito(zona.centro.z) || !esFinito(zona.radio)) return false;
    return distancia(punto, zona.centro) <= Math.max(0, zona.radio) + radio;
  }

  if (
    !esFinito(zona.centro.x) ||
    !esFinito(zona.centro.z) ||
    !esFinito(zona.medioAncho) ||
    !esFinito(zona.medioLargo)
  ) {
    return false;
  }
  const medioAncho = Math.max(0, zona.medioAncho) + radio;
  const medioLargo = Math.max(0, zona.medioLargo) + radio;
  return (
    Math.abs(punto.x - zona.centro.x) <= medioAncho && Math.abs(punto.z - zona.centro.z) <= medioLargo
  );
}

/** `true` si la pieza estorba alguna de las zonas dadas. */
export function estorbaAlgunaZona(
  punto: Punto,
  radioPieza: number,
  zonas: readonly ZonaProhibida[],
): boolean {
  return zonas.some((zona) => zonaEstorba(punto, radioPieza, zona));
}

/**
 * La zona de un puente completo: por dónde se cruza. Se usa tal cual porque
 * `mundo.ts` ya la declara alineada a los ejes (ver el comentario de
 * `esCaminable`), sin rotar por `rotacionY`.
 */
export function zonaDePuente(puente: PuenteDelMundo): ZonaRectangular {
  return {
    tipo: "rectangulo",
    centro: { x: puente.centro[0], z: puente.centro[1] },
    medioAncho: puente.medioAncho,
    medioLargo: puente.medioLargo,
  };
}

/**
 * Las bocas de acceso de un puente: un tramo corto a cada lado, por donde
 * entra y sale el camino hacia la isla. Sin esto, una silla podía quedar
 * pegada justo donde termina el tablero y arranca la isla —el sitio exacto
 * de la queja original— porque `zonaDePuente` sola no cubre esa franja.
 *
 * `largoDeBoca` es el alcance del bloqueo dentro de la isla; por defecto es
 * corto porque solo hace falta despejar el primer paso, no media isla.
 */
export function zonasDeBocaDePuente(
  puente: PuenteDelMundo,
  largoDeBoca = 1.2,
): readonly ZonaRectangular[] {
  if (largoDeBoca <= 0) return [];
  const enX = puente.medioAncho >= puente.medioLargo;
  const medioBoca = largoDeBoca / 2;

  if (enX) {
    return [-1, 1].map((signo) => ({
      tipo: "rectangulo" as const,
      centro: { x: puente.centro[0] + signo * (puente.medioAncho + medioBoca), z: puente.centro[1] },
      medioAncho: medioBoca,
      medioLargo: puente.medioLargo,
    }));
  }

  return [-1, 1].map((signo) => ({
    tipo: "rectangulo" as const,
    centro: { x: puente.centro[0], z: puente.centro[1] + signo * (puente.medioLargo + medioBoca) },
    medioAncho: puente.medioAncho,
    medioLargo: medioBoca,
  }));
}

/** El claro de un punto de encuentro: donde se ofrece entrar a un episodio. */
export function zonaDeClaro(punto: PuntoDeEncuentro, radio = RADIO_DE_ENCUENTRO): ZonaCircular {
  return {
    tipo: "circulo",
    centro: { x: punto.posicion[0], z: punto.posicion[1] },
    radio,
  };
}

/** Dónde espera un personaje: nadie puede plantar decorado encima. */
export function zonaDePersonajeEsperando(posicion: readonly [number, number], radio = 0.9): ZonaCircular {
  return {
    tipo: "circulo",
    centro: { x: posicion[0], z: posicion[1] },
    radio,
  };
}

/**
 * Dónde ya quedó una pieza de decorado: la siguiente pieza de la misma isla
 * tiene que apartarse de ella igual que se aparta de un sendero o de un
 * puente. Sin esto, dos temas cercanos en `TEMAS_POR_ISLA` (p. ej. un faro y
 * un banco a un ángulo parecido) podían terminar uno encima del otro, porque
 * nada avisaba de que el primero ya estaba plantado ahí (la queja original
 * de aula: sillas encimadas con otro objeto).
 *
 * Es un caso aparte de `zonaDePersonajeEsperando` aunque la forma sea la misma
 * (un círculo con radio): esa marca dónde espera alguien del contenido, esta
 * marca dónde ya se plantó algo del propio decorado, y quien llama a cada una
 * pasa datos de orígenes distintos (un ancla de personaje vs. el punto ya
 * resuelto de una pieza).
 */
export function zonaDeDecorado(punto: Punto, radio: number): ZonaCircular {
  return {
    tipo: "circulo",
    centro: { x: punto.x, z: punto.z },
    radio,
  };
}

/**
 * Todas las zonas prohibidas del mundo que no dependen de una escena en
 * particular: los puentes (tablero + bocas) y los claros de episodio. Las
 * zonas de personajes se agregan aparte porque solo existen mientras esa
 * escena está montada.
 */
export function zonasBaseDelMundo(
  puentes: readonly PuenteDelMundo[],
  puntosDeEncuentro: readonly PuntoDeEncuentro[] = PUNTOS_DE_ENCUENTRO,
): readonly ZonaProhibida[] {
  return [
    ...puentes.flatMap((puente) => [zonaDePuente(puente), ...zonasDeBocaDePuente(puente)]),
    ...puntosDeEncuentro.map((punto) => zonaDeClaro(punto)),
  ];
}

/**
 * El sitio libre más cercano al deseado. Busca en anillos de radio creciente
 * alrededor del punto pedido, probando varios ángulos en cada anillo, hasta
 * encontrar uno que no estorbe ninguna zona.
 *
 * Si no encuentra nada libre dentro de `radioMaximo` (mapa mal configurado,
 * zonas que cubren toda la isla) devuelve el punto original en vez de
 * lanzar: preferible una silla mal puesta a un decorado que revienta la
 * escena.
 */
export function puntoLibreMasCercano(
  deseado: Punto,
  radioPieza: number,
  zonas: readonly ZonaProhibida[],
  opciones: { readonly radioMaximo?: number; readonly paso?: number; readonly angulos?: number } = {},
): Punto {
  if (!esFinito(deseado.x) || !esFinito(deseado.z)) return deseado;
  if (!estorbaAlgunaZona(deseado, radioPieza, zonas)) return deseado;

  const radioMaximo = opciones.radioMaximo ?? 3;
  const paso = Math.max(0.05, opciones.paso ?? 0.15);
  const angulos = Math.max(4, Math.floor(opciones.angulos ?? 12));

  for (let radio = paso; radio <= radioMaximo; radio += paso) {
    for (let i = 0; i < angulos; i += 1) {
      const angulo = (i / angulos) * Math.PI * 2;
      const candidato: Punto = {
        x: deseado.x + Math.cos(angulo) * radio,
        z: deseado.z + Math.sin(angulo) * radio,
      };
      if (!estorbaAlgunaZona(candidato, radioPieza, zonas)) return candidato;
    }
  }

  return deseado;
}
