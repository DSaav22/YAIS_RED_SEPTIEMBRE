// Evaluación de las condiciones de un nodo `branch` (T-001-06).
//
// Módulo puro y sin estado: recibe la expresión del contenido y el contexto
// de la sesión, y responde sí o no. Vive aparte del runtime porque es lo
// único del motor que se puede probar con una tabla de casos, y porque el
// guion va a traer condiciones nuevas con cada episodio.
//
// Qué se puede consultar (y nada más):
//
// - `ageMode`, el modo de edad activo.
// - Las variables de sesión que el contenido declara, que viven solo en
//   memoria y se borran al terminar (Constitución I, AC-5).
//
// Deliberadamente NO se puede consultar el progreso persistido: si una rama
// del guion dependiera de lo que quedó guardado, `ep01.completed` dejaría de
// ser un booleano de progreso y pasaría a ser un perfil.

import type { ConditionExpression } from "./types";

export interface ContextoDeCondicion {
  readonly ageMode: string;
  readonly sessionVars: Readonly<Record<string, string | boolean>>;
}

/** Nombre reservado: no es una variable de sesión, es el modo de edad. */
const VARIABLE_DE_EDAD = "ageMode";

function valorDe(nombre: string, contexto: ContextoDeCondicion): string | undefined {
  if (nombre === VARIABLE_DE_EDAD) return contexto.ageMode;
  const valor = contexto.sessionVars[nombre];
  if (valor === undefined) return undefined;
  // El contenido compara siempre contra cadenas (`eq: "9-12"`, `neq: "hug"`),
  // así que un booleano de sesión se compara como `"true"` o `"false"`.
  return typeof valor === "boolean" ? String(valor) : valor;
}

/**
 * Evalúa una condición del contenido.
 *
 * Una variable que no existe todavía —nadie ha elegido aún— no es igual a
 * nada (`eq` falla) y es distinta de todo (`neq` acierta). Esa asimetría es
 * intencional y es la lectura natural del guion: «si el saludo a Don Beto no
 * fue un abrazo» es cierto también cuando aún no hubo saludo.
 */
export function evaluarCondicion(
  expresion: ConditionExpression,
  contexto: ContextoDeCondicion,
): boolean {
  if ("all" in expresion) {
    return expresion.all.every((parte) => evaluarCondicion(parte, contexto));
  }
  if ("any" in expresion) {
    return expresion.any.some((parte) => evaluarCondicion(parte, contexto));
  }

  const valor = valorDe(expresion.var, contexto);
  if (expresion.eq !== undefined && valor !== expresion.eq) return false;
  if (expresion.neq !== undefined && valor === expresion.neq) return false;
  // Una comparación sin `eq` ni `neq` no dice nada: se considera cierta para
  // no inventarse una semántica que el contenido no declara.
  return true;
}
