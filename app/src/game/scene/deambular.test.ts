// Tests del deambular de fondo (T-001-06).
//
// Con azar fijo para que el resultado sea el mismo siempre: es la única
// manera de probar algo que decide "al azar" sin que el test sea un volado.

import { describe, expect, it } from "vitest";

import {
  avanzarDeambular,
  crearEstadoDeDeambular,
  DURACION_DE_PASEO_MAX,
  type EstadoDeDeambular,
} from "./deambular";
import { esCaminable, ISLAS } from "./mundo";

/** Azar determinista: recorre una secuencia fija y vuelve a empezar. */
function azarFijo(valores: readonly number[]): () => number {
  let i = 0;
  return () => {
    const v = valores[i % valores.length] ?? 0;
    i += 1;
    return v;
  };
}

describe("crearEstadoDeDeambular", () => {
  it("empieza parado, en el ancla pedida", () => {
    const estado = crearEstadoDeDeambular({ ancla: [16.5, -0.4], azar: azarFijo([0.5]) });
    expect(estado.enMovimiento).toBe(false);
    expect(estado.destino).toEqual(estado.ancla);
  });

  it("si el ancla no es caminable, la corrige en vez de fallar", () => {
    const estado = crearEstadoDeDeambular({ ancla: [1000, 1000], azar: azarFijo([0.5]) });
    expect(esCaminable(estado.ancla[0], estado.ancla[1])).toBe(true);
  });

  it("un radio de paseo 0 no rompe nada", () => {
    const estado = crearEstadoDeDeambular({ ancla: [16.5, -0.4], radioDePaseo: 0, azar: azarFijo([0.5]) });
    expect(estado.radioDePaseo).toBe(0);
  });

  it("un radio de paseo negativo se trata como 0", () => {
    const estado = crearEstadoDeDeambular({ ancla: [16.5, -0.4], radioDePaseo: -3, azar: azarFijo([0.5]) });
    expect(estado.radioDePaseo).toBe(0);
  });
});

describe("avanzarDeambular", () => {
  const ancla: readonly [number, number] = [16.5, -0.4]; // isla-acuerdos

  it("todo destino generado es caminable", () => {
    const azares = [
      [0, 0.1],
      [0.25, 0.5],
      [0.5, 0.9],
      [0.75, 0.3],
      [0.99, 0.6],
    ];
    for (const secuencia of azares) {
      const azar = azarFijo(secuencia);
      let estado = crearEstadoDeDeambular({ ancla, azar });
      // Forzar el fin de la pausa para que proponga destino.
      estado = avanzarDeambular(estado, 999, azar);
      expect(estado.enMovimiento).toBe(true);
      expect(esCaminable(estado.destino[0], estado.destino[1])).toBe(true);
    }
  });

  it("todo destino queda dentro del radio de paseo alrededor del ancla", () => {
    const radioDePaseo = 1.2;
    const azar = azarFijo([0.3, 0.7, 0.1, 0.9, 0.5, 0.5]);
    let estado = crearEstadoDeDeambular({ ancla, radioDePaseo, azar });
    for (let i = 0; i < 5; i += 1) {
      estado = avanzarDeambular(estado, 999, azar);
      const d = Math.hypot(estado.destino[0] - ancla[0], estado.destino[1] - ancla[1]);
      // Margen mínimo: `acercarAZonaCaminable` puede mover el punto sobre el
      // borde de la isla si el sorteo cayó justo afuera, así que se admite un
      // poco más que el radio pedido en vez de exigir una igualdad exacta.
      expect(d).toBeLessThanOrEqual(radioDePaseo + 0.05);
    }
  });

  it("se alternan andar y estar parado", () => {
    const azar = azarFijo([0.4]);
    let estado = crearEstadoDeDeambular({ ancla, azar });
    const fases: boolean[] = [estado.enMovimiento];
    for (let i = 0; i < 6; i += 1) {
      estado = avanzarDeambular(estado, 999, azar);
      fases.push(estado.enMovimiento);
    }
    expect(fases).toEqual([false, true, false, true, false, true, false]);
  });

  it("devuelve un estado nuevo y no muta el de entrada", () => {
    const azar = azarFijo([0.4]);
    const original = crearEstadoDeDeambular({ ancla, azar });
    const copia: EstadoDeDeambular = { ...original };
    const siguiente = avanzarDeambular(original, 999, azar);
    expect(original).toEqual(copia);
    expect(siguiente).not.toBe(original);
  });

  it("un delta chico no cambia de fase, solo descuenta tiempo", () => {
    const azar = azarFijo([0.4]);
    const original = crearEstadoDeDeambular({ ancla, azar });
    const siguiente = avanzarDeambular(original, 0.01, azar);
    expect(siguiente.enMovimiento).toBe(original.enMovimiento);
    expect(siguiente.tiempoRestanteDelTramo).toBeLessThan(original.tiempoRestanteDelTramo);
  });

  it("un delta negativo se trata como cero, no hace retroceder el reloj", () => {
    const azar = azarFijo([0.4]);
    const original = crearEstadoDeDeambular({ ancla, azar });
    const siguiente = avanzarDeambular(original, -5, azar);
    expect(siguiente.tiempoRestanteDelTramo).toBe(original.tiempoRestanteDelTramo);
  });

  it("nada lanza con una isla inexistente en el ancla", () => {
    expect(() => {
      const azar = azarFijo([0.4]);
      const estado = crearEstadoDeDeambular({ ancla: [0, 0], azar });
      // islaClave nunca es de una isla "inexistente" porque se calcula de la
      // más cercana; esto confirma que igual con anclas raras no revienta.
      avanzarDeambular(estado, 1, azar);
    }).not.toThrow();
  });

  it("nada lanza con tiempos muy grandes ni con radio 0", () => {
    const azar = azarFijo([0.2, 0.8]);
    let estado = crearEstadoDeDeambular({ ancla, radioDePaseo: 0, azar });
    expect(() => {
      estado = avanzarDeambular(estado, DURACION_DE_PASEO_MAX * 10, azar);
    }).not.toThrow();
    expect(estado.destino).toEqual(ancla);
  });

  it("respeta islas conocidas del archipiélago sin salirse de ellas", () => {
    const otraIsla = ISLAS[3];
    if (!otraIsla) throw new Error("se esperaba al menos 4 islas en el mundo de prueba");
    const azar = azarFijo([0.1, 0.6, 0.9, 0.2]);
    let estado = crearEstadoDeDeambular({ ancla: otraIsla.centro, radioDePaseo: 1, azar });
    estado = avanzarDeambular(estado, 999, azar);
    expect(esCaminable(estado.destino[0], estado.destino[1])).toBe(true);
  });
});
