import { describe, expect, it } from 'vitest';
import {
  RADIANES_POR_PIXEL,
  UMBRAL_DE_ARRASTRE,
  empezarGesto,
  moverGesto,
  terminarGesto,
} from './orbita-con-puntero';

describe('orbita-con-puntero', () => {
  it('un movimiento por debajo del umbral no gira nada y sigue siendo toque al terminar', () => {
    const inicio = empezarGesto(100, 100);
    const { gesto, giro } = moverGesto(inicio, 100 + UMBRAL_DE_ARRASTRE - 1, 100);

    expect(giro).toBe(0);
    expect(terminarGesto(gesto).esToque).toBe(true);
  });

  it('pasado el umbral deja de ser toque aunque el puntero vuelva al punto de partida', () => {
    const inicio = empezarGesto(100, 100);
    const { gesto: trasArrastrar } = moverGesto(inicio, 100 + UMBRAL_DE_ARRASTRE + 5, 100);
    const { gesto: trasVolver } = moverGesto(trasArrastrar, 100, 100);

    expect(terminarGesto(trasVolver).esToque).toBe(false);
  });

  it('arrastrar horizontalmente gira en el sentido correcto, y el doble de píxeles gira el doble', () => {
    const inicio = empezarGesto(0, 0);
    // Primero se cruza el umbral para entrar en modo arrastre...
    const { gesto: enArrastre } = moverGesto(inicio, UMBRAL_DE_ARRASTRE + 1, 0);

    // ...y desde ahí se mide un incremento horizontal limpio de 10px.
    const { giro: giroSimple } = moverGesto(enArrastre, UMBRAL_DE_ARRASTRE + 1 + 10, 0);
    const { giro: giroDoble } = moverGesto(enArrastre, UMBRAL_DE_ARRASTRE + 1 + 20, 0);

    expect(giroSimple).toBeCloseTo(-10 * RADIANES_POR_PIXEL);
    expect(giroDoble).toBeCloseTo(-20 * RADIANES_POR_PIXEL);
    expect(giroDoble).toBeCloseTo(giroSimple * 2);
  });

  it('el movimiento vertical no gira nada', () => {
    const inicio = empezarGesto(0, 0);
    const { gesto: enArrastre } = moverGesto(inicio, UMBRAL_DE_ARRASTRE + 1, 0);
    const { giro } = moverGesto(enArrastre, UMBRAL_DE_ARRASTRE + 1, 500);

    expect(giro).toBeCloseTo(0);
  });

  it('la suma de los giros incrementales equivale al giro total del recorrido', () => {
    let gesto = empezarGesto(0, 0);
    let sumaDeGiros = 0;

    const pasos = [
      [UMBRAL_DE_ARRASTRE + 1, 3],
      [UMBRAL_DE_ARRASTRE + 15, -8],
      [UMBRAL_DE_ARRASTRE + 40, 20],
      [UMBRAL_DE_ARRASTRE + 5, 0],
    ] as const;

    for (const [x, y] of pasos) {
      const resultado = moverGesto(gesto, x, y);
      gesto = resultado.gesto;
      sumaDeGiros += resultado.giro;
    }

    // El gesto empezó en x=0, así que el giro total telescopia hasta la
    // posición final, incluyendo la propia llamada que cruza el umbral.
    const xFinal = pasos.at(-1)?.[0] ?? 0;
    const giroTotalEsperado = -xFinal * RADIANES_POR_PIXEL;

    expect(sumaDeGiros).toBeCloseTo(giroTotalEsperado);
  });
});
