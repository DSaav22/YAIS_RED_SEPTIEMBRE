// Deambular de un personaje que no controla quien juega (T-001-06).
//
// Módulo puro: sin React, sin Three, sin DOM. Decide A DÓNDE ir y CUÁNDO
// hacerlo; MOVER el `Group` cuadro a cuadro es trabajo de `useCharacterWalk`.
// Separarlo así es lo que permite probar esta matemática sin levantar WebGL.
//
// La idea es que un personaje de fondo se sienta vivo sin competir por la
// atención: camina un rato corto, se para un rato, y nunca se aleja del sitio
// donde quien juega lo puede encontrar. No persigue, no bloquea el paso y no
// cruza a otra isla por su cuenta.
//
// Con `prefers-reduced-motion` (Constitución VI y VII) este módulo
// simplemente no se llama: quien integra no invoca `avanzarDeambular` y el
// personaje se queda en su `ancla`. No se lee la preferencia aquí porque un
// módulo puro no toca `window`.

import { acercarAZonaCaminable, esCaminable, ISLAS } from "./mundo";

/** Un punto del mundo en el plano x/z. */
export type Punto = readonly [number, number];

/**
 * Cuánto dura cada tramo de caminar o de estar quieto, en segundos.
 *
 * Los mínimos y máximos son distintos entre sí (rango ancho) para que no se
 * note el patrón: si todos los personajes de fondo pausaran siempre el mismo
 * tiempo, el aula lo notaría como un tic. Las pausas son más largas que los
 * paseos (mínimo de pausa > mínimo de paseo) a propósito: un personaje que no
 * para de moverse le roba el ojo a lo que hay que leer en la escena, que es
 * justo lo que un juego proyectado en un aula no se puede permitir.
 */
export const DURACION_DE_PASEO_MIN = 1.5;
export const DURACION_DE_PASEO_MAX = 3.5;
export const DURACION_DE_PAUSA_MIN = 2.5;
export const DURACION_DE_PAUSA_MAX = 6;

/**
 * Radio de paseo por defecto alrededor del ancla. Corto a propósito: un
 * personaje que espera junto a un claro (`cercania.ts`) no se puede alejar de
 * él, porque eso es lo que permite que se lo pueda ir a buscar.
 */
export const RADIO_DE_PASEO_POR_DEFECTO = 1.2;

/** Estado de un personaje que deambula. Inmutable: nunca se muta, se reemplaza. */
export interface EstadoDeDeambular {
  /** Punto alrededor del cual se pasea. No cambia en la vida del estado. */
  readonly ancla: Punto;
  /** Qué tan lejos del ancla puede llegar un destino. */
  readonly radioDePaseo: number;
  /** Isla a la que pertenece el ancla, para no proponer destinos fuera de ella. */
  readonly islaClave: string;
  /** Adónde va (o está) el personaje ahora mismo. */
  readonly destino: Punto;
  /** `true` mientras dura el tramo de caminar; `false` durante la pausa. */
  readonly enMovimiento: boolean;
  /** Segundos que faltan para decidir el próximo tramo. */
  readonly tiempoRestanteDelTramo: number;
}

interface OpcionesDeCreacion {
  readonly ancla: Punto;
  /** Si se omite, se usa `RADIO_DE_PASEO_POR_DEFECTO`. */
  readonly radioDePaseo?: number;
  readonly azar?: () => number;
}

function isla(islaClave: string) {
  return ISLAS.find((candidata) => candidata.clave === islaClave);
}

/** Isla más cercana a un punto: sirve para anclar sin tener que pasar la clave a mano. */
function islaMasCercana(punto: Punto): string {
  let mejorClave = ISLAS[0]?.clave ?? "";
  let mejorDistancia = Infinity;
  for (const candidata of ISLAS) {
    const d = Math.hypot(punto[0] - candidata.centro[0], punto[1] - candidata.centro[1]);
    if (d < mejorDistancia) {
      mejorDistancia = d;
      mejorClave = candidata.clave;
    }
  }
  return mejorClave;
}

function numeroEntre(azar: () => number, minimo: number, maximo: number): number {
  return minimo + azar() * (maximo - minimo);
}

/**
 * Un destino nuevo, corto y caminable, dentro de la isla del ancla.
 *
 * Se sortea en un círculo de radio `radioDePaseo` alrededor del ancla y, si
 * el sorteo cae fuera de lo caminable (un radio de paseo generoso cerca del
 * borde de una isla chica podría hacerlo), se corrige con
 * `acercarAZonaCaminable` en vez de volver a sortear: así el resultado nunca
 * depende de cuántas veces haga falta reintentar, que es justo lo que rompe
 * el determinismo con un azar inyectado.
 */
function proponerDestino(estado: EstadoDeDeambular, azar: () => number): Punto {
  const angulo = azar() * Math.PI * 2;
  // Raíz cuadrada para que el sorteo no se amontone en el centro: un círculo
  // repartido de manera uniforme necesita esa corrección.
  const distancia = Math.sqrt(azar()) * estado.radioDePaseo;
  const x = estado.ancla[0] + Math.cos(angulo) * distancia;
  const z = estado.ancla[1] + Math.sin(angulo) * distancia;
  if (esCaminable(x, z)) return [x, z];
  const corregido = acercarAZonaCaminable(x, z);
  return [corregido.x, corregido.z];
}

/** Crea el estado inicial de un personaje que va a deambular. Empieza parado. */
export function crearEstadoDeDeambular({
  ancla,
  radioDePaseo = RADIO_DE_PASEO_POR_DEFECTO,
  azar = Math.random,
}: OpcionesDeCreacion): EstadoDeDeambular {
  const radioSeguro = Number.isFinite(radioDePaseo) && radioDePaseo > 0 ? radioDePaseo : 0;
  const anclaSegura: Punto = esCaminable(ancla[0], ancla[1])
    ? ancla
    : (() => {
        const c = acercarAZonaCaminable(ancla[0], ancla[1]);
        return [c.x, c.z] as Punto;
      })();

  return {
    ancla: anclaSegura,
    radioDePaseo: radioSeguro,
    islaClave: islaMasCercana(anclaSegura),
    destino: anclaSegura,
    enMovimiento: false,
    tiempoRestanteDelTramo: numeroEntre(azar, DURACION_DE_PAUSA_MIN, DURACION_DE_PAUSA_MAX),
  };
}

/**
 * Avanza el estado `deltaSegundos`. No muta `estado`: siempre devuelve un
 * objeto nuevo, aunque no haya cambiado nada (por ejemplo con `deltaSegundos`
 * negativo, que se trata como cero para no hacer retroceder el reloj).
 */
export function avanzarDeambular(
  estado: EstadoDeDeambular,
  deltaSegundos: number,
  azar: () => number = Math.random,
): EstadoDeDeambular {
  const delta = Number.isFinite(deltaSegundos) && deltaSegundos > 0 ? deltaSegundos : 0;
  // safety-ok: es el reloj interno del paseo de un NPC, no una cuenta atrás
  // para quien juega: no se muestra en pantalla, no acaba nada y nadie puede
  // llegar tarde a nada. Lo único que decide es cuándo el personaje deja de
  // andar y se queda un rato quieto.
  const tiempoRestante = estado.tiempoRestanteDelTramo - delta; // safety-ok: reloj interno del paseo

  if (tiempoRestante > 0) { // safety-ok: reloj interno del paseo
    return { ...estado, tiempoRestanteDelTramo: tiempoRestante }; // safety-ok: reloj interno del paseo
  }

  // Se acabó el tramo: se cambia de fase. Si se estaba quieto, ahora se
  // propone un destino y se camina; si se estaba caminando, ahora se para
  // donde esté (el `useCharacterWalk` que integra esto ya lo habrá llevado al
  // destino cuando el tramo termine, así que no hace falta recalcular dónde
  // "está" el personaje: eso es responsabilidad de quien mueve el `Group`).
  const empiezaAMoverse = !estado.enMovimiento;

  if (empiezaAMoverse) {
    return {
      ...estado,
      destino: proponerDestino(estado, azar),
      enMovimiento: true,
      tiempoRestanteDelTramo: numeroEntre(azar, DURACION_DE_PASEO_MIN, DURACION_DE_PASEO_MAX),
    };
  }

  return {
    ...estado,
    destino: estado.destino,
    enMovimiento: false,
    tiempoRestanteDelTramo: numeroEntre(azar, DURACION_DE_PAUSA_MIN, DURACION_DE_PAUSA_MAX),
  };
}

// `isla` se deja disponible por si quien integra necesita los datos de la
// isla del ancla (radio, centro) sin volver a buscarla; hoy no se usa fuera
// de este módulo pero evita duplicar el `find` en cada llamador.
export { isla as islaDelAncla };
