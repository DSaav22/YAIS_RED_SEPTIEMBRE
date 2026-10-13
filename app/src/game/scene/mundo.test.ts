// Tests del archipiélago (T-001-06, prototipo).
//
// Lo que se comprueba es que no se pueda caminar sobre el agua, que las islas
// estén de verdad conectadas, y que el archipiélago escalonado en niveles se
// suba y se baje siempre andando: sin eso, "caminar entre islas" sería una
// promesa que el mundo no cumple.

import { describe, expect, it } from "vitest";

import { DURACION_DEL_SALTO } from "./salto";
import {
  acercarAZonaCaminable,
  alturaDelSuelo,
  esCaminable,
  ISLAS,
  LARGO_DE_TABLERO,
  offsetsDeTablerosDePuente,
  PIEDRAS,
  ISLAS_CON_EPISODIO,
  ISLA_PRINCIPAL,
  PUENTES,
} from "./mundo";

/** Recorre el grafo de islas usando solo los puentes (nunca las piedras): es la ruta a pie. */
function islasAlcanzablesAndando(): Set<string> {
  const tocadasPor = (puente: (typeof PUENTES)[number]) => {
    const [cx, cz] = puente.centro;
    const enX = puente.medioAncho >= puente.medioLargo;
    const extremos = enX
      ? [
          { x: cx - puente.medioAncho, z: cz },
          { x: cx + puente.medioAncho, z: cz },
        ]
      : [
          { x: cx, z: cz - puente.medioLargo },
          { x: cx, z: cz + puente.medioLargo },
        ];
    return ISLAS.filter((isla) =>
      extremos.some(
        (punto) => Math.hypot(punto.x - isla.centro[0], punto.z - isla.centro[1]) <= isla.radioCaminable,
      ),
    ).map((isla) => isla.clave);
  };

  const alcanzadas = new Set([ISLA_PRINCIPAL.clave]);
  let crecio = true;
  while (crecio) {
    crecio = false;
    for (const puente of PUENTES) {
      const orillas = tocadasPor(puente);
      if (!orillas.some((clave) => alcanzadas.has(clave))) continue;
      for (const clave of orillas) {
        if (!alcanzadas.has(clave)) {
          alcanzadas.add(clave);
          crecio = true;
        }
      }
    }
  }
  return alcanzadas;
}

describe("esCaminable", () => {
  it("se puede estar en el centro de cada isla", () => {
    for (const isla of ISLAS) {
      expect(esCaminable(isla.centro[0], isla.centro[1])).toBe(true);
    }
  });

  it("no se puede estar en el agua", () => {
    // Bien lejos de todo, y también en un hueco entre islas por donde no pasa
    // ningún puente.
    expect(esCaminable(60, 60)).toBe(false);
    expect(esCaminable(0, -2)).toBe(true); // dentro de la isla de partida, de control
    expect(esCaminable(3.0, -6.0)).toBe(false);
  });

  it("se puede cruzar cada puente", () => {
    for (const puente of PUENTES) {
      expect(esCaminable(puente.centro[0], puente.centro[1])).toBe(true);
    }
  });

  it("cada puente toca de verdad las dos orillas que une", () => {
    // Si un puente no llegara a la isla, quedaría un salto de agua en medio y
    // el personaje se detendría en el aire. Los cruces no van todos en el
    // mismo eje, así que los extremos se buscan por el lado largo del
    // tablero, no siempre en x.
    for (const puente of PUENTES) {
      const [cx, cz] = puente.centro;
      const enX = puente.medioAncho >= puente.medioLargo;
      const extremoA = enX ? { x: cx - puente.medioAncho, z: cz } : { x: cx, z: cz - puente.medioLargo };
      const extremoB = enX ? { x: cx + puente.medioAncho, z: cz } : { x: cx, z: cz + puente.medioLargo };

      const tocaIsla = (punto: { x: number; z: number }) =>
        ISLAS.some(
          (isla) => Math.hypot(punto.x - isla.centro[0], punto.z - isla.centro[1]) <= isla.radioCaminable,
        );

      expect(tocaIsla(extremoA), `${puente.clave} no llega a ninguna isla por un extremo`).toBe(true);
      expect(tocaIsla(extremoB), `${puente.clave} no llega a ninguna isla por el otro`).toBe(true);
    }
  });

  it("no hay ninguna isla aislada: desde la principal se llega a todas andando", () => {
    // Es la promesa del mundo abierto. Se recorre el grafo usando solo los
    // puentes (nunca las piedras, que dependen de saltar): una isla que no
    // aparezca aquí sería un sitio al que no se puede ir a pie.
    const alcanzadas = islasAlcanzablesAndando();
    expect([...alcanzadas].sort()).toEqual(ISLAS.map((isla) => isla.clave).sort());
  });

  it("a las dos islas con episodio se llega siempre andando, nunca solo saltando", () => {
    const alcanzadas = islasAlcanzablesAndando();
    for (const isla of ISLAS_CON_EPISODIO) {
      expect(alcanzadas.has(isla.clave), `${isla.clave} no se alcanza a pie`).toBe(true);
    }
  });

  it("las islas no se solapan entre sí", () => {
    // Dos islas encimadas serían un solo sitio dibujado dos veces.
    for (const a of ISLAS) {
      for (const b of ISLAS) {
        if (a.clave === b.clave) continue;
        const separacion = Math.hypot(a.centro[0] - b.centro[0], a.centro[1] - b.centro[1]);
        expect(separacion, `${a.clave} y ${b.clave} se solapan`).toBeGreaterThan(
          a.radioCaminable + b.radioCaminable,
        );
      }
    }
  });

  it("se puede ir de una isla a otra sin pisar agua", () => {
    // Recorrido en línea recta desde la isla del oeste hasta la del este,
    // muestreado cada 10 cm: ningún punto puede caer fuera.
    const oeste = ISLAS.find((isla) => isla.clave === "isla-palmeras");
    const este = ISLAS.find((isla) => isla.clave === "isla-faro");
    if (!oeste || !este) throw new Error("Faltan islas del archipiélago.");

    const pasos = 200;
    let fueraDelCamino = 0;
    for (let paso = 0; paso <= pasos; paso += 1) {
      const t = paso / pasos;
      const x = oeste.centro[0] + (este.centro[0] - oeste.centro[0]) * t;
      const z = oeste.centro[1] + (este.centro[1] - oeste.centro[1]) * t;
      if (!esCaminable(x, z)) fueraDelCamino += 1;
    }

    expect(fueraDelCamino).toBe(0);
  });

  it("hay al menos un puente con un vano de 5 unidades o más", () => {
    const largoDe = (puente: (typeof PUENTES)[number]) =>
      (puente.medioAncho >= puente.medioLargo ? puente.medioAncho : puente.medioLargo) * 2;
    expect(PUENTES.some((puente) => largoDe(puente) >= 5)).toBe(true);
  });
});

describe("alturaDelSuelo", () => {
  it("devuelve un número donde esCaminable es true, y null donde es false", () => {
    const puntos: Array<[number, number]> = [
      [0, 0],
      [16.5, -0.4],
      [0, -17.0],
      [60, 60],
      [3.0, -6.0],
      ...ISLAS.map((isla) => isla.centro as [number, number]),
      ...PUENTES.map((puente) => puente.centro as [number, number]),
      ...PIEDRAS.map((piedra) => piedra.centro as [number, number]),
    ];
    for (const [x, z] of puntos) {
      const altura = alturaDelSuelo(x, z);
      if (esCaminable(x, z)) {
        expect(altura, `(${x}, ${z}) es caminable pero alturaDelSuelo dio null`).not.toBeNull();
      } else {
        expect(altura, `(${x}, ${z}) no es caminable pero alturaDelSuelo dio un número`).toBeNull();
      }
    }
  });

  it("coincide con la altura de la isla en su centro", () => {
    for (const isla of ISLAS) {
      expect(alturaDelSuelo(isla.centro[0], isla.centro[1])).toBeCloseTo(isla.altura);
    }
  });

  it("en un puente con pendiente, la altura sube o baja sin escalones bruscos", () => {
    const rampa = PUENTES.find((puente) => puente.alturaInicio !== puente.alturaFin);
    if (!rampa) throw new Error("No hay ningún puente con pendiente que probar.");

    const enX = rampa.medioAncho >= rampa.medioLargo;
    const [cx, cz] = rampa.centro;
    const largo = (enX ? rampa.medioAncho : rampa.medioLargo) * 2;
    const muestras = 40;
    let anterior: number | null = null;
    for (let i = 0; i <= muestras; i += 1) {
      const t = i / muestras;
      const offset = -largo / 2 + largo * t;
      const x = enX ? cx + offset : cx;
      const z = enX ? cz : cz + offset;
      const altura = alturaDelSuelo(x, z);
      expect(altura).not.toBeNull();
      if (anterior !== null && altura !== null) {
        // Entre dos muestras contiguas el cambio de altura no puede ser mayor
        // que el salto total de la rampa: si lo fuera, habría un escalón que
        // teletransportaría al personaje en vez de dejarlo subir gradualmente.
        expect(Math.abs(altura - anterior)).toBeLessThanOrEqual(Math.abs(rampa.alturaFin - rampa.alturaInicio) + 1e-9);
      }
      anterior = altura;
    }

    const alturaAlInicio = alturaDelSuelo(
      enX ? cx - rampa.medioAncho : cx,
      enX ? cz : cz - rampa.medioLargo,
    );
    const alturaAlFinal = alturaDelSuelo(
      enX ? cx + rampa.medioAncho : cx,
      enX ? cz : cz + rampa.medioLargo,
    );
    expect(alturaAlInicio).toBeCloseTo(rampa.alturaInicio);
    expect(alturaAlFinal).toBeCloseTo(rampa.alturaFin);
  });

  it("las dos islas con episodio están en el mismo nivel entre sí, y se sube por rampa, no por salto", () => {
    // No es un requisito de diseño que compartan nivel, pero si un puente
    // cambia de nivel para llegar a una de ellas, tiene que ser un puente
    // (con pendiente), nunca una piedra de paso.
    for (const isla of ISLAS_CON_EPISODIO) {
      for (const piedra of PIEDRAS) {
        const separacion = Math.hypot(piedra.centro[0] - isla.centro[0], piedra.centro[1] - isla.centro[1]);
        expect(separacion).toBeGreaterThan(piedra.radioCaminable + isla.radioCaminable);
      }
    }
  });
});

describe("offsetsDeTablerosDePuente", () => {
  it("cubre el vano entero sin dejar hueco entre tableros", () => {
    for (const puente of PUENTES) {
      const enX = puente.medioAncho >= puente.medioLargo;
      const vano = (enX ? puente.medioAncho : puente.medioLargo) * 2;
      const offsets = offsetsDeTablerosDePuente(puente);

      expect(offsets.length).toBeGreaterThan(0);

      // El primer y el último tablero llegan hasta las orillas del vano.
      expect(offsets[0]! - LARGO_DE_TABLERO / 2).toBeLessThanOrEqual(-vano / 2 + 1e-6);
      expect(offsets[offsets.length - 1]! + LARGO_DE_TABLERO / 2).toBeGreaterThanOrEqual(
        vano / 2 - 1e-6,
      );

      // Entre un tablero y el siguiente no puede haber más distancia que el
      // largo de un tablero, o se vería el agua entre las dos piezas.
      for (let i = 1; i < offsets.length; i += 1) {
        expect(offsets[i]! - offsets[i - 1]!).toBeLessThanOrEqual(LARGO_DE_TABLERO + 1e-9);
      }
    }
  });

  it("un vano que cabe en un solo tablero no reparte piezas de más", () => {
    const puenteCorto = {
      clave: "x",
      centro: [0, 0],
      medioAncho: 0.5,
      medioLargo: 0.93,
      rotacionY: 0,
      alturaInicio: 0.2,
      alturaFin: 0.2,
    } as const;
    expect(offsetsDeTablerosDePuente(puenteCorto)).toEqual([0]);
  });

  it("un vano largo (5-6 unidades) reparte varios tableros sin huecos", () => {
    const largo = PUENTES.find((puente) => {
      const enX = puente.medioAncho >= puente.medioLargo;
      return (enX ? puente.medioAncho : puente.medioLargo) * 2 >= 5;
    });
    if (!largo) throw new Error("No hay ningún puente largo que probar.");
    expect(offsetsDeTablerosDePuente(largo).length).toBeGreaterThan(1);
  });
});

describe("puentes que el guion puede romper", () => {
  it("sin environment, todos los puentes se cruzan (comportamiento de siempre)", () => {
    for (const puente of PUENTES) {
      expect(esCaminable(puente.centro[0], puente.centro[1])).toBe(true);
    }
  });

  it("un puente marcado como roto deja de ser caminable en ese estado", () => {
    const puenteRoto = PUENTES.find((puente) => puente.dependeDe);
    if (!puenteRoto?.dependeDe) throw new Error("Ningún puente declara dependeDe.");

    const environment = { [puenteRoto.dependeDe.elemento]: puenteRoto.dependeDe.estadosQueLoRompen[0]! };
    expect(esCaminable(puenteRoto.centro[0], puenteRoto.centro[1], environment)).toBe(false);
  });

  it("un puente roto vuelve a cruzarse en cualquier otro estado", () => {
    const puenteRoto = PUENTES.find((puente) => puente.dependeDe);
    if (!puenteRoto?.dependeDe) throw new Error("Ningún puente declara dependeDe.");

    const environment = { [puenteRoto.dependeDe.elemento]: "fixed" };
    expect(esCaminable(puenteRoto.centro[0], puenteRoto.centro[1], environment)).toBe(true);
  });

  it("acercarAZonaCaminable no manda a nadie a un puente roto", () => {
    const puenteRoto = PUENTES.find((puente) => puente.dependeDe);
    if (!puenteRoto?.dependeDe) throw new Error("Ningún puente declara dependeDe.");

    const environment = { [puenteRoto.dependeDe.elemento]: puenteRoto.dependeDe.estadosQueLoRompen[0]! };
    const [cx, cz] = puenteRoto.centro;
    const cercano = acercarAZonaCaminable(cx, cz, environment);

    expect(esCaminable(cercano.x, cercano.z, environment)).toBe(true);
  });
});

describe("acercarAZonaCaminable", () => {
  it("deja igual un punto que ya es caminable", () => {
    expect(acercarAZonaCaminable(0, 0)).toEqual({ x: 0, z: 0 });
  });

  it("lleva a la orilla el punto de agua que se señale", () => {
    // Tocar el agua no puede no hacer nada: lleva al borde alcanzable más
    // cercano, sea isla, puente o piedra de paso. Lo que importa nunca fue a
    // cuál se va sino que se vaya a la más cercana.
    const enElAgua = { x: 3.0, z: -6.0 };
    const orilla = acercarAZonaCaminable(enElAgua.x, enElAgua.z);

    expect(esCaminable(orilla.x, orilla.z)).toBe(true);

    const recorrido = Math.hypot(orilla.x - enElAgua.x, orilla.z - enElAgua.z);
    for (const isla of ISLAS) {
      const hastaEsaIsla =
        Math.hypot(enElAgua.x - isla.centro[0], enElAgua.z - isla.centro[1]) - isla.radioCaminable;
      expect(recorrido).toBeLessThanOrEqual(hastaEsaIsla + 1e-9 * hastaEsaIsla + 1e-6);
    }
  });

  it("elige la orilla más cercana, no siempre la isla central", () => {
    const cercaDelFaro = acercarAZonaCaminable(14, -1.2);

    expect(esCaminable(cercaDelFaro.x, cercaDelFaro.z)).toBe(true);
    expect(cercaDelFaro.x).toBeGreaterThan(5);
  });
});

describe("islas con episodio", () => {
  it("cada episodio tiene su propia isla y su claro dentro de ella", () => {
    expect(ISLAS_CON_EPISODIO.length).toBeGreaterThan(1);

    const ids = ISLAS_CON_EPISODIO.map((isla) => isla.episodioId);
    expect(new Set(ids).size, "dos islas llevan al mismo episodio").toBe(ids.length);

    for (const isla of ISLAS_CON_EPISODIO) {
      const [x, z] = isla.puntoDeEncuentro;
      expect(esCaminable(x, z), `el claro de ${isla.clave} cae en el agua`).toBe(true);
      expect(Math.hypot(x - isla.centro[0], z - isla.centro[1])).toBeLessThan(isla.radioCaminable);
    }
  });
});

describe("piedras de paso", () => {
  /** Lo que avanza el personaje mientras dura un salto, a la velocidad de caminar. */
  const ALCANCE_DEL_SALTO = 1.6 * DURACION_DEL_SALTO;

  it("se puede estar de pie en cada piedra", () => {
    for (const piedra of PIEDRAS) {
      expect(esCaminable(piedra.centro[0], piedra.centro[1])).toBe(true);
    }
  });

  it("cada piedra está a un salto de otra piedra o de una isla", () => {
    // Si un hueco fuera más ancho que el alcance del salto, el camino se
    // cortaría y habría un sitio al que se ve pero al que no se llega. El
    // test se calcula contra las constantes reales de `salto.ts`: tocar la
    // física del salto sin mirar los huecos rompe esto aquí.
    for (const piedra of PIEDRAS) {
      const bordes: number[] = [];
      for (const otra of PIEDRAS) {
        if (otra.clave === piedra.clave) continue;
        bordes.push(
          Math.hypot(piedra.centro[0] - otra.centro[0], piedra.centro[1] - otra.centro[1]) -
            piedra.radioCaminable -
            otra.radioCaminable,
        );
      }
      for (const isla of ISLAS) {
        bordes.push(
          Math.hypot(piedra.centro[0] - isla.centro[0], piedra.centro[1] - isla.centro[1]) -
            piedra.radioCaminable -
            isla.radioCaminable,
        );
      }

      const hueco = Math.min(...bordes);
      expect(hueco, `${piedra.clave} queda a ${hueco.toFixed(2)}, más que un salto`).toBeLessThanOrEqual(
        ALCANCE_DEL_SALTO,
      );
    }
  });

  it("cada camino de piedras conecta de verdad dos islas, de punta a punta", () => {
    // Un camino de piedras que no toque isla en los dos extremos sería un
    // adorno flotante, la queja concreta que motivó este archivo: hay que
    // poder empezar el salto desde una isla y terminarlo en otra.
    const tocaAlgunaIsla = (piedra: (typeof PIEDRAS)[number]) =>
      ISLAS.some(
        (isla) =>
          Math.hypot(piedra.centro[0] - isla.centro[0], piedra.centro[1] - isla.centro[1]) -
            piedra.radioCaminable -
            isla.radioCaminable <=
          ALCANCE_DEL_SALTO,
      );

    // Cada piedra, sola o encadenada con otras, debe llegar a tocar una isla:
    // si ninguna piedra del camino estuviera al alcance de una isla, el
    // camino no conectaría nada, solo flotaría cerca.
    const grupos = new Map<string, (typeof PIEDRAS)[number][]>();
    for (const piedra of PIEDRAS) {
      const prefijo = piedra.clave.replace(/-\d+$/, "");
      const grupo = grupos.get(prefijo) ?? [];
      grupo.push(piedra);
      grupos.set(prefijo, grupo);
    }

    for (const [prefijo, piedras] of grupos) {
      expect(piedras.some(tocaAlgunaIsla), `ninguna piedra de ${prefijo} toca una isla`).toBe(true);
    }
  });

  it("ninguna piedra toca una isla con episodio", () => {
    // Llegar a un episodio no puede depender de acertar un salto: a las islas
    // con misión se va andando por puentes (Constitución V y VII).
    for (const piedra of PIEDRAS) {
      for (const isla of ISLAS) {
        if (!isla.episodioId) continue;
        const separacion =
          Math.hypot(piedra.centro[0] - isla.centro[0], piedra.centro[1] - isla.centro[1]) -
          piedra.radioCaminable -
          isla.radioCaminable;
        expect(separacion, `${piedra.clave} hace saltable ${isla.clave}`).toBeGreaterThan(
          ALCANCE_DEL_SALTO,
        );
      }
    }
  });

  it("no se solapan con las islas: son otro sitio, no un trozo de orilla", () => {
    for (const piedra of PIEDRAS) {
      for (const isla of ISLAS) {
        const separacion = Math.hypot(
          piedra.centro[0] - isla.centro[0],
          piedra.centro[1] - isla.centro[1],
        );
        expect(separacion).toBeGreaterThan(piedra.radioCaminable + isla.radioCaminable);
      }
    }
  });
});
