// Tests del control del personaje (T-001-06, prototipo).
//
// Las reglas del movimiento se prueban sin WebGL: qué teclas cuentan, hacia
// dónde empujan y hasta dónde se puede llegar.

import { describe, expect, it } from "vitest";

import { dentroDelMundo, direccionDeTecla, direccionDeTeclas, esCaminable } from "./control-del-jugador";

describe("direccionDeTecla", () => {
  it("mueve con W, A, S y D", () => {
    expect(direccionDeTecla("KeyW")).toEqual([0, -1]);
    expect(direccionDeTecla("KeyS")).toEqual([0, 1]);
    expect(direccionDeTecla("KeyA")).toEqual([-1, 0]);
    expect(direccionDeTecla("KeyD")).toEqual([1, 0]);
  });

  it("no toca las flechas ni las teclas del diálogo", () => {
    // Las flechas desplazan la página y mueven la selección de los controles;
    // Tab, Enter y espacio son la ruta accesible. Caminar no puede quitárselas
    // a quien juega sin ratón.
    for (const tecla of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab", "Enter", "Space"]) {
      expect(direccionDeTecla(tecla)).toBeNull();
    }
  });
});

describe("direccionDeTeclas", () => {
  it("sin teclas no pide nada", () => {
    expect(direccionDeTeclas([])).toBeNull();
    expect(direccionDeTeclas(["KeyQ"])).toBeNull();
  });

  it("dos teclas en diagonal no van más rápido que una sola", () => {
    const diagonal = direccionDeTeclas(["KeyW", "KeyD"]);

    expect(diagonal).not.toBeNull();
    expect(Math.hypot(diagonal!.x, diagonal!.z)).toBeCloseTo(1, 5);
  });

  it("dos teclas opuestas se anulan", () => {
    expect(direccionDeTeclas(["KeyA", "KeyD"])).toBeNull();
  });
});

describe("dentroDelMundo", () => {
  it("deja pasar cualquier punto que ya se pueda pisar", () => {
    expect(dentroDelMundo(1, 1)).toEqual({ x: 1, z: 1 });
  });

  it("no deja caminar sobre el agua", () => {
    const fuera = dentroDelMundo(30, -30);

    expect(esCaminable(fuera.x, fuera.z)).toBe(true);
    // Conserva la dirección: acaba en la orilla más cercana a donde apuntó.
    expect(Math.sign(fuera.x)).toBe(1);
    expect(Math.sign(fuera.z)).toBe(-1);
  });
});
