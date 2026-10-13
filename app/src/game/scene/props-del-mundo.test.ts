import { describe, expect, it } from "vitest";

import { ISLAS } from "./mundo";
import { ALTURA_DE_BURBUJA, POSICION_DE_BRUJULA, posicionesDeBurbujas } from "./props-del-mundo";

describe("posición de la brújula", () => {
  it("cae dentro del radio caminable de la isla de los acuerdos", () => {
    const isla = ISLAS.find((candidata) => candidata.clave === "isla-acuerdos");
    if (!isla) throw new Error("la isla de los acuerdos desapareció de mundo.ts");

    const [x, , z] = POSICION_DE_BRUJULA.position;
    const distancia = Math.hypot(x - isla.centro[0], z - isla.centro[1]);

    expect(distancia).toBeLessThan(isla.radioCaminable);
  });
});

describe("posiciones de las burbujas de encuentro", () => {
  it("una por cada ancla, a la altura fija sobre el suelo", () => {
    const anclajes = [
      { id: "capi-en-el-faro", anclaje: [1, 2] as const },
      { id: "luna-en-el-banco", anclaje: [-3, 4] as const },
    ];

    const resultado = posicionesDeBurbujas(anclajes);

    expect(resultado).toEqual([
      { clave: "capi-en-el-faro", position: [1, ALTURA_DE_BURBUJA, 2] },
      { clave: "luna-en-el-banco", position: [-3, ALTURA_DE_BURBUJA, 4] },
    ]);
  });

  it("sin anclas no dibuja nada", () => {
    expect(posicionesDeBurbujas([])).toEqual([]);
  });
});
