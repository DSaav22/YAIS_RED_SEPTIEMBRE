import { describe, expect, it } from "vitest";

import { RADIO_DEL_JOYSTICK, ZONA_MUERTA, direccionDeArrastre } from "./control-tactil";

const CENTRO = { x: 100, y: 100 };

describe("direccionDeArrastre", () => {
  it("no pide nada dentro de la zona muerta", () => {
    const casiCentro = { x: CENTRO.x + 1, y: CENTRO.y + 1 };
    expect(direccionDeArrastre(CENTRO, casiCentro)).toBeNull();
  });

  it("arrastrar hacia arriba es adelante (0,-1)", () => {
    const arriba = { x: CENTRO.x, y: CENTRO.y - RADIO_DEL_JOYSTICK };
    const direccion = direccionDeArrastre(CENTRO, arriba);
    expect(direccion).not.toBeNull();
    expect(direccion?.x).toBeCloseTo(0);
    expect(direccion?.z).toBeCloseTo(-1);
  });

  it("arrastrar hacia la derecha es (1,0)", () => {
    const derecha = { x: CENTRO.x + RADIO_DEL_JOYSTICK, y: CENTRO.y };
    const direccion = direccionDeArrastre(CENTRO, derecha);
    expect(direccion).not.toBeNull();
    expect(direccion?.x).toBeCloseTo(1);
    expect(direccion?.z).toBeCloseTo(0);
  });

  it("la diagonal no camina más rápido que una sola dirección", () => {
    const diagonal = {
      x: CENTRO.x + RADIO_DEL_JOYSTICK,
      y: CENTRO.y - RADIO_DEL_JOYSTICK,
    };
    const direccion = direccionDeArrastre(CENTRO, diagonal);
    expect(direccion).not.toBeNull();
    const modulo = Math.hypot(direccion?.x ?? 0, direccion?.z ?? 0);
    expect(modulo).toBeCloseTo(1, 5);
  });

  it("se satura en 1 aunque el dedo se arrastre mucho más allá del radio", () => {
    const muyLejos = { x: CENTRO.x + RADIO_DEL_JOYSTICK * 10, y: CENTRO.y };
    const direccion = direccionDeArrastre(CENTRO, muyLejos);
    expect(direccion).not.toBeNull();
    const modulo = Math.hypot(direccion?.x ?? 0, direccion?.z ?? 0);
    expect(modulo).toBeCloseTo(1, 5);
  });

  it("justo en el borde de la zona muerta todavía no pide nada", () => {
    const bordeZonaMuerta = {
      x: CENTRO.x + RADIO_DEL_JOYSTICK * ZONA_MUERTA * 0.9,
      y: CENTRO.y,
    };
    expect(direccionDeArrastre(CENTRO, bordeZonaMuerta)).toBeNull();
  });

  it("respeta un radio distinto al de referencia cuando se pasa explícito", () => {
    const radioChico = 20;
    const punto = { x: CENTRO.x + radioChico, y: CENTRO.y };
    const direccion = direccionDeArrastre(CENTRO, punto, radioChico);
    expect(direccion?.x).toBeCloseTo(1);
    expect(direccion?.z).toBeCloseTo(0);
  });
});
