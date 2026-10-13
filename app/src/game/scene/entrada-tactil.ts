// Lo que piden los controles en pantalla, y cuándo vale la pena mostrarlos.
//
// Los controles táctiles viven en el DOM, fuera del lienzo 3D —el envoltorio
// del lienzo va `aria-hidden` y unos botones escondidos de un lector de
// pantalla serían un error—, pero lo que escriben lo lee el bucle de render,
// que está dentro. Esta caja compartida es el puente: se pasa por props y se
// escribe desde los manejadores de evento, nunca durante el render.
//
// Se escribe en un objeto mutable a propósito. Por estado de React, arrastrar
// el pulgar sería un render por cuadro, que es justo lo que PLAN-001 prohíbe
// para la escena.

import { useEffect, useState } from "react";

export interface EntradaTactil {
  /** Dirección cruda del joystick, sin proyectar sobre la cámara. */
  direccion: { readonly x: number; readonly z: number } | null;
  /** -1, 0 o 1: hacia dónde piden girar los botones de cámara. */
  giro: number;
}

/** Una caja vacía: nadie está tocando nada. */
export function entradaTactilVacia(): EntradaTactil {
  return { direccion: null, giro: 0 };
}

/**
 * Cuánto gira la cámara un toque suelto en el botón, en radianes.
 *
 * Los botones giran mientras se mantienen pulsados, pero con teclado un botón
 * no se «mantiene»: se activa. Sin esto, el `aria-label` prometía un control
 * que con Enter no hacía nada. Un octavo de vuelta es suficiente para que se
 * note que pasó algo y poco para no desorientar.
 */
export const GIRO_DE_UN_PASO = Math.PI / 4;

/** Media query de un puntero grueso: dedo en vez de ratón. */
const PUNTERO_GRUESO = "(pointer: coarse)";

/**
 * Ancho por debajo del cual se asume una pantalla de mano aunque el puntero
 * no sea grueso. Cubre el caso de probar en una ventana estrecha y el de una
 * tablet con teclado conectado, donde el puntero deja de ser «coarse» pero
 * las manos siguen siendo lo que hay.
 */
const ANCHO_DE_MANO = 900;

function hayQueMostrarlos(): boolean {
  try {
    return window.matchMedia(PUNTERO_GRUESO).matches || window.innerWidth < ANCHO_DE_MANO;
  } catch {
    return false;
  }
}

/**
 * `true` si conviene dibujar los controles en pantalla. Se recalcula al girar
 * el aparato o al cambiar el tamaño de la ventana: una tablet que pasa a
 * horizontal no puede quedarse sin controles.
 */
export function useControlesEnPantalla(): boolean {
  const [mostrar, setMostrar] = useState(hayQueMostrarlos);

  useEffect(() => {
    function revisar(): void {
      setMostrar(hayQueMostrarlos());
    }
    // jsdom no trae `matchMedia`, y un navegador sin ella tampoco es un
    // aparato táctil: se escucha solo el tamaño, que sí existe siempre.
    let consulta: MediaQueryList | null = null;
    try {
      consulta = window.matchMedia(PUNTERO_GRUESO);
      consulta.addEventListener("change", revisar);
    } catch {
      consulta = null;
    }
    window.addEventListener("resize", revisar);
    return () => {
      consulta?.removeEventListener("change", revisar);
      window.removeEventListener("resize", revisar);
    };
  }, []);

  return mostrar;
}
