// ¿El sistema pide menos movimiento? (T-001-06, AC-7).
//
// Se suscribe al cambio en vez de leerlo una sola vez al montar. La revisión
// de a11y-perf-reviewer lo pidió con un caso concreto: si alguien activa la
// preferencia a mitad de una demo —porque a un niño le marea el movimiento—,
// tener que recargar la página para que se aplique es exactamente el momento
// en que no se puede recargar.
//
// `useSyncExternalStore` es la forma que React da para leer algo de fuera sin
// desincronizarse: el valor se consulta en cada render y el navegador avisa
// de los cambios.

import { useSyncExternalStore } from "react";

const CONSULTA = "(prefers-reduced-motion: reduce)";

function suscribir(alCambiar: () => void): () => void {
  try {
    const consulta = window.matchMedia(CONSULTA);
    consulta.addEventListener("change", alCambiar);
    return () => consulta.removeEventListener("change", alCambiar);
  } catch {
    return () => undefined;
  }
}

function leer(): boolean {
  try {
    return window.matchMedia(CONSULTA).matches;
  } catch {
    // Un navegador sin `matchMedia` es tan viejo que la escena 3D no es su
    // problema principal: se asume la opción prudente.
    return true;
  }
}

export function useMenosMovimiento(): boolean {
  return useSyncExternalStore(suscribir, leer, () => true);
}
