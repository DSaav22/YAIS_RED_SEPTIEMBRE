// El archipiélago (T-001-06, prototipo).
//
// Once islas unidas por diez puentes, pobladas con el mundo mínimo que ya
// está sincronizado. Todas las rutas salen de `shared/assets.ts`; aquí no hay
// ninguna literal.
//
// Por dónde se puede caminar lo decide `mundo.ts`, que es puro y está
// probado; aquí solo se dibuja lo que ese módulo declara, para que el suelo
// que se ve y el suelo que se pisa no puedan separarse.
//
// El decorado (bancos, árboles, senderos) YA NO se planta a coordenadas
// sueltas: se deriva de los datos del mundo (centro y radio de cada isla,
// bocas de cada puente) y pasa por `colocacion.ts`, que rechaza cualquier
// sitio que caiga sobre un sendero, sobre la zona de un puente, sobre un
// claro de episodio o sobre OTRA pieza de decorado ya plantada en esa misma
// isla. Antes una silla podía terminar en medio de un puente —o encima de
// otra silla, porque las piezas de una isla nunca se comprobaban entre
// sí— porque nada comprobaba las listas unas contra otras; ahora es
// imposible por construcción: el decorado se coloca DESPUÉS de calcular las
// zonas prohibidas, cada pieza recién puesta se suma a esas zonas antes de
// calcular la siguiente de la misma isla, y toda pieza se aparta de lo que
// ya esté ocupado (ver `decoradoDeIsla` más abajo).
//
// Sin animación de cámara ni movimiento ambiental: AC-7 se cumple por no
// tener nada que apagar. Las nubes están quietas a propósito.

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import type { Object3D } from "three";

import { PROP_ASSETS, WORLD_ASSETS, type PropAssetId, type WorldAssetId } from "../../shared/assets";
import { ENCUENTROS_DE_LA_ISLA } from "../../shared/encuentros";
import {
  puntoLibreMasCercano,
  zonaDeDecorado,
  zonaDePersonajeEsperando,
  zonasBaseDelMundo,
  type Punto,
  type ZonaProhibida,
} from "./colocacion";
import {
  ALTURA_DEL_SUELO,
  ESCALA_DE_TABLERO,
  ISLAS,
  offsetsDeTablerosDePuente,
  PIEDRAS,
  PUENTES,
  type IslaDelMundo,
  type PuenteDelMundo,
} from "./mundo";

type Posicion = readonly [number, number, number];

/**
 * Desde que hay tres niveles (`mundo.ts`), cada isla tiene su propia altura
 * de césped (`isla.altura`); ya no hay una sola constante que valga para
 * todo el mapa. Estos deltas son los mismos ajustes finos que ya existían
 * antes de los niveles (un sendero se hunde un poco respecto al césped, un
 * tablero de puente cuelga un poco por debajo de la altura de apoyo, una
 * piedra se entierra un poco), calculados una sola vez contra `ALTURA_DEL_SUELO`
 * (el nivel 0) y aplicados igual en cualquier nivel: subir de nivel no debe
 * desajustar estos detalles.
 */
const DELTA_SENDERO = 0.06 - ALTURA_DEL_SUELO;
const DELTA_TABLERO = -0.12;
const DELTA_PIEDRA = -0.05 - ALTURA_DEL_SUELO;

/**
 * Cuánto mide de radio (aprox.) cada pieza de decorado al pisar el suelo, para
 * que `colocacion.ts` sepa cuánto bulto apartar de un sendero o de un puente.
 * No hace falta que sea exacto: un margen generoso es preferible a que una
 * copa de árbol termine tapando la mitad de un tablero.
 */
const RADIO_DECORATIVO = 0.45;

/**
 * `island_small` mide 3,632 de ancho contra los 6,271 de `island_large`
 * (ver los comentarios de `shared/assets.ts`). Si se dibuja con la misma
 * `escala` que se calculó para la isla grande, el modelo queda más chico que
 * el círculo por el que ya se puede andar (`radioCaminable`, que no cambia
 * aquí porque es de `mundo.ts`): la gente vería una isla pequeña flotando en
 * mitad de una zona caminable más grande. Este factor corrige esa diferencia
 * de tamaño real entre los dos modelos para que el césped y el borde donde
 * se puede pisar sigan coincidiendo.
 */
const ESCALA_ISLA_PEQUEÑA_RESPECTO_GRANDE = 6.271 / 3.632;

/**
 * Bajo qué radio caminable conviene usar `island_small` en vez de
 * `island_large`. Es un umbral de arte (que la isla más chica del mapa no se
 * vea igual que la más grande), no una regla de `mundo.ts`.
 */
const UMBRAL_ISLA_PEQUEÑA = 1.8;

function idDelModeloDeIsla(isla: IslaDelMundo): WorldAssetId {
  return isla.radioCaminable <= UMBRAL_ISLA_PEQUEÑA ? "island_small" : "island_large";
}

/**
 * Un id de decorado puede venir del kit del mundo (`WORLD_ASSETS`: árboles,
 * bancos, faros) o del kit de props (`PROP_ASSETS`: objetos más pequeños,
 * como la plántula o el contenedor de reciclaje que se suman aquí como
 * decorado ambiental puro — sin texto, sin mecánica, igual que un árbol).
 * Los dos catálogos no comparten ningún id, así que basta con mirar en cuál
 * de los dos existe la clave para saber de dónde sale el modelo.
 */
type IdDeDecorado = WorldAssetId | PropAssetId;

function modelUrlDeDecorado(id: IdDeDecorado): string {
  if (id in WORLD_ASSETS) return WORLD_ASSETS[id as WorldAssetId].modelUrl;
  return PROP_ASSETS[id as PropAssetId].modelUrl;
}

function escalaDeIsla(isla: IslaDelMundo): number {
  return idDelModeloDeIsla(isla) === "island_small"
    ? isla.escala * ESCALA_ISLA_PEQUEÑA_RESPECTO_GRANDE
    : isla.escala;
}

interface Pieza {
  readonly id: IdDeDecorado;
  readonly clave: string;
  readonly position: Posicion;
  readonly rotationY?: number;
  readonly scale?: number;
  /**
   * Elemento de `environment` del que depende esta pieza. Si la escena lo
   * declara en un estado que no sabemos representar, la pieza no se monta:
   * mostrar un puente entero mientras el guion dice que está roto sería
   * contradecir el contenido con el decorado.
   */
  readonly dependeDe?: { readonly elemento: string; readonly estadosQueLoOcultan: readonly string[] };
}

function distancia(a: Punto, b: Punto): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

// --- Bocas de puente: dónde entra y sale el camino de cada isla ---

interface BocaDePuente {
  readonly puente: PuenteDelMundo;
  readonly punto: readonly [number, number];
  /** `[1, 0]`, `[-1, 0]`, `[0, 1]` o `[0, -1]`: no hay puentes en diagonal. */
  readonly direccion: readonly [number, number];
}

function bocasDelPuente(puente: PuenteDelMundo): readonly [BocaDePuente, BocaDePuente] {
  const enX = puente.medioAncho >= puente.medioLargo;
  const [cx, cz] = puente.centro;
  if (enX) {
    return [
      { puente, punto: [cx - puente.medioAncho, cz], direccion: [-1, 0] },
      { puente, punto: [cx + puente.medioAncho, cz], direccion: [1, 0] },
    ];
  }
  return [
    { puente, punto: [cx, cz - puente.medioLargo], direccion: [0, -1] },
    { puente, punto: [cx, cz + puente.medioLargo], direccion: [0, 1] },
  ];
}

/**
 * A qué isla pertenece una boca: la que tiene el borde más cerca de ese
 * punto. No hay que declarar a mano qué puente va con qué isla —y que se
 * desincronice cuando alguien mueva una de las dos listas— porque sale solo
 * de las coordenadas reales.
 */
function islaDeLaBoca(boca: BocaDePuente): IslaDelMundo | undefined {
  let mejor: IslaDelMundo | undefined;
  let mejorDiferencia = Infinity;
  for (const isla of ISLAS) {
    const diferencia = Math.abs(
      distancia({ x: isla.centro[0], z: isla.centro[1] }, { x: boca.punto[0], z: boca.punto[1] }) -
        isla.radioCaminable,
    );
    if (diferencia < mejorDiferencia) {
      mejorDiferencia = diferencia;
      mejor = isla;
    }
  }
  return mejor;
}

const TODAS_LAS_BOCAS: readonly BocaDePuente[] = PUENTES.flatMap(bocasDelPuente);

function bocasDeIsla(isla: IslaDelMundo): readonly BocaDePuente[] {
  return TODAS_LAS_BOCAS.filter((boca) => islaDeLaBoca(boca)?.clave === isla.clave);
}

/**
 * El tramo de sendero que entra desde cada boca hacia el centro de la isla,
 * más la esquina donde dos senderos de ejes distintos se cruzan (si los hay).
 * Es la parte del decorado que SÍ tiene que estar en un sitio exacto —el
 * hueco entre el puente y la isla es justo donde se quejaron de sillas
 * fuera de lugar—, así que no pasa por `colocacion.ts`: es la propia zona
 * que las demás piezas deben evitar.
 */
function senderosDeIsla(isla: IslaDelMundo): readonly Pieza[] {
  const bocas = bocasDeIsla(isla);
  const piezas: Pieza[] = bocas.map((boca, indice) => {
    const [dx, dz] = boca.direccion;
    const distanciaAlCentro = isla.radioCaminable * 0.6;
    return {
      id: "path_straight",
      clave: `${isla.clave}-sendero-${boca.puente.clave}-${indice}`,
      position: [
        isla.centro[0] + dx * distanciaAlCentro,
        isla.altura + DELTA_SENDERO,
        isla.centro[1] + dz * distanciaAlCentro,
      ],
      rotationY: dx !== 0 ? Math.PI / 2 : 0,
    };
  });

  const bocaEnX = bocas.find((boca) => boca.direccion[0] !== 0);
  const bocaEnZ = bocas.find((boca) => boca.direccion[1] !== 0);
  if (bocaEnX && bocaEnZ) {
    // Dos senderos de ejes distintos convergen en esta isla: hace falta una
    // esquina para que el camino gire de verdad en vez de cortarse en seco.
    // La rotación es aproximada (cuatro combinaciones de signo posibles) y
    // es puramente decorativa: no cambia por dónde se puede caminar, que
    // sigue siendo el círculo entero de la isla.
    const signoX = Math.sign(bocaEnX.direccion[0]);
    const signoZ = Math.sign(bocaEnZ.direccion[1]);
    const rotationY =
      signoX > 0
        ? signoZ > 0
          ? 0
          : Math.PI / 2
        : signoZ < 0
          ? Math.PI
          : -Math.PI / 2;

    piezas.push({
      id: "path_corner",
      clave: `${isla.clave}-sendero-esquina`,
      position: [isla.centro[0], isla.altura + DELTA_SENDERO, isla.centro[1]],
      rotationY,
    });
  }

  return piezas;
}

/** Zona rectangular de un tramo de sendero, del tamaño real de la baldosa. */
function zonaDeSendero(pieza: Pieza): ZonaProhibida {
  return {
    tipo: "rectangulo",
    centro: { x: pieza.position[0], z: pieza.position[2] },
    medioAncho: 1,
    medioLargo: 1,
  };
}

// --- Decorado propio de cada isla: lo que hace que se reconozca ---

interface DecorPropuesto {
  readonly id: IdDeDecorado;
  readonly angulo: number;
  readonly distancia: number;
  readonly scale?: number;
  readonly rotationY?: number;
  /**
   * Anula `RADIO_DECORATIVO` para esta pieza. Solo hace falta cuando una isla
   * concentra demasiado decorado en poco sitio caminable —hoy únicamente
   * `isla-partida`, el único cruce de cuatro puentes del mapa— y el radio
   * genérico (pensado para un árbol o un banco sueltos) hace que
   * `puntoLibreMasCercano` tenga que apartar la pieza tan lejos que termina
   * fuera del radio caminable (ver el comentario largo en `TEMAS_POR_ISLA`,
   * entrada `isla-partida`). El resto de las islas no declara este campo y
   * sigue usando el radio genérico sin cambios.
   */
  readonly radio?: number;
}

/**
 * Un tema por isla, elegido a mano una sola vez para que cada una se
 * distinga de las demás («ya estuve aquí»): la del faro tiene faro, la de
 * las piedras tiene la única casa del mapa, la del jardín tiene más flores
 * que ninguna otra. Las posiciones son ángulo/distancia relativos al centro,
 * no coordenadas de mundo: por eso mover una isla en `mundo.ts` no obliga a
 * tocar esta lista.
 */
const TEMAS_POR_ISLA: Readonly<Record<string, readonly DecorPropuesto[]>> = {
  "isla-partida": [
    // OJO al tocar esta lista: `isla-partida` es el único cruce de CUATRO
    // puentes del mapa (ver `PUENTES` en `mundo.ts`), así que `senderosDeIsla`
    // le planta cinco baldosas de sendero (una por boca más la esquina donde
    // se cruzan) y cada una bloquea un cuadrado de 2×2 unidades a su
    // alrededor (ver `zonaDeSendero`, más abajo). La unión de esas cinco
    // baldosas cubre casi toda la isla en forma de cruz y dentro de la cual
    // NO cabe una copia real —solo quedan cuatro bolsillos triangulares en
    // las diagonales (~NE/SE/SW/NW), justo donde ya caían el faro y el
    // primer árbol antes de este cambio—. El bug reportado (basurero y
    // botella "cayéndose" del borde) era justo esto: con el radio genérico
    // de colisión (`RADIO_DECORATIVO = 0.45`, pensado para un árbol o un
    // banco sueltos en una isla con un solo puente) cada pieza nueva chocaba
    // con el sendero o con la pieza plantada justo antes, y
    // `puntoLibreMasCercano` la iba empujando en anillos crecientes hasta
    // encontrar hueco — a veces más allá del propio `radioCaminable` de la
    // isla, porque los cuatro bolsillos son diminutos y se llenan rápido.
    // (Confirmado con un script desechable que reproduce `decoradoDeIsla`:
    // con la lista original, 7 de las 10 piezas terminaban con margen
    // NEGATIVO contra el borde caminable — literalmente fuera del césped.)
    //
    // La solución no es solo mover ángulos: es reconocer que 14 piezas no
    // caben en cuatro bolsillos diminutos si cada una pide 0.45 de radio de
    // colisión (un solo faro casi llena un bolsillo entero). El campo
    // `radio` (opcional, ver `DecorPropuesto`) deja declarar aquí, SOLO para
    // esta isla, un valor más ajustado al tamaño real del modelo (ver los
    // comentarios de tamaño en `shared/assets.ts`: un `flower_bush` mide
    // 0.645 m de lado, muy por debajo del 0.45 genérico; los props del kit
    // de reciclaje miden 0.47-0.79 m). El resto de las islas no declara
    // `radio` y sigue con el 0.45 genérico de siempre, sin cambios.
    //
    // Las 14 posiciones de abajo se calcularon con un empaquetador
    // desechable (no forma parte del código: se corrió una vez con
    // `npx tsx`, se descartó) que prueba puntos contra las zonas reales de
    // `colocacion.ts` + los senderos de esta isla y descarta cualquiera con
    // menos de ~0.12-0.14 de margen contra el borde caminable o que se
    // solape con otra pieza ya puesta. Por eso los ángulos y distancias no
    // son "redondos": son los puntos que de verdad caben. La mayoría queda
    // con margen 0.2-0.7 (más que de sobra); las dos piezas más ajustadas
    // (`recycling_bin` #5 y `palm`) quedan en 0.14 y 0.20 — apretadas, pero
    // dentro del césped, no cayéndose de la isla.
    { id: "lighthouse", angulo: 0.794, distancia: 0.73, scale: 0.9, radio: 0.32 },
    { id: "tree_round", angulo: -0.785, distancia: 0.718, radio: 0.32 },
    { id: "tree_round", angulo: -2.356, distancia: 0.718, scale: 0.85, radio: 0.32 },
    { id: "bench", angulo: 2.225, distancia: 0.838, rotationY: 0.7, radio: 0.32 },
    { id: "palm", angulo: 0.602, distancia: 0.922, radio: 0.32 },
    { id: "flower_bush", angulo: -0.986, distancia: 0.894, radio: 0.28 },
    // Los cuatro props del kit de reciclaje/cuidado (`PROP_ASSETS`) que
    // estaban registrados desde T-001-02 y nunca se dibujaban en ningún
    // sitio: pedido explícito para sumar decorado con tema ambiental al
    // archipiélago, sin texto y sin mecánica nueva (Constitución IV: nada
    // que un niño lea o escuche puede salir de aquí sin pasar antes por
    // Arianna). Se colocaron en la isla de partida —`PUNTO_DE_PARTIDA` cae
    // dentro de su propio radio caminable, es literalmente donde aparece
    // quien juega— para que se noten sin explorar.
    { id: "water_bottle", angulo: -2.557, distancia: 0.846, radio: 0.2 },
    { id: "water_drop", angulo: -2.156, distancia: 0.846, radio: 0.2 },
    { id: "seedling", angulo: 0.995, distancia: 0.854, radio: 0.2 },
    // Cinco basureros en vez de uno: pedido explícito de sumar varios
    // `recycling_bin` repartidos cerca del centro de esta isla. "Cerca del
    // centro" en sentido literal (una `distancia` de 0.15-0.35) es
    // geométricamente imposible aquí: esa zona cae entera dentro del
    // cuadrado de sendero del cruce central (ver el comentario grande más
    // arriba), bloqueada para CUALQUIER pieza sin importar su radio de
    // colisión. Quedan repartidos en los cuatro bolsillos libres, a la
    // distancia más cercana al centro que de verdad tiene hueco (~0.85-0.95
    // en vez del 0.5 anterior, que ya de por sí terminaba empujado fuera del
    // borde por el choque en cascada) — más agrupados entre sí que antes, ya
    // no aislados uno por isla, que era el pedido de fondo.
    { id: "recycling_bin", angulo: -0.585, distancia: 0.846, rotationY: -0.6, radio: 0.2 },
    { id: "recycling_bin", angulo: -2.4, distancia: 0.918, rotationY: 0.3, radio: 0.2 },
    { id: "recycling_bin", angulo: 0.82, distancia: 0.93, rotationY: -1.1, radio: 0.2 },
    { id: "recycling_bin", angulo: -0.777, distancia: 0.918, rotationY: 1.4, radio: 0.2 },
    { id: "recycling_bin", angulo: 2.4, distancia: 0.946, rotationY: 0.5, radio: 0.16 },
  ],
  "isla-faro": [
    { id: "lighthouse", angulo: -1.1, distancia: 0.75, scale: 0.9 },
    { id: "tree_round", angulo: 1.6, distancia: 0.65, scale: 0.8 },
    { id: "bench", angulo: 0.4, distancia: 0.5, rotationY: -0.5 },
    { id: "flower_bush", angulo: 2.2, distancia: 0.55 },
    // Botella y plantín repartidos por el primer anillo (pedido explícito: no
    // los cinco de cada uno amontonados en `isla-partida`, que ya tiene 14
    // piezas). Verificado con el mismo script desechable que ya se usó para
    // `isla-partida`: `radio` más ajustado que el genérico porque esta isla
    // ya tiene un ancla de personaje (`enc-tomi-faro`/`enc-beto-faro`) cerca,
    // que también cuenta como zona prohibida.
    { id: "water_bottle", angulo: 0.864, distancia: 0.8, radio: 0.22 },
    { id: "seedling", angulo: 3.927, distancia: 0.82, radio: 0.2 },
  ],
  "isla-palmeras": [
    { id: "palm", angulo: -0.6, distancia: 0.7, scale: 0.9 },
    { id: "palm", angulo: 1.2, distancia: 0.65, scale: 0.75 },
    { id: "tree_round", angulo: 2.6, distancia: 0.6, scale: 0.7 },
    { id: "flower_bush", angulo: 0.2, distancia: 0.5 },
    // Una botella (no plantín: esta isla ya tiene cuatro piezas más el
    // ancla de `enc-luna-palmeras` y no queda margen cómodo para dos props
    // nuevos). `radio` reducido porque con el genérico no había hueco con
    // margen positivo contra el borde caminable.
    { id: "water_bottle", angulo: 5.498, distancia: 0.82, radio: 0.15 },
  ],
  "isla-mirador": [
    { id: "lighthouse", angulo: -Math.PI / 2, distancia: 0.75, scale: 0.85 },
    { id: "stairs_three", angulo: -Math.PI / 2 + 0.5, distancia: 0.45, rotationY: -Math.PI / 2 },
    { id: "bench", angulo: 0.5, distancia: 0.55, rotationY: 1.0 },
    { id: "tree_round", angulo: 2.2, distancia: 0.55, scale: 0.8 },
    // La isla más grande del primer anillo: la que mejor margen deja.
    { id: "water_bottle", angulo: 2.932, distancia: 0.2, radio: 0.22 },
    { id: "seedling", angulo: 2.932, distancia: 0.6, radio: 0.27 },
  ],
  "isla-caleta": [
    { id: "palm", angulo: 0.6, distancia: 0.7, scale: 0.8 },
    { id: "palm", angulo: -1.0, distancia: 0.65, scale: 0.7 },
    { id: "bench", angulo: -0.2, distancia: 0.5, rotationY: -0.4 },
    { id: "flower_bush", angulo: 1.8, distancia: 0.5 },
    { id: "water_bottle", angulo: 2.958, distancia: 0.66, radio: 0.22 },
    { id: "seedling", angulo: 3.351, distancia: 0.7, radio: 0.27 },
  ],
  "isla-arenal": [
    // Sin banco a propósito: no todas las islas tienen que ofrecer lo mismo.
    { id: "palm", angulo: 0.7, distancia: 0.7, scale: 0.85 },
    { id: "palm", angulo: -0.8, distancia: 0.65, scale: 0.7 },
    { id: "palm", angulo: 2.4, distancia: 0.6, scale: 0.6 },
    // Solo plantín aquí: esta isla tiene DOS anclas de personaje
    // (`enc-tomi-arenal` y `enc-clara-arenal`), más apretada que el resto
    // del primer anillo.
    { id: "seedling", angulo: 3.063, distancia: 0.8, radio: 0.18 },
  ],
  "isla-acuerdos": [
    // El guion pone `lighthouse: "off"` al llegar. No se oculta la pieza: un
    // faro "apagado" sigue siendo un faro en pie, solo que sin luz, y el kit
    // no trae una segunda variante encendida/apagada para distinguirlas.
    { id: "lighthouse", angulo: -2.0, distancia: 0.75, scale: 0.95 },
    { id: "tree_round", angulo: 2.6, distancia: 0.65, scale: 0.9 },
    { id: "bench", angulo: 0.6, distancia: 0.5, rotationY: 0.6 },
  ],
  "isla-circulo": [
    { id: "tree_round", angulo: -1.8, distancia: 0.65, scale: 0.85 },
    { id: "tree_round", angulo: 1.9, distancia: 0.6, scale: 0.7 },
    { id: "bench", angulo: -2.6, distancia: 0.5, rotationY: -0.6 },
    { id: "flower_bush", angulo: 0.4, distancia: 0.45 },
  ],
  "isla-piedra": [
    // La única isla con casa del mapa: es su seña de identidad.
    { id: "house", angulo: -0.6, distancia: 0.55 },
    { id: "tree_round", angulo: 2.0, distancia: 0.6, scale: 0.75 },
    { id: "palm", angulo: 1.2, distancia: 0.55, scale: 0.7 },
    { id: "bench", angulo: 2.8, distancia: 0.45, rotationY: 0.3 },
  ],
  "isla-nube": [
    { id: "palm", angulo: 0.5, distancia: 0.65, scale: 0.7 },
    { id: "tree_round", angulo: -1.7, distancia: 0.6, scale: 0.75 },
    { id: "bench", angulo: 2.1, distancia: 0.5, rotationY: 1.1 },
    { id: "flower_bush", angulo: -0.4, distancia: 0.45 },
  ],
  "isla-jardin": [
    // La que más flores tiene, a propósito: el nombre lo pide.
    { id: "tree_round", angulo: -1.5, distancia: 0.6, scale: 0.7 },
    { id: "palm", angulo: 1.6, distancia: 0.55, scale: 0.65 },
    { id: "bench", angulo: -2.7, distancia: 0.45, rotationY: -0.3 },
    { id: "flower_bush", angulo: 0.2, distancia: 0.5 },
    { id: "flower_bush", angulo: 0.9, distancia: 0.4 },
    { id: "flower_bush", angulo: -0.9, distancia: 0.4 },
  ],

  // --- Islas del segundo y tercer anillo agregadas con los niveles ---
  "isla-lago": [
    { id: "palm", angulo: 0.4, distancia: 0.65, scale: 0.75 },
    { id: "bench", angulo: -1.6, distancia: 0.5, rotationY: 0.5 },
    { id: "flower_bush", angulo: 2.0, distancia: 0.5 },
    // Sin ancla de personaje en esta isla: la más holgada de las seis para
    // sumar los dos props nuevos.
    { id: "water_bottle", angulo: 5.524, distancia: 0.2, radio: 0.22 },
    { id: "seedling", angulo: 3.351, distancia: 0.74, radio: 0.27 },
  ],
  "isla-bosque": [
    { id: "tree_round", angulo: -0.8, distancia: 0.65, scale: 0.9 },
    { id: "tree_round", angulo: 1.4, distancia: 0.6, scale: 0.75 },
    { id: "tree_round", angulo: 2.8, distancia: 0.55, scale: 0.6 },
    { id: "bench", angulo: 0.2, distancia: 0.45, rotationY: 0.2 },
  ],
  "isla-duna": [
    { id: "palm", angulo: -0.5, distancia: 0.7, scale: 0.85 },
    { id: "flower_bush", angulo: 1.3, distancia: 0.55 },
    { id: "bench", angulo: 2.5, distancia: 0.5, rotationY: -0.2 },
  ],
  "isla-cascada": [
    { id: "stairs_three", angulo: -1.9, distancia: 0.4, rotationY: -1.9 },
    { id: "tree_round", angulo: 0.9, distancia: 0.6, scale: 0.75 },
  ],
  "isla-risco": [
    { id: "lighthouse", angulo: 0, distancia: 0.7, scale: 0.8 },
    { id: "rock_large", angulo: 2.2, distancia: 0.55 },
  ],
  "isla-cueva": [
    { id: "rock_large", angulo: -0.6, distancia: 0.6 },
    { id: "rock_small", angulo: 1.5, distancia: 0.55 },
    { id: "tree_round", angulo: 2.8, distancia: 0.5, scale: 0.6 },
  ],
  "isla-nido": [
    { id: "tree_round", angulo: 0.6, distancia: 0.6, scale: 0.85 },
    { id: "flower_bush", angulo: -1.2, distancia: 0.5 },
  ],
  "isla-sendero": [
    { id: "palm", angulo: -0.3, distancia: 0.6, scale: 0.7 },
    { id: "bench", angulo: 1.8, distancia: 0.5, rotationY: 0.4 },
  ],
};

/**
 * El decorado de una isla, ya apartado de senderos, puentes, claros y del
 * resto del decorado de la propia isla. Cada pieza propuesta en
 * `TEMAS_POR_ISLA` se intenta plantar en su sitio, en el orden en que
 * aparece en esa lista; si cae sobre una zona prohibida, `puntoLibreMasCercano`
 * la mueve al hueco libre más próximo. La posición deseada nunca se descarta
 * en silencio: si el hueco más próximo tampoco existe, se deja donde estaba
 * pedida (ver el comentario de esa función en `colocacion.ts`).
 *
 * `zonas` empieza en lo que ya prohibía el resto del mundo (sendero, puentes,
 * claros, personajes) pero DESPUÉS crece con cada pieza recién colocada
 * (`zonaDeDecorado`): así la segunda pieza de una isla ya sabe dónde quedó la
 * primera, la tercera sabe dónde quedaron las dos anteriores, etc. Antes
 * `zonas` se calculaba una sola vez y nunca se enteraba de lo que la propia
 * isla ya había plantado, así que dos temas con ángulos parecidos (p. ej. un
 * faro y un banco) podían terminar uno encima del otro —la queja original de
 * aula: sillas encimadas con otro objeto—. El acumulador es local a esta
 * llamada, así que no afecta a ninguna otra isla.
 */
function decoradoDeIsla(isla: IslaDelMundo, zonasDelMundo: readonly ZonaProhibida[]): readonly Pieza[] {
  const senderos = senderosDeIsla(isla);
  const zonas: ZonaProhibida[] = [...zonasDelMundo, ...senderos.map(zonaDeSendero)];
  const temas = TEMAS_POR_ISLA[isla.clave] ?? [];

  const decor: Pieza[] = [];
  temas.forEach((tema, indice) => {
    const radio = tema.radio ?? RADIO_DECORATIVO;
    const deseado: Punto = {
      x: isla.centro[0] + Math.cos(tema.angulo) * isla.radioCaminable * tema.distancia,
      z: isla.centro[1] + Math.sin(tema.angulo) * isla.radioCaminable * tema.distancia,
    };
    const libre = puntoLibreMasCercano(deseado, radio, zonas, {
      radioMaximo: isla.radioCaminable,
    });
    zonas.push(zonaDeDecorado(libre, radio));
    decor.push({
      id: tema.id,
      clave: `${isla.clave}-decor-${indice}`,
      position: [libre.x, isla.altura, libre.z],
      ...(tema.rotationY !== undefined ? { rotationY: tema.rotationY } : {}),
      ...(tema.scale !== undefined ? { scale: tema.scale } : {}),
    });
  });

  return [...senderos, ...decor];
}

/**
 * Todo el decorado del mapa: se calcula una sola vez porque `mundo.ts` no
 * cambia en tiempo de ejecución (no hay islas que se muevan a media
 * partida). El faro de la isla de los acuerdos sigue teniendo su propio
 * `dependeDe` porque eso depende del `environment` de la escena actual, no
 * de la geometría del mundo.
 */
/**
 * Las zonas donde no se puede plantar decorado: puentes, sus bocas, los
 * claros de episodio y **el sitio donde espera cada personaje**.
 *
 * Los personajes van aquí y no en `zonasBaseDelMundo` porque sus posiciones
 * salen del contenido (`content/encuentros/`), y `colocacion.ts` es un módulo
 * puro que no lee contenido. Sin esto, un banco podía aparecer encima de
 * Tomi: se veía a un personaje atravesado por un mueble, y quien iba a
 * hablar con él se encontraba el camino ocupado.
 */
const ZONAS_DEL_MUNDO: readonly ZonaProhibida[] = [
  ...zonasBaseDelMundo(PUENTES),
  ...(ENCUENTROS_DE_LA_ISLA.ok
    ? ENCUENTROS_DE_LA_ISLA.contenido.encuentros.map((encuentro) =>
        zonaDePersonajeEsperando(encuentro.anclaje),
      )
    : []),
];
const PIEZAS: readonly Pieza[] = [
  ...ISLAS.flatMap((isla) => decoradoDeIsla(isla, ZONAS_DEL_MUNDO)),

  // --- Cielo: quieto a propósito (AC-7) ---
  { id: "cloud", clave: "nube-1", position: [-3.8, 2.4, -1.6] },
  { id: "cloud", clave: "nube-2", position: [3.4, 2.9, -0.8], scale: 1.2 },
  { id: "cloud", clave: "nube-3", position: [0.6, 3.2, -3.4], scale: 0.9 },
  { id: "cloud", clave: "nube-4", position: [9.5, 3.1, -3.8], scale: 1.1 },
  { id: "cloud", clave: "nube-5", position: [-9.2, 2.7, -3.2] },
  { id: "cloud", clave: "nube-6", position: [15.4, 3.0, -2.6], scale: 1.1 },
  { id: "cloud", clave: "nube-7", position: [1.8, 2.8, -15.4] },
  { id: "cloud", clave: "nube-8", position: [-14.6, 3.2, 0.4], scale: 0.9 },
  { id: "cloud", clave: "nube-9", position: [8.8, 2.6, 11.6], scale: 0.85 },
  { id: "cloud", clave: "nube-10", position: [-6.9, 3.1, 12.4] },
];

/**
 * Una pieza del mundo. Cada instancia clona la escena del GLB porque un
 * mismo `Object3D` no puede estar dos veces en el grafo; el archivo se
 * descarga una sola vez y `useGLTF` lo reutiliza (PLAN-001: "no copies el
 * modelo por escena").
 */
interface PiezaDelMundoProps {
  readonly id: IdDeDecorado;
  readonly position: Posicion;
  readonly rotationY?: number | undefined;
  readonly scale?: number | undefined;
}

function PiezaDelMundo({ id, position, rotationY = 0, scale = 1 }: PiezaDelMundoProps) {
  // Sin decodificador Draco desde un CDN: ver `Character.tsx`.
  const { scene } = useGLTF(modelUrlDeDecorado(id), false);
  const copia = useMemo<Object3D>(() => scene.clone(true), [scene]);

  return (
    <primitive
      object={copia}
      position={[...position]}
      rotation={[0, rotationY, 0]}
      scale={scale}
      dispose={null}
    />
  );
}

interface IslandSceneProps {
  /** `environment` de la escena actual, tal cual viene del contenido. */
  readonly environment: Readonly<Record<string, string>>;
}

function seMuestra(pieza: Pieza, environment: Readonly<Record<string, string>>): boolean {
  if (!pieza.dependeDe) return true;
  const estado = environment[pieza.dependeDe.elemento];
  return estado === undefined || !pieza.dependeDe.estadosQueLoOcultan.includes(estado);
}

/**
 * Si el puente está roto no se dibuja: un tablero entero mientras el guion
 * dice `bridge_main: "broken"` sería el decorado contradiciendo el
 * contenido, y encima se podría seguir viendo un camino por el que
 * `esCaminable` ya no deja pasar (ver `mundo.ts`).
 */
function puenteSeMuestra(
  puente: PuenteDelMundo,
  environment: Readonly<Record<string, string>>,
): boolean {
  if (!puente.dependeDe) return true;
  const estado = environment[puente.dependeDe.elemento];
  return estado === undefined || !puente.dependeDe.estadosQueLoRompen.includes(estado);
}

export function IslandScene({ environment }: IslandSceneProps) {
  const { scene: sceneGrande } = useGLTF(WORLD_ASSETS.island_large.modelUrl, false);
  const { scene: sceneChica } = useGLTF(WORLD_ASSETS.island_small.modelUrl, false);
  // Una copia por isla: un mismo `Object3D` no puede estar dos veces en el
  // grafo, pero cada uno de los dos archivos se descarga una sola vez. Qué
  // modelo le toca a cada isla sale de su `radioCaminable`
  // (`idDelModeloDeIsla`), no de una lista aparte que se pueda desincronizar.
  const islas = useMemo(
    () =>
      ISLAS.map((isla) => ({
        isla,
        copia: (idDelModeloDeIsla(isla) === "island_small" ? sceneChica : sceneGrande).clone(true),
      })),
    [sceneGrande, sceneChica],
  );

  return (
    <group>
      {islas.map(({ isla, copia }) => (
        <primitive
          key={isla.clave}
          object={copia}
          // La isla se apoya en su propio nivel: en NIVEL_0 esto da 0 (el
          // mismo offset de siempre), y en los niveles más altos sube el
          // modelo entero para que el césped quede a `isla.altura`.
          position={[isla.centro[0], isla.altura - ALTURA_DEL_SUELO, isla.centro[1]]}
          scale={escalaDeIsla(isla)}
          dispose={null}
        />
      ))}

      {/* Los puentes se dibujan donde `mundo.ts` dice que se puede cruzar, no
          donde quede bonito: el tablero tiene que coincidir con la zona
          caminable o el personaje andaría sobre el agua.

          El número de tableros y dónde va cada uno lo calcula
          `offsetsDeTablerosDePuente` a partir del vano real (ver el comentario
          de esa función en `mundo.ts`): así el puente se ve como una sola
          superficie continua, sin junta a la vista, y si el vano cambia en
          `PUENTES` el dibujo se ajusta solo. El eje al que se suma cada offset
          es x cuando el puente cruza en esa dirección (`medioAncho` es el
          lado largo) y z en el otro caso; es la misma regla que usan los
          tests de conectividad.

          Con niveles, cada tablero cuelga a la altura que le toca en su punto
          exacto del vano (interpolación lineal entre `alturaInicio` y
          `alturaFin`, la misma cuenta que hace `alturaDelSuelo` en
          `mundo.ts`): así una rampa se ve inclinada de verdad, no como una
          serie de tableros planos a saltos. Los puentes marcados
          `esEscalera` no usan tablero: se dibujan con `stairs_three`, una
          sola pieza que ya trae los tres escalones. */}
      {PUENTES.filter((puente) => puenteSeMuestra(puente, environment)).flatMap((puente) => {
        if (puente.esEscalera) {
          return [
            <PiezaDelMundo
              key={puente.clave}
              id="stairs_three"
              position={[puente.centro[0], Math.min(puente.alturaInicio, puente.alturaFin), puente.centro[1]]}
              rotationY={puente.rotacionY}
            />,
          ];
        }

        const enX = puente.medioAncho >= puente.medioLargo;
        const vano = (enX ? puente.medioAncho : puente.medioLargo) * 2;
        return offsetsDeTablerosDePuente(puente).map((offset, indice) => {
          // `t` va de 0 (extremo de coordenada menor) a 1 (extremo mayor),
          // igual que en `alturaDelSuelo`.
          const t = Math.min(1, Math.max(0, offset / vano + 0.5));
          const alturaAqui = puente.alturaInicio + (puente.alturaFin - puente.alturaInicio) * t;
          return (
            <PiezaDelMundo
              key={`${puente.clave}-${indice}`}
              id="bridge_straight"
              position={[
                puente.centro[0] + (enX ? offset : 0),
                alturaAqui + DELTA_TABLERO,
                puente.centro[1] + (enX ? 0 : offset),
              ]}
              rotationY={puente.rotacionY}
              scale={ESCALA_DE_TABLERO}
            />
          );
        });
      })}

      {/* Las piedras de paso se dibujan con `rock_small`/`rock_large`. La más
          grande de las cinco declaradas en `mundo.ts` mide 0,75 de radio
          caminable: por eso ese es el punto de referencia para la escala 1
          de `rock_large`, y las piedras más chicas usan `rock_small` con la
          misma proporción. Cada piedra usa su propia `altura` (en el camino
          del oeste suben una a una, como peldaños sueltos). */}
      {PIEDRAS.map((piedra) => {
        const esGrande = piedra.radioCaminable >= 0.72;
        return (
          <PiezaDelMundo
            key={piedra.clave}
            id={esGrande ? "rock_large" : "rock_small"}
            position={[piedra.centro[0], piedra.altura + DELTA_PIEDRA, piedra.centro[1]]}
            scale={piedra.radioCaminable / 0.75}
          />
        );
      })}

      {PIEZAS.filter((pieza) => seMuestra(pieza, environment)).map((pieza) => (
        <PiezaDelMundo
          key={pieza.clave}
          id={pieza.id}
          position={pieza.position}
          rotationY={pieza.rotationY}
          scale={pieza.scale}
        />
      ))}
    </group>
  );
}
