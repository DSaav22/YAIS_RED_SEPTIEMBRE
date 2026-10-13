// Detección de capacidades del dispositivo (T-001-06).
//
// Una pregunta sobre el navegador y ninguna sobre quien juega: si hay WebGL.
// La respuesta no se guarda ni sale del dispositivo (AC-9).
//
// Se responden ANTES de importar Three: `EscenaDelEpisodio` solo carga el
// módulo de la escena cuando hay WebGL, así que un equipo sin aceleración no
// descarga el motor 3D ni un byte de GLB. La experiencia sigue siendo la 2D
// completa (AC-8).

/**
 * `true` si el navegador puede crear un contexto WebGL. Se comprueba creando
 * uno de verdad —no mirando `window.WebGLRenderingContext`—, porque un equipo
 * con la aceleración desactivada expone la clase y falla al crear el
 * contexto. El lienzo de prueba se descarta enseguida.
 */
export function soportaWebGL(): boolean {
  try {
    const lienzo = document.createElement("canvas");
    const contexto = lienzo.getContext("webgl2") ?? lienzo.getContext("webgl");
    return contexto !== null;
  } catch {
    return false;
  }
}

// La preferencia de movimiento no se lee aquí: cambia durante la sesión, así
// que vive en `useMenosMovimiento`, que se suscribe a ella (AC-7).
