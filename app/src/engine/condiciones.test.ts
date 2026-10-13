// Tests de las condiciones de rama (T-001-06).
//
// Se prueban con la condición real del episodio, la de la escena de Don Beto,
// además de los casos sueltos: es la única rama del contenido y la más
// delicada del guion.

import { describe, expect, it } from "vitest";

import { evaluarCondicion, type ContextoDeCondicion } from "./condiciones";
import type { ConditionExpression } from "./types";

function contexto(
  ageMode: string,
  sessionVars: Record<string, string | boolean> = {},
): ContextoDeCondicion {
  return { ageMode, sessionVars };
}

describe("evaluarCondicion", () => {
  it("compara el modo de edad, que no es una variable de sesión", () => {
    const condicion: ConditionExpression = { var: "ageMode", eq: "9-12" };

    expect(evaluarCondicion(condicion, contexto("9-12"))).toBe(true);
    expect(evaluarCondicion(condicion, contexto("6-8"))).toBe(false);
  });

  it("compara una variable de sesión por igualdad y por diferencia", () => {
    const esAbrazo: ConditionExpression = { var: "greetBeto", eq: "hug" };
    const noEsAbrazo: ConditionExpression = { var: "greetBeto", neq: "hug" };

    expect(evaluarCondicion(esAbrazo, contexto("6-8", { greetBeto: "hug" }))).toBe(true);
    expect(evaluarCondicion(noEsAbrazo, contexto("6-8", { greetBeto: "hug" }))).toBe(false);
    expect(evaluarCondicion(noEsAbrazo, contexto("6-8", { greetBeto: "wave" }))).toBe(true);
  });

  it("una variable que todavía no existe no es igual a nada y es distinta de todo", () => {
    // «Si el saludo no fue un abrazo» también es cierto cuando aún no hubo
    // saludo: es la lectura natural del guion.
    expect(evaluarCondicion({ var: "greetBeto", eq: "hug" }, contexto("6-8"))).toBe(false);
    expect(evaluarCondicion({ var: "greetBeto", neq: "hug" }, contexto("6-8"))).toBe(true);
  });

  it("compara un booleano de sesión como texto", () => {
    const insistio: ConditionExpression = { var: "insistedLuna", eq: "true" };

    expect(evaluarCondicion(insistio, contexto("6-8", { insistedLuna: true }))).toBe(true);
    expect(evaluarCondicion(insistio, contexto("6-8", { insistedLuna: false }))).toBe(false);
  });

  it("`all` exige todas y `any` basta con una", () => {
    const todas: ConditionExpression = {
      all: [
        { var: "ageMode", eq: "9-12" },
        { var: "greetBeto", neq: "hug" },
      ],
    };
    const alguna: ConditionExpression = {
      any: [
        { var: "ageMode", eq: "9-12" },
        { var: "greetBeto", eq: "hug" },
      ],
    };

    expect(evaluarCondicion(todas, contexto("9-12", { greetBeto: "wave" }))).toBe(true);
    expect(evaluarCondicion(todas, contexto("9-12", { greetBeto: "hug" }))).toBe(false);
    expect(evaluarCondicion(todas, contexto("6-8", { greetBeto: "wave" }))).toBe(false);

    expect(evaluarCondicion(alguna, contexto("6-8", { greetBeto: "hug" }))).toBe(true);
    expect(evaluarCondicion(alguna, contexto("6-8", { greetBeto: "wave" }))).toBe(false);
  });

  it("la rama de Don Beto solo se abre para 9-12 y cuando no hubo abrazo", () => {
    // `s06_b001` del contenido, literal. Es el punto más delicado del guion:
    // la rama verdadera lleva a un adulto que insiste, y esa línea está
    // marcada `[VALIDAR]`.
    const rama: ConditionExpression = {
      all: [
        { var: "ageMode", eq: "9-12" },
        { var: "greetBeto", neq: "hug" },
      ],
    };

    expect(evaluarCondicion(rama, contexto("9-12", { greetBeto: "wave" }))).toBe(true);
    expect(evaluarCondicion(rama, contexto("9-12", { greetBeto: "hug" }))).toBe(false);
    expect(evaluarCondicion(rama, contexto("6-8", { greetBeto: "wave" }))).toBe(false);
    expect(evaluarCondicion(rama, contexto("6-8", { greetBeto: "hug" }))).toBe(false);
  });
});
