import { describe, expect, it } from "vitest";
import {
  ESTADO_DE_SALTO_INICIAL,
  DURACION_DEL_SALTO,
  HAY_DOBLE_SALTO,
  ALTURA_DE_CAIDA,
  alturaDelSalto,
  avanzarSalto,
  iniciarSalto,
  obtenerPuntoDeRecuperacion,
  recordarPuntoSeguro,
  seCayoDelMundo,
  seguirAlSuelo,
  VELOCIDAD_DE_SUBIDA,
} from "./salto";
import { PUNTO_DE_PARTIDA, esCaminable, ISLAS } from "./mundo";

describe("el salto", () => {
  it("empieza en el suelo con altura cero", () => {
    expect(ESTADO_DE_SALTO_INICIAL.fase).toBe("en-suelo");
    expect(alturaDelSalto(ESTADO_DE_SALTO_INICIAL)).toBe(0);
  });

  it("sube al iniciar el salto", () => {
    const enElAire = iniciarSalto(ESTADO_DE_SALTO_INICIAL);
    expect(enElAire.fase).toBe("subiendo");
    expect(alturaDelSalto(enElAire)).toBe(0);
  });

  it("no muta el estado que recibe", () => {
    const original = ESTADO_DE_SALTO_INICIAL;
    const copia = { ...original };
    iniciarSalto(original);
    expect(original).toEqual(copia);
  });

  it("no se puede saltar otra vez en el aire (no hay doble salto)", () => {
    expect(HAY_DOBLE_SALTO).toBe(false);
    const enElAire = iniciarSalto(ESTADO_DE_SALTO_INICIAL);
    const segundoIntento = iniciarSalto(enElAire);
    expect(segundoIntento).toBe(enElAire);
  });

  it("pasa de subiendo a cayendo a mitad del salto", () => {
    let estado = iniciarSalto(ESTADO_DE_SALTO_INICIAL);
    estado = avanzarSalto(estado, DURACION_DEL_SALTO / 2 + 0.001);
    expect(estado.fase).toBe("cayendo");
  });

  it("la altura vuelve a cero al terminar el salto", () => {
    let estado = iniciarSalto(ESTADO_DE_SALTO_INICIAL);
    estado = avanzarSalto(estado, DURACION_DEL_SALTO + 0.5);
    expect(estado.fase).toBe("en-suelo");
    expect(alturaDelSalto(estado)).toBe(0);
  });

  it("la altura nunca es negativa", () => {
    let estado = iniciarSalto(ESTADO_DE_SALTO_INICIAL);
    for (let t = 0; t < DURACION_DEL_SALTO; t += 0.03) {
      estado = avanzarSalto(estado, 0.03);
      expect(alturaDelSalto(estado)).toBeGreaterThanOrEqual(0);
    }
  });

  it("ignora deltas absurdos sin lanzar y sin cambiar de fase", () => {
    const estado = iniciarSalto(ESTADO_DE_SALTO_INICIAL);
    expect(() => avanzarSalto(estado, Number.NaN)).not.toThrow();
    expect(() => avanzarSalto(estado, Number.POSITIVE_INFINITY)).not.toThrow();
    expect(avanzarSalto(estado, Number.NaN)).toBe(estado);
    expect(avanzarSalto(estado, Number.POSITIVE_INFINITY)).toBe(estado);
  });

  it("avanzar en el suelo no hace nada", () => {
    const estado = avanzarSalto(ESTADO_DE_SALTO_INICIAL, 1);
    expect(estado).toBe(ESTADO_DE_SALTO_INICIAL);
  });
});

describe("la memoria del último punto seguro", () => {
  const isla = ISLAS[0]!;

  it("recuerda un punto caminable", () => {
    const [x, z] = isla.centro;
    const recuerdo = recordarPuntoSeguro(null, x, z);
    expect(recuerdo).toEqual({ x, z });
  });

  it("no recuerda un punto en el agua: conserva lo anterior", () => {
    const anterior = { x: isla.centro[0], z: isla.centro[1] };
    const recuerdo = recordarPuntoSeguro(anterior, 1000, 1000);
    expect(recuerdo).toEqual(anterior);
  });

  it("sin memoria previa y punto no caminable, sigue sin memoria", () => {
    const recuerdo = recordarPuntoSeguro(null, 1000, 1000);
    expect(recuerdo).toBeNull();
  });

  it("no lanza con NaN o Infinity", () => {
    expect(() => recordarPuntoSeguro(null, Number.NaN, 0)).not.toThrow();
    expect(() => recordarPuntoSeguro(null, Number.POSITIVE_INFINITY, 0)).not.toThrow();
    expect(recordarPuntoSeguro(null, Number.NaN, 0)).toBeNull();
  });
});

describe("la recuperación al caerse", () => {
  const isla = ISLAS[0]!;

  it("devuelve un punto que esCaminable acepta cuando hay memoria", () => {
    const puntoSeguro = { x: isla.centro[0], z: isla.centro[1] };
    const [x, z] = obtenerPuntoDeRecuperacion(puntoSeguro);
    expect(esCaminable(x, z)).toBe(true);
  });

  it("sin memoria previa devuelve un punto válido (el de partida)", () => {
    const [x, z] = obtenerPuntoDeRecuperacion(null);
    expect(esCaminable(x, z)).toBe(true);
    expect([x, z]).toEqual(PUNTO_DE_PARTIDA);
  });

  it("si la memoria quedó corrupta, cae en el punto de partida sin lanzar", () => {
    const corrupto = { x: Number.NaN, z: Number.POSITIVE_INFINITY };
    expect(() => obtenerPuntoDeRecuperacion(corrupto)).not.toThrow();
    const [x, z] = obtenerPuntoDeRecuperacion(corrupto);
    expect(esCaminable(x, z)).toBe(true);
  });

  it("si la memoria apunta a un sitio que ya no es caminable, cae en el punto de partida", () => {
    const puntoEnElAgua = { x: 1000, z: 1000 };
    const [x, z] = obtenerPuntoDeRecuperacion(puntoEnElAgua);
    expect(esCaminable(x, z)).toBe(true);
    expect([x, z]).toEqual(PUNTO_DE_PARTIDA);
  });

  it("la altura de caída está por debajo del suelo, con margen", () => {
    expect(ALTURA_DE_CAIDA).toBeLessThan(0);
  });

  it("no lanza con coordenadas enormes", () => {
    expect(() => obtenerPuntoDeRecuperacion({ x: 1e12, z: -1e12 })).not.toThrow();
  });
});

describe("seCayoDelMundo", () => {
  it("no hay caída al estar de pie sobre el suelo local", () => {
    expect(seCayoDelMundo(0.2, 0.2)).toBe(false);
  });

  it("no hay caída por un tambaleo pequeño (menos que el margen)", () => {
    expect(seCayoDelMundo(0.0, 0.2)).toBe(false);
  });

  it("hay caída al quedar por debajo del margen bajo el suelo local", () => {
    expect(seCayoDelMundo(-1, 0.2)).toBe(true);
  });

  it("funciona igual con un suelo alto: es relativo, no una y absoluta", () => {
    // Saltar de una isla a y=5: el mismo margen relativo aplica ahí arriba.
    expect(seCayoDelMundo(4.9, 5)).toBe(false);
    expect(seCayoDelMundo(4.0, 5)).toBe(true);
  });

  it("sin suelo bajo los pies (agua o hueco entre islas) siempre es caída", () => {
    expect(seCayoDelMundo(0.2, null)).toBe(true);
    expect(seCayoDelMundo(100, null)).toBe(true);
  });

  it("no lanza con entradas absurdas", () => {
    expect(() => seCayoDelMundo(Number.NaN, 0.2)).not.toThrow();
    expect(seCayoDelMundo(Number.NaN, 0.2)).toBe(true);
    expect(() => seCayoDelMundo(Number.POSITIVE_INFINITY, 0.2)).not.toThrow();
    expect(() => seCayoDelMundo(0.2, Number.POSITIVE_INFINITY)).not.toThrow();
  });
});

describe("seguirAlSuelo", () => {
  it("se acerca al suelo sin pasarse y avisa de que todavía no llegó", () => {
    const paso = seguirAlSuelo(0, 1.4, 0.5);

    expect(paso.y).toBeCloseTo(0.5, 6);
    expect(paso.asentado).toBe(false);
  });

  it("clava la altura exacta al llegar, sin quedarse a un pelo", () => {
    // Si no clavara el valor, el personaje quedaría flotando unas milésimas
    // por encima del césped para siempre.
    const paso = seguirAlSuelo(1.399, 1.4, 0.5);

    expect(paso.y).toBe(1.4);
    expect(paso.asentado).toBe(true);
  });

  it("también baja, no solo sube", () => {
    const paso = seguirAlSuelo(2.6, 0.2, 0.5);

    expect(paso.y).toBeCloseTo(2.1, 6);
    expect(paso.asentado).toBe(false);
  });

  it("una subida entera acaba asentada y en el suelo exacto", () => {
    // Es la prueba del fallo real: se simula cuadro a cuadro hasta que dice
    // que ya está, y se comprueba que termina donde debe y en un número
    // razonable de cuadros. Antes esto no terminaba nunca porque nadie
    // seguía pidiendo cuadros.
    let y = 0.2;
    let asentado = false;
    let cuadros = 0;
    while (!asentado && cuadros < 600) {
      const paso = seguirAlSuelo(y, 2.6, VELOCIDAD_DE_SUBIDA * (1 / 60));
      y = paso.y;
      asentado = paso.asentado;
      cuadros += 1;
    }

    expect(asentado).toBe(true);
    expect(y).toBe(2.6);
    expect(cuadros).toBeLessThan(300);
  });

  it("sin suelo debajo no toca la altura: manda el salto", () => {
    const paso = seguirAlSuelo(3, null, 0.5);

    expect(paso.y).toBe(3);
    expect(paso.asentado).toBe(true);
  });

  it("no lanza ni devuelve disparates con entradas absurdas", () => {
    expect(seguirAlSuelo(Number.NaN, 1, 0.5).y).toBe(1);
    expect(seguirAlSuelo(0, Number.POSITIVE_INFINITY, 0.5).y).toBe(0);
    expect(seguirAlSuelo(0, 1, -5).asentado).toBe(false);
  });
});

describe("el salto no depende de la dirección en la que se camina", () => {
  // Se reportó que "solo funciona caminando hacia atrás". La física de aquí
  // no recibe ninguna dirección: `iniciarSalto`/`avanzarSalto`/`alturaDelSalto`
  // solo ven tiempo transcurrido. Quien decide si el personaje avanza en
  // x/z mientras está en el aire es `useCharacterWalk.ts`, y lo hace con el
  // mismo `orden.x`/`orden.z` de siempre, sin mirar la fase del salto salvo
  // para no recortar contra el suelo. Este test deja registrado, a nivel del
  // módulo puro, que la altura del salto es una función de una sola variable
  // (el tiempo) y no puede depender de hacia dónde se camina, aunque alguien
  // vuelva a tocar este archivo más adelante.
  it("la altura en cada instante es la misma sin importar qué más esté pasando", () => {
    const trayectoria: number[] = [];
    let estado = iniciarSalto(ESTADO_DE_SALTO_INICIAL);
    const paso = DURACION_DEL_SALTO / 20;
    for (let i = 0; i < 20; i += 1) {
      trayectoria.push(alturaDelSalto(estado));
      estado = avanzarSalto(estado, paso);
    }

    // Repetirlo no cambia nada: no hay estado oculto ni aleatoriedad.
    let otraVez = iniciarSalto(ESTADO_DE_SALTO_INICIAL);
    for (let i = 0; i < 20; i += 1) {
      expect(alturaDelSalto(otraVez)).toBe(trayectoria[i]);
      otraVez = avanzarSalto(otraVez, paso);
    }

    // Sube y baja de verdad: no es un salto imperceptible.
    expect(Math.max(...trayectoria)).toBeGreaterThan(0.5);
  });
});
