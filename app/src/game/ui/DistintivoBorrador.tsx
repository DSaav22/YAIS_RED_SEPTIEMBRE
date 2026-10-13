// Distintivo de contenido no validado (AC-10, Constitución IV y IX).
//
// APAGADO EL 2026-09-18 POR DECISIÓN DE PRODUCTO, y este archivo existe
// entero para que volver a encenderlo sea cambiar una línea.
//
// Por qué estaba: mientras el contenido no estuviera aprobado, nadie podía
// demostrar el prototipo como si lo estuviera. Esa parte ya se cumplió —
// Arianna aprobó los guiones de los episodios 1 y 2 y los encuentros—, así
// que el motivo original de AC-10 dejó de aplicar.
//
// Lo que NO se ha cumplido, y por eso esto queda escrito aquí y no borrado:
// nada de este juego se ha probado con niñas y niños, ni en un aula, ni en
// una tablet o un celular reales. La Constitución IX pide decir eso cuando
// es cierto, y sigue siéndolo. Apagar el distintivo no cambia el hecho; solo
// deja de mostrarlo en pantalla.
//
// Cuando haya que volver a encenderlo —antes de enseñar contenido nuevo sin
// aprobar, o si alguien decide que la prueba con niños debe declararse en
// pantalla— basta con poner esta constante en `true`.

import { TEXTOS_UI } from "./textos-ui";

/**
 * Si el distintivo se dibuja. A `false` desde el 2026-09-18, a petición de
 * quien dirige el producto y con el guion ya aprobado.
 */
const SE_MUESTRA_EL_DISTINTIVO = false;

export function DistintivoBorrador() {
  if (!SE_MUESTRA_EL_DISTINTIVO) return null;
  return <p className="distintivo-borrador">{TEXTOS_UI.distintivoBorrador}</p>;
}
