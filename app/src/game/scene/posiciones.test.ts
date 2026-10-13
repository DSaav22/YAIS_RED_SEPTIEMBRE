// Tests de a dónde va cada personaje (T-001-06).
//
// Puro y sin WebGL: lo que se prueba es la decisión —quién se mueve, a dónde
// y cuándo—, no el dibujo.

import { describe, expect, it } from "vitest";

import { destinoDe, ENTRADA, POSICION_BASE, PUNTO_DE_ENCUENTRO } from "./posiciones";

describe("destinoDe", () => {
  it("deja a cada personaje en su sitio cuando el guion no pide desplazarse", () => {
    expect(destinoDe("capi", { tipo: "intencion", intent: "wave" }, true)).toEqual(
      POSICION_BASE.capi,
    );
    expect(destinoDe("capi", { tipo: "escuchar" }, true)).toEqual(POSICION_BASE.capi);
    expect(destinoDe("tomi", { tipo: "reposo" }, false)).toEqual(POSICION_BASE.tomi);
  });

  it("lo lleva al claro cuando la intención del guion es caminar", () => {
    // `run_open_arms` es la entrada de Tomi en s04; `walk_with_player`, la de
    // Capi en s06. Las dos están mapeadas como locomoción.
    expect(destinoDe("tomi", { tipo: "intencion", intent: "run_open_arms" }, true)).toEqual(
      PUNTO_DE_ENCUENTRO,
    );
    expect(destinoDe("capi", { tipo: "intencion", intent: "walk_with_player" }, true)).toEqual(
      PUNTO_DE_ENCUENTRO,
    );
  });

  it("solo se mueve quien tiene el turno", () => {
    expect(destinoDe("capi", { tipo: "intencion", intent: "run_open_arms" }, false)).toEqual(
      POSICION_BASE.capi,
    );
  });

  it("nadie entra ni se para fuera de la isla", () => {
    // La isla llega a 3,13 de radio en su borde; el claro y la entrada tienen
    // que quedar dentro con margen.
    const RADIO_SEGURO = 2.9;
    const puntos = [ENTRADA, PUNTO_DE_ENCUENTRO, ...Object.values(POSICION_BASE)];

    for (const [x, , z] of puntos) {
      expect(Math.hypot(x, z)).toBeLessThan(RADIO_SEGURO);
    }
  });
});
