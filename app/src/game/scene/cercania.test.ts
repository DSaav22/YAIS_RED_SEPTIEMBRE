// Tests de la cercanía a los claros del mundo.
//
// Lo que se prueba es que acercarse ofrezca el episodio de la isla en la que
// se está —no el de otra— y que alejarse retire la oferta: si se quedara
// pegada, explorar acabaría siendo imposible.

import { describe, expect, it } from "vitest";

import { PUNTOS_DE_ENCUENTRO, RADIO_DE_ENCUENTRO, puntoDeEncuentroCercano } from "./cercania";
import { ISLAS_CON_EPISODIO, PUNTO_DE_PARTIDA, esCaminable } from "./mundo";

describe("puntoDeEncuentroCercano", () => {
  it("hay un claro por cada isla con episodio", () => {
    expect(PUNTOS_DE_ENCUENTRO.map((punto) => punto.episodioId)).toEqual(
      ISLAS_CON_EPISODIO.map((isla) => isla.episodioId),
    );
  });

  it("estar en el claro ofrece el episodio de esa isla, no el de otra", () => {
    for (const punto of PUNTOS_DE_ENCUENTRO) {
      const encontrado = puntoDeEncuentroCercano(punto.posicion[0], punto.posicion[1]);
      expect(encontrado?.episodioId).toBe(punto.episodioId);
    }
  });

  it("el juego no empieza encima de un claro: primero se explora", () => {
    // Es la queja concreta que lo motivó: al abrir el juego aparecía ya el
    // cartel de empezar el episodio, sin haber dado un paso.
    const [x, z] = PUNTO_DE_PARTIDA;

    expect(esCaminable(x, z)).toBe(true);
    expect(puntoDeEncuentroCercano(x, z)).toBeNull();
  });

  it("lejos de todo no se ofrece nada: explorar puede no llevar a ninguna parte", () => {
    expect(puntoDeEncuentroCercano(40, 40)).toBeNull();
  });

  it("la oferta se retira al alejarse", () => {
    const punto = PUNTOS_DE_ENCUENTRO[0];
    expect(punto).toBeDefined();
    const [x, z] = punto!.posicion;

    expect(puntoDeEncuentroCercano(x, z + RADIO_DE_ENCUENTRO - 0.1)).not.toBeNull();
    expect(puntoDeEncuentroCercano(x, z + RADIO_DE_ENCUENTRO + 0.1)).toBeNull();
  });

  it("dos claros nunca se pisan: no hay sitio donde el mundo dude", () => {
    for (const a of PUNTOS_DE_ENCUENTRO) {
      for (const b of PUNTOS_DE_ENCUENTRO) {
        if (a.clave === b.clave) continue;
        const separacion = Math.hypot(a.posicion[0] - b.posicion[0], a.posicion[1] - b.posicion[1]);
        expect(separacion).toBeGreaterThan(RADIO_DE_ENCUENTRO * 2);
      }
    }
  });

  it("si dos quedaran a tiro, gana el más cercano", () => {
    const inventados = [
      { clave: "a", episodioId: "epA", posicion: [0, 0] as const },
      { clave: "b", episodioId: "epB", posicion: [1, 0] as const },
    ];

    expect(puntoDeEncuentroCercano(0.9, 0, inventados)?.episodioId).toBe("epB");
    expect(puntoDeEncuentroCercano(0.1, 0, inventados)?.episodioId).toBe("epA");
  });
});
