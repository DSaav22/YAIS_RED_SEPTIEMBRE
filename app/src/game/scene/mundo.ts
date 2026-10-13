// El archipiélago y por dónde se puede caminar (T-001-06, prototipo).
//
// Módulo puro: sin React y sin Three, para poder probar las reglas del mundo
// sin WebGL.
//
// Las medidas salen de las cajas contenedoras reales de los GLB, no de
// tantear: `island_large` mide 6,27 × 6,30 (radio ≈ 3,13) con el césped a
// y≈0,2, y `bridge_straight` mide 1,63 de ancho por 2,13 de largo.
//
// Hay diecinueve islas porque hay un solo modelo de isla en dos tamaños
// (`island_large` e `island_small`): se repite a distintas escalas y con
// distinto poblado. La lámina `isla-acuerdos-environment-sheet.png` tiene un
// archipiélago con más variedad; eso es trabajo de arte, no de código.
//
// --- Niveles ---
//
// Se pidió que ninguna isla quedara "más abajo" o "más arriba" sin que
// hubiera manera de subir o bajar andando: la respuesta no es una altura
// distinta por isla (eso se lee como un mapa caótico) sino tres niveles fijos
// y pocos:
//
//   NIVEL_0 = ALTURA_DEL_SUELO (0.2): la isla de partida y el primer anillo.
//   NIVEL_1 (1.4): el segundo anillo, donde están las dos islas con episodio.
//   NIVEL_2 (2.6): un tercer anillo, solo decorativo.
//
// Cada nivel sube 1.2 unidades sobre el anterior. Se sube y se baja de dos
// formas, nunca saltando:
//
//   - Rampa: un puente cuya altura se interpola en línea recta entre sus dos
//     extremos (`alturaInicio` en un lado, `alturaFin` en el otro). Es lo
//     mismo que ya existía para cruzar horizontalmente; aquí solo se le da
//     pendiente. Sirve para el cambio de nivel largo y suave (p. ej.
//     `puente-acuerdos`, `puente-nido`).
//   - Escalera: el mismo tipo de zona caminable, pero corta y empinada, con
//     `esEscalera: true` para que quien dibuje la escena use `stairs_three`
//     (tres escalones) en vez de tableros de puente. Sirve para el cambio de
//     nivel corto (p. ej. `puente-cascada`, ~1.2 unidades de largo por 1.2 de
//     alto: una escalera, no una rampa).
//
// En los dos casos la altura de cada punto se calcula igual (interpolación
// lineal a lo largo del eje largo de la zona), por eso `alturaDelSuelo`
// trata a ambas como el mismo dato con una etiqueta distinta para el dibujo.
//
// Regla dura: a las dos islas con episodio (`isla-acuerdos` → ep01,
// `isla-circulo` → ep02) se llega siempre andando, por puentes y rampas. Las
// piedras de paso —que sí dependen de saltar— nunca tocan una isla con
// episodio: llegar al contenido no puede depender de acertar un salto
// (Constitución V y VII). Lo comprueba `mundo.test.ts`.

/** Zona caminable circular: una isla. */
export interface IslaDelMundo {
  readonly clave: string;
  readonly centro: readonly [number, number];
  /** Escala a la que se dibuja el modelo. */
  readonly escala: number;
  /** Radio por el que se puede andar, ya con margen respecto al borde. */
  readonly radioCaminable: number;
  /** Altura del suelo de esta isla. Ver "Niveles" arriba. */
  readonly altura: number;
  /**
   * Episodio que se juega en esta isla, si tiene uno. Es el `id` del registro
   * de `shared/episodios.ts`; aquí no se guarda ni un título ni una sola
   * palabra de contenido, que se leen de `content/` como todo lo demás.
   */
  readonly episodioId?: string;
  /**
   * Dónde hay que acercarse para que el episodio empiece: el claro de la
   * isla. Relativo al mundo, no a la isla, para que no haya dos sistemas de
   * coordenadas que mantener a la vez.
   */
  readonly puntoDeEncuentro?: readonly [number, number];
}

/**
 * Zona caminable rectangular alineada a los ejes: un puente, una rampa o una
 * escalera. Las tres son la misma forma de dato —un rectángulo con una
 * altura en cada extremo— porque las tres resuelven el mismo problema
 * (conectar dos orillas); lo único que cambia es cuánta pendiente tienen y,
 * por tanto, qué modelo 3D se usa para dibujarlas.
 */
export interface PuenteDelMundo {
  readonly clave: string;
  readonly centro: readonly [number, number];
  /** Mitad del ancho en x y en z de la zona por la que se puede pasar. */
  readonly medioAncho: number;
  readonly medioLargo: number;
  /** Giro con el que se dibuja el modelo, en radianes. */
  readonly rotacionY: number;
  /**
   * Altura del suelo en cada extremo de la zona, medida a lo largo del eje
   * largo (el de `medioAncho` si `medioAncho >= medioLargo`, si no el de
   * `medioLargo`). `alturaInicio` es el extremo de coordenada menor
   * (`centro - medio*`) y `alturaFin` el de coordenada mayor. Cuando los dos
   * valores coinciden el puente es plano, como todos los del primer anillo;
   * cuando difieren, `alturaDelSuelo` interpola en línea recta entre ambos.
   */
  readonly alturaInicio: number;
  readonly alturaFin: number;
  /**
   * `true` si el cambio de nivel es corto y empinado y por tanto se dibuja
   * con `stairs_three` (tres escalones) en vez de con tableros de puente. Es
   * solo una pista para quien dibuja la escena: para caminar es exactamente
   * la misma zona rectangular con altura interpolada.
   */
  readonly esEscalera?: boolean;
  /**
   * Elemento de `environment` que puede dejar este puente intransitable. El
   * guion de EP01 dice `bridge_main: "broken"` en varias escenas y lo repara
   * más adelante: si el puente se sigue dibujando entero y se puede seguir
   * caminando por él, el guion miente. Mientras el estado esté en la lista,
   * ni `esCaminable` ni el dibujo lo cuentan como cruzable.
   */
  readonly dependeDe?: { readonly elemento: string; readonly estadosQueLoRompen: readonly string[] };
}

/** Altura del césped de una isla de partida, medida en el GLB. */
export const ALTURA_DEL_SUELO = 0.2;

/** Los tres niveles del archipiélago. Ver la nota "Niveles" al inicio del archivo. */
export const NIVEL_0 = ALTURA_DEL_SUELO;
export const NIVEL_1 = 1.4;
export const NIVEL_2 = 2.6;

/**
 * Isla de partida. No tiene episodio a propósito: es el sitio donde se
 * aparece y desde el que se sale a buscar. Poner una misión aquí hacía que lo
 * primero que se viera fuera un cartel pidiendo empezar.
 */
export const ISLA_PRINCIPAL: IslaDelMundo = {
  clave: "isla-partida",
  centro: [0, 0],
  escala: 1,
  radioCaminable: 2.6,
  altura: NIVEL_0,
};

/**
 * El archipiélago. Diecinueve islas de tamaños distintos en tres niveles: el
 * primer anillo (NIVEL_0, a pie de la de partida), el segundo (NIVEL_1, con
 * las dos misiones) y un tercero (NIVEL_2) puramente decorativo, para que
 * haya más mundo del que uno necesita para llegar al contenido. Las islas
 * marcadas con `episodioId` y sus vecinas del primer anillo no se mueven de
 * sitio ni cambian de clave: hay encuentros anclados en sus coordenadas
 * (`content/encuentros/isla-encuentros.json`).
 */
export const ISLAS: readonly IslaDelMundo[] = [
  ISLA_PRINCIPAL,

  // --- Primer anillo (NIVEL_0): se ve desde la isla de partida ---
  { clave: "isla-faro", centro: [8.4, -0.4], escala: 0.85, radioCaminable: 2.1, altura: NIVEL_0 },
  { clave: "isla-palmeras", centro: [-8.0, -0.6], escala: 0.8, radioCaminable: 2.0, altura: NIVEL_0 },
  { clave: "isla-mirador", centro: [0, -8.6], escala: 0.9, radioCaminable: 2.2, altura: NIVEL_0 },
  { clave: "isla-caleta", centro: [7.6, 6.4], escala: 0.75, radioCaminable: 1.9, altura: NIVEL_0 },
  { clave: "isla-arenal", centro: [-7.2, 6.2], escala: 0.75, radioCaminable: 1.9, altura: NIVEL_0 },
  { clave: "isla-lago", centro: [0, 8.0], escala: 0.68, radioCaminable: 1.7, altura: NIVEL_0 },

  // --- Segundo anillo (NIVEL_1): hay que cruzar el primero para llegar ---
  {
    clave: "isla-acuerdos",
    centro: [16.5, -0.4],
    escala: 0.95,
    radioCaminable: 2.4,
    altura: NIVEL_1,
    episodioId: "ep01",
    puntoDeEncuentro: [16.5, 0.8],
  },
  {
    clave: "isla-circulo",
    centro: [0, -17.0],
    escala: 0.9,
    radioCaminable: 2.3,
    altura: NIVEL_1,
    episodioId: "ep02",
    puntoDeEncuentro: [0, -16.0],
  },
  { clave: "isla-piedra", centro: [-15.5, -1.0], escala: 0.7, radioCaminable: 1.7, altura: NIVEL_1 },
  { clave: "isla-nube", centro: [8.0, 13.0], escala: 0.65, radioCaminable: 1.6, altura: NIVEL_1 },
  { clave: "isla-jardin", centro: [-7.5, 13.5], escala: 0.65, radioCaminable: 1.6, altura: NIVEL_1 },
  { clave: "isla-bosque", centro: [16.5, 8.0], escala: 0.8, radioCaminable: 2.0, altura: NIVEL_1 },
  { clave: "isla-duna", centro: [-15.5, 8.6], escala: 0.76, radioCaminable: 1.9, altura: NIVEL_1 },

  // --- Tercer anillo (NIVEL_2): puramente decorativo ---
  { clave: "isla-cascada", centro: [22.0, -0.4], escala: 0.76, radioCaminable: 1.9, altura: NIVEL_2 },
  { clave: "isla-risco", centro: [0, -25.0], escala: 0.76, radioCaminable: 1.9, altura: NIVEL_2 },
  { clave: "isla-cueva", centro: [-23.0, -1.0], escala: 0.76, radioCaminable: 1.9, altura: NIVEL_2 },
  { clave: "isla-nido", centro: [8.0, 22.0], escala: 0.64, radioCaminable: 1.6, altura: NIVEL_2 },
  { clave: "isla-sendero", centro: [-7.5, 22.0], escala: 0.64, radioCaminable: 1.6, altura: NIVEL_2 },
];

/**
 * Los puentes están a la altura por la que se anda (z≈0,5, donde se paran los
 * personajes), no en la línea que une los centros de las islas: si no, había
 * que buscarlos, y caminar hacia la isla de al lado terminaba en el borde sin
 * explicación. `medioLargo` coincide con el ancho real del tablero (1,63 del
 * modelo por 1,15 de escala, la mitad) para que no se pueda andar por el
 * aire al lado del puente.
 *
 * `alturaInicio`/`alturaFin` van en el orden del eje largo: el extremo de
 * coordenada menor primero. Cuando las dos islas que conecta un puente están
 * en el mismo nivel, los dos valores son iguales (plano); cuando cambian de
 * nivel, se interpolan (rampa o, si `esEscalera`, escalera).
 */
export const PUENTES: readonly PuenteDelMundo[] = [
  {
    clave: "puente-este",
    centro: [4.4, 0.1],
    medioAncho: 2.15,
    medioLargo: 0.93,
    rotacionY: Math.PI / 2,
    alturaInicio: NIVEL_0,
    alturaFin: NIVEL_0,
  },
  {
    clave: "puente-oeste",
    centro: [-4.3, 0.1],
    medioAncho: 1.9,
    medioLargo: 0.93,
    rotacionY: Math.PI / 2,
    alturaInicio: NIVEL_0,
    alturaFin: NIVEL_0,
  },
  // Los tres cruces siguientes van en el otro eje: unen las islas de arriba y
  // de abajo, así que el archipiélago deja de ser una fila y se puede
  // recorrer en las dos direcciones. Los vanos salen de los bordes reales de
  // cada isla, no de tantear; los comprueba `mundo.test.ts`.
  {
    clave: "puente-mirador",
    centro: [0, -4.5],
    medioAncho: 0.93,
    medioLargo: 1.95,
    rotacionY: 0,
    alturaInicio: NIVEL_0,
    alturaFin: NIVEL_0,
  },
  {
    clave: "puente-caleta",
    centro: [8.0, 3.1],
    medioAncho: 0.93,
    medioLargo: 1.49,
    rotacionY: 0,
    alturaInicio: NIVEL_0,
    alturaFin: NIVEL_0,
  },
  {
    clave: "puente-arenal",
    centro: [-7.6, 2.85],
    medioAncho: 0.93,
    medioLargo: 1.54,
    rotacionY: 0,
    alturaInicio: NIVEL_0,
    alturaFin: NIVEL_0,
  },
  {
    clave: "puente-lago",
    centro: [0, 4.45],
    medioAncho: 0.93,
    medioLargo: 1.86,
    rotacionY: 0,
    alturaInicio: NIVEL_0,
    alturaFin: NIVEL_0,
  },

  // --- Hacia el segundo anillo (NIVEL_0 → NIVEL_1: rampa) ---
  {
    clave: "puente-acuerdos",
    centro: [12.3, -0.4],
    medioAncho: 1.85,
    medioLargo: 0.93,
    rotacionY: Math.PI / 2,
    // El extremo de x menor está del lado de isla-faro (NIVEL_0); el de x
    // mayor, del lado de isla-acuerdos (NIVEL_1).
    alturaInicio: NIVEL_0,
    alturaFin: NIVEL_1,
    // El único puente cuyo guion lo rompe y lo repara (EP01, escenas 1 a 6).
    dependeDe: { elemento: "bridge_main", estadosQueLoRompen: ["broken", "partially_fixed"] },
  },
  {
    clave: "puente-circulo",
    centro: [0, -12.75],
    medioAncho: 0.93,
    medioLargo: 1.98,
    rotacionY: 0,
    // El extremo de z menor está del lado de isla-circulo (NIVEL_1); el de z
    // mayor, del lado de isla-mirador (NIVEL_0).
    alturaInicio: NIVEL_1,
    alturaFin: NIVEL_0,
  },
  {
    clave: "puente-piedra",
    centro: [-11.9, -0.8],
    medioAncho: 1.96,
    medioLargo: 0.93,
    rotacionY: Math.PI / 2,
    // Extremo de x menor: isla-piedra (NIVEL_1). Extremo de x mayor: isla-palmeras (NIVEL_0).
    alturaInicio: NIVEL_1,
    alturaFin: NIVEL_0,
  },
  {
    clave: "puente-nube",
    centro: [7.8, 9.85],
    medioAncho: 0.93,
    medioLargo: 1.57,
    rotacionY: 0,
    // Extremo de z menor: isla-caleta (NIVEL_0). Extremo de z mayor: isla-nube (NIVEL_1).
    alturaInicio: NIVEL_0,
    alturaFin: NIVEL_1,
  },
  {
    clave: "puente-jardin",
    centro: [-7.35, 10.0],
    medioAncho: 0.93,
    medioLargo: 1.92,
    rotacionY: 0,
    // Extremo de z menor: isla-arenal (NIVEL_0). Extremo de z mayor: isla-jardin (NIVEL_1).
    alturaInicio: NIVEL_0,
    alturaFin: NIVEL_1,
  },

  // --- Dentro del segundo anillo (NIVEL_1, planos, uno de ellos largo) ---
  {
    // El puente más largo del mapa: vano de ~6 unidades entre isla-piedra e
    // isla-duna. Al estar los dos extremos en el mismo nivel no necesita
    // pendiente; demuestra que un vano largo no depende de subir de nivel.
    clave: "puente-duna",
    centro: [-15.5, 3.7],
    medioAncho: 0.93,
    medioLargo: 3.01,
    rotacionY: 0,
    alturaInicio: NIVEL_1,
    alturaFin: NIVEL_1,
  },
  {
    clave: "puente-bosque",
    centro: [16.5, 4.0],
    medioAncho: 0.93,
    medioLargo: 2.01,
    rotacionY: 0,
    alturaInicio: NIVEL_1,
    alturaFin: NIVEL_1,
  },

  // --- Hacia el tercer anillo (NIVEL_1 → NIVEL_2) ---
  {
    // Cambio de nivel corto y empinado (1.2 de largo por 1.2 de alto): se
    // dibuja como escalera (`stairs_three`), no como puente.
    clave: "puente-cascada",
    centro: [19.5, -0.4],
    medioAncho: 1.2,
    medioLargo: 0.61,
    rotacionY: Math.PI / 2,
    alturaInicio: NIVEL_1,
    alturaFin: NIVEL_2,
    esEscalera: true,
  },
  {
    // Cambio de nivel largo (~3.8) y suave: rampa, no escalera.
    clave: "puente-risco",
    centro: [0, -21.2],
    medioAncho: 0.93,
    medioLargo: 1.91,
    rotacionY: 0,
    alturaInicio: NIVEL_1,
    alturaFin: NIVEL_2,
  },
  {
    clave: "puente-cueva",
    centro: [-19.15, -1.0],
    medioAncho: 1.96,
    medioLargo: 0.93,
    rotacionY: Math.PI / 2,
    alturaInicio: NIVEL_1,
    alturaFin: NIVEL_2,
  },
  {
    // Vano largo (~5.8) y con pendiente a la vez: una rampa larga.
    clave: "puente-nido",
    centro: [8.0, 17.5],
    medioAncho: 0.93,
    medioLargo: 2.91,
    rotacionY: 0,
    alturaInicio: NIVEL_1,
    alturaFin: NIVEL_2,
  },
  {
    clave: "puente-sendero",
    centro: [-7.5, 17.75],
    medioAncho: 0.93,
    medioLargo: 2.66,
    rotacionY: 0,
    alturaInicio: NIVEL_1,
    alturaFin: NIVEL_2,
  },
];

/**
 * Dónde aparece el personaje al abrir el juego.
 *
 * Está a propósito LEJOS de todos los claros. Empezaba justo encima del de la
 * isla principal, así que lo primero que veía quien jugaba era el cartel de
 * «empezar el episodio»: el mundo pedía entrar antes de dejar mirar. Ahora se
 * aparece en un sitio donde no pasa nada y hay que ir a buscar el punto.
 * `cercania.test.ts` vigila que siga siendo así.
 */
export const PUNTO_DE_PARTIDA: readonly [number, number] = [0.2, -1.9];

/** Las islas donde empieza un episodio, en el orden en que están declaradas. */
export const ISLAS_CON_EPISODIO: readonly (IslaDelMundo & {
  readonly episodioId: string;
  readonly puntoDeEncuentro: readonly [number, number];
})[] = ISLAS.filter(
  (isla): isla is IslaDelMundo & { episodioId: string; puntoDeEncuentro: readonly [number, number] } =>
    isla.episodioId !== undefined && isla.puntoDeEncuentro !== undefined,
);

/**
 * Piedra de paso: un islote pequeño al que se llega saltando.
 *
 * Son la otra forma de cruzar, además de los puentes, y existen solo entre
 * islas SIN misión. Eso no es un detalle: llegar a un episodio no puede
 * depender de acertar un salto, porque entonces el contenido quedaría detrás
 * de una habilidad y quien no la tuviera se quedaría fuera (Constitución V y
 * VII). A las dos islas con episodio se llega andando por puentes y rampas,
 * siempre.
 *
 * Se dibujan con `rock_small`/`rock_large`. El tamaño de cada roca sigue
 * viniendo de `radioCaminable`, para que lo que se ve y lo que se pisa no se
 * separen. `altura` es la del punto exacto donde se aterriza; en un camino
 * que sube de nivel (como el del oeste) cada piedra tiene la suya, a modo de
 * peldaños sueltos, pero eso es cosmético: la ruta garantizada a pie a las
 * islas con episodio nunca pasa por aquí.
 */
export interface PiedraDePaso {
  readonly clave: string;
  readonly centro: readonly [number, number];
  readonly radioCaminable: number;
  readonly altura: number;
}

/**
 * El camino de piedras del sureste, entre la isla de partida y la caleta
 * (las tres al mismo nivel), y el del oeste, entre las palmeras (NIVEL_0) y
 * la isla de piedra (NIVEL_1) — con las piedras subiendo de altura una a una,
 * como peldaños sueltos. Los huecos se calculan contra las constantes reales
 * de `salto.ts` en `mundo.test.ts`, así que si alguien toca la física del
 * salto y los huecos dejan de ser saltables, el test lo dice.
 */
export const PIEDRAS: readonly PiedraDePaso[] = [
  { clave: "piedra-caleta-1", centro: [4.6, 4.4], radioCaminable: 0.75, altura: NIVEL_0 },
  { clave: "piedra-caleta-2", centro: [2.6, 3.0], radioCaminable: 0.7, altura: NIVEL_0 },
  { clave: "piedra-caleta-3", centro: [0.9, 3.4], radioCaminable: 0.7, altura: NIVEL_0 },

  { clave: "piedra-oeste-1", centro: [-11.6, -3.9], radioCaminable: 0.75, altura: 0.6 },
  { clave: "piedra-oeste-2", centro: [-13.2, -2.9], radioCaminable: 0.7, altura: 1.0 },
];

/** Largo de un tablero de puente ya escalado, para repartir las piezas. */
export const LARGO_DE_TABLERO = 2.13 * 1.15;

/** Escala fija con la que se dibuja cada tablero de puente. */
export const ESCALA_DE_TABLERO = 1.15;

/**
 * Cuántos tableros hacen falta para cubrir un puente entero, y dónde va cada
 * uno a lo largo del eje por el que se cruza.
 *
 * Antes había siempre dos tableros repartidos "a ojo" a media distancia del
 * centro: con un vano corto sobraba hueco entre ellos (se veían dos trozos
 * con una junta en medio) y con uno largo no llegaban a las dos orillas. Acá
 * el número de piezas sale del vano real: se calcula cuántos tableros de
 * `LARGO_DE_TABLERO` hacen falta para cubrirlo (`Math.ceil`) y se reparten a
 * distancia igual entre sí, de modo que el paso entre centros nunca sea mayor
 * que `LARGO_DE_TABLERO` y no quede un hueco visible. Si el vano cambia en
 * `PUENTES`, el número de piezas cambia solo: no hay que retocar el dibujo.
 *
 * Devuelve las distancias (offsets) al centro del puente a lo largo de su eje
 * largo; quien dibuja solo tiene que sumar cada offset a la coordenada que
 * corresponda según `rotacionY`.
 */
export function offsetsDeTablerosDePuente(puente: PuenteDelMundo): readonly number[] {
  const enX = puente.medioAncho >= puente.medioLargo;
  const vano = (enX ? puente.medioAncho : puente.medioLargo) * 2;
  const cantidad = Math.max(1, Math.ceil(vano / LARGO_DE_TABLERO));
  const paso = vano / cantidad;
  return Array.from({ length: cantidad }, (_, indice) => -vano / 2 + paso * (indice + 0.5));
}

interface Punto {
  readonly x: number;
  readonly z: number;
}

function distancia(a: Punto, b: Punto): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/**
 * Un pelo hacia dentro del borde. Proyectar justo sobre el radio deja el
 * punto fuera por el error de la coma flotante, y entonces el sitio al que se
 * acaba de mandar al personaje resulta no ser caminable. Lo cazaron los
 * tests, no una revisión.
 */
const MARGEN_DE_BORDE = 1e-6;

/** Vale igual para una isla y para una piedra: las dos son círculos. */
function puntoMasCercanoEnIsla(
  isla: { readonly centro: readonly [number, number]; readonly radioCaminable: number },
  punto: Punto,
): Punto {
  const [cx, cz] = isla.centro;
  const dx = punto.x - cx;
  const dz = punto.z - cz;
  const largo = Math.hypot(dx, dz);
  if (largo <= isla.radioCaminable) return punto;
  const factor = (isla.radioCaminable - MARGEN_DE_BORDE) / largo;
  return { x: cx + dx * factor, z: cz + dz * factor };
}

function puntoMasCercanoEnPuente(puente: PuenteDelMundo, punto: Punto): Punto {
  const [cx, cz] = puente.centro;
  return {
    x: Math.min(Math.max(punto.x, cx - puente.medioAncho), cx + puente.medioAncho),
    z: Math.min(Math.max(punto.z, cz - puente.medioLargo), cz + puente.medioLargo),
  };
}

/**
 * Un puente roto no se puede cruzar. El estado sale del `environment` de la
 * escena actual (el mismo objeto que ya decide qué props se dibujan); sin
 * argumento se asume que ningún puente está roto, que es el caso de siempre
 * fuera de EP01 y lo que ya esperaban los llamadores existentes.
 */
function puenteEstaRoto(
  puente: PuenteDelMundo,
  environment: Readonly<Record<string, string>>,
): boolean {
  if (!puente.dependeDe) return false;
  const estado = environment[puente.dependeDe.elemento];
  return estado !== undefined && puente.dependeDe.estadosQueLoRompen.includes(estado);
}

const SIN_ENTORNO: Readonly<Record<string, string>> = {};

/** `true` si se puede estar de pie en ese punto: isla, puente o piedra. */
export function esCaminable(
  x: number,
  z: number,
  environment: Readonly<Record<string, string>> = SIN_ENTORNO,
): boolean {
  const punto = { x, z };
  const enIsla = ISLAS.some((isla) => distancia({ x: isla.centro[0], z: isla.centro[1] }, punto) <= isla.radioCaminable);
  if (enIsla) return true;
  const enPiedra = PIEDRAS.some(
    (piedra) => distancia({ x: piedra.centro[0], z: piedra.centro[1] }, punto) <= piedra.radioCaminable,
  );
  if (enPiedra) return true;
  return PUENTES.some(
    (puente) =>
      !puenteEstaRoto(puente, environment) &&
      Math.abs(x - puente.centro[0]) <= puente.medioAncho &&
      Math.abs(z - puente.centro[1]) <= puente.medioLargo,
  );
}

/**
 * Altura del suelo en ese punto, o `null` si ahí no se puede estar.
 *
 * Usa siempre el estado "sin puentes rotos", igual que `esCaminable` cuando
 * se la llama sin `environment`: esta función no recibe ese argumento a
 * propósito (otro módulo escribe contra esta firma exacta) y el caso de un
 * puente roto ya lo decide `esCaminable` antes de dejar caminar hasta ahí.
 *
 * En una isla o una piedra la altura es un valor fijo. En un puente (llano,
 * rampa o escalera) se interpola en línea recta entre `alturaInicio` y
 * `alturaFin` a lo largo de su eje largo, así que el paso de un nivel a otro
 * es continuo: no hay un escalón brusco que teletransporte al personaje.
 */
export function alturaDelSuelo(x: number, z: number): number | null {
  for (const isla of ISLAS) {
    if (distancia({ x: isla.centro[0], z: isla.centro[1] }, { x, z }) <= isla.radioCaminable) {
      return isla.altura;
    }
  }
  for (const piedra of PIEDRAS) {
    if (distancia({ x: piedra.centro[0], z: piedra.centro[1] }, { x, z }) <= piedra.radioCaminable) {
      return piedra.altura;
    }
  }
  for (const puente of PUENTES) {
    if (puenteEstaRoto(puente, SIN_ENTORNO)) continue;
    if (Math.abs(x - puente.centro[0]) > puente.medioAncho || Math.abs(z - puente.centro[1]) > puente.medioLargo) {
      continue;
    }
    const enX = puente.medioAncho >= puente.medioLargo;
    const [cx, cz] = puente.centro;
    const t = enX
      ? (x - (cx - puente.medioAncho)) / (2 * puente.medioAncho)
      : (z - (cz - puente.medioLargo)) / (2 * puente.medioLargo);
    const tAcotado = Math.min(1, Math.max(0, t));
    return puente.alturaInicio + (puente.alturaFin - puente.alturaInicio) * tAcotado;
  }
  return null;
}

/**
 * El punto caminable más cercano al pedido. Se usa en dos sitios: para que
 * tocar el agua lleve a la orilla en vez de no hacer nada, y para que el paso
 * de cada cuadro no termine en el mar.
 */
export function acercarAZonaCaminable(
  x: number,
  z: number,
  environment: Readonly<Record<string, string>> = SIN_ENTORNO,
): Punto {
  const punto = { x, z };
  if (esCaminable(x, z, environment)) return punto;

  const candidatos: Punto[] = [
    ...ISLAS.map((isla) => puntoMasCercanoEnIsla(isla, punto)),
    ...PIEDRAS.map((piedra) => puntoMasCercanoEnIsla(piedra, punto)),
    ...PUENTES.filter((puente) => !puenteEstaRoto(puente, environment)).map((puente) =>
      puntoMasCercanoEnPuente(puente, punto),
    ),
  ];

  let mejor = candidatos[0] ?? punto;
  for (const candidato of candidatos) {
    if (distancia(candidato, punto) < distancia(mejor, punto)) mejor = candidato;
  }
  return mejor;
}
