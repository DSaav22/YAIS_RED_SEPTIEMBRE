// Tests del esquema y cargador de encuentros (conversaciones sueltas de
// mundo abierto).
//
// Igual que `runtime.test.ts`, este archivo lee la fixture con
// `readFileSync`; el motor de producción (`encuentros.ts`) nunca toca el
// disco. Todo el texto de la fixture es evidentemente falso («Línea de
// prueba N»): no hay contenido infantil real en este directorio.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  encountersContentSchema,
  encuentrosVisiblesPara,
  parseEncuentros,
  validateEncuentros,
  type EncountersContent,
} from "./encuentros";

const currentDir = dirname(fileURLToPath(import.meta.url));
const fixturePath = resolve(currentDir, "__fixtures__/encuentros-de-prueba.json");
const fixtureRaw = readFileSync(fixturePath, "utf8");

describe("validateEncuentros / parseEncuentros", () => {
  it("valida la fixture de prueba sin issues", () => {
    const resultado = parseEncuentros(fixtureRaw);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.contenido.encuentros).toHaveLength(2);
    expect(resultado.warnings).toEqual([]);
  });

  it("devuelve ok:false y no lanza ante JSON corrupto", () => {
    expect(() => parseEncuentros("{ esto no es json")).not.toThrow();
    const resultado = parseEncuentros("{ esto no es json");
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.issues[0]?.message).toMatch(/JSON válido/);
  });

  it("reporta un locId que falta en localization con su ruta", () => {
    const datos = JSON.parse(fixtureRaw) as EncountersContent & {
      encuentros: { lineas: { locId: string }[] }[];
    };
    const primeraLinea = datos.encuentros[0]?.lineas[0];
    if (!primeraLinea) throw new Error("fixture inesperadamente vacía");
    primeraLinea.locId = "ENC_LOCID_QUE_NO_EXISTE";

    const resultado = validateEncuentros(datos);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(
      resultado.issues.some(
        (issue) =>
          issue.path === "encuentros[0].lineas[0].locId" &&
          issue.message.includes("ENC_LOCID_QUE_NO_EXISTE"),
      ),
    ).toBe(true);
  });

  it("avisa (warning) de un locId declarado que nadie usa", () => {
    const datos = JSON.parse(fixtureRaw) as {
      localization: Record<string, Record<string, string>>;
    };
    datos.localization["es-BO"] = {
      ...datos.localization["es-BO"],
      ENC_HUERFANO: "Línea de prueba huérfana",
    };

    const resultado = validateEncuentros(datos);
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(
      resultado.warnings.some((warning) => warning.path === "localization.es-BO.ENC_HUERFANO"),
    ).toBe(true);
  });

  it("rechaza ids de encuentro repetidos", () => {
    const datos = JSON.parse(fixtureRaw) as { encuentros: { id: string }[] };
    const segundo = datos.encuentros[1];
    if (!segundo) throw new Error("fixture inesperadamente vacía");
    segundo.id = datos.encuentros[0]?.id ?? "";

    const resultado = validateEncuentros(datos);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.issues.some((issue) => issue.message.includes("repetido"))).toBe(true);
  });

  it("rechaza ids de línea repetidos dentro de un mismo encuentro", () => {
    const datos = JSON.parse(fixtureRaw) as { encuentros: { lineas: { id: string }[] }[] };
    const lineas = datos.encuentros[0]?.lineas;
    if (!lineas || lineas.length < 2) throw new Error("fixture inesperadamente pequeña");
    const primera = lineas[0];
    const segunda = lineas[1];
    if (!primera || !segunda) throw new Error("fixture inesperadamente pequeña");
    segunda.id = primera.id;

    const resultado = validateEncuentros(datos);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.issues.some((issue) => issue.message.includes("repite el id de línea"))).toBe(
      true,
    );
  });

  it("rechaza un encuentro con más de cuatro líneas (eso es un episodio, no un encuentro)", () => {
    const datos = JSON.parse(fixtureRaw) as {
      encuentros: { lineas: { id: string; speaker: string; locId: string; anim: string }[] }[];
    };
    const encuentro = datos.encuentros[0];
    if (!encuentro) throw new Error("fixture inesperadamente vacía");
    encuentro.lineas = [
      { id: "l001", speaker: "tomi", locId: "ENC_TOMI_MIRADOR_L001", anim: "idle" },
      { id: "l002", speaker: "tomi", locId: "ENC_TOMI_MIRADOR_L001", anim: "idle" },
      { id: "l003", speaker: "tomi", locId: "ENC_TOMI_MIRADOR_L001", anim: "idle" },
      { id: "l004", speaker: "tomi", locId: "ENC_TOMI_MIRADOR_L001", anim: "idle" },
      { id: "l005", speaker: "tomi", locId: "ENC_TOMI_MIRADOR_L001", anim: "idle" },
    ];

    const resultado = validateEncuentros(datos);
    expect(resultado.ok).toBe(false);
  });

  it("rechaza un speaker que no es el castId del encuentro ni 'all'", () => {
    const datos = JSON.parse(fixtureRaw) as { encuentros: { castId: string; lineas: { speaker: string }[] }[] };
    const encuentro = datos.encuentros[0];
    const linea = encuentro?.lineas[0];
    if (!encuentro || !linea) throw new Error("fixture inesperadamente vacía");
    linea.speaker = "beto"; // el encuentro es de "tomi", beto no participa aquí

    const resultado = validateEncuentros(datos);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.issues.some((issue) => issue.path.endsWith(".speaker"))).toBe(true);
  });

  it("rechaza una clave desconocida como 'opciones' en un encuentro (regla dura: sin decisiones)", () => {
    const datos = JSON.parse(fixtureRaw) as Record<string, unknown> & {
      encuentros: Record<string, unknown>[];
    };
    const encuentro = datos.encuentros[0];
    if (!encuentro) throw new Error("fixture inesperadamente vacía");
    encuentro["opciones"] = [{ id: "op1", locId: "X", icon: "y", next: "z" }];

    const resultado = validateEncuentros(datos);
    expect(resultado.ok).toBe(false);
  });

  it("rechaza una clave desconocida como 'setSession' en una línea (regla dura: nada que guarde progreso)", () => {
    const datos = JSON.parse(fixtureRaw) as { encuentros: { lineas: Record<string, unknown>[] }[] };
    const linea = datos.encuentros[0]?.lineas[0];
    if (!linea) throw new Error("fixture inesperadamente vacía");
    linea["setSession"] = { algo: true };

    const resultado = validateEncuentros(datos);
    expect(resultado.ok).toBe(false);
  });

  it("el esquema Zod puro también rechaza claves desconocidas, sin pasar por la integridad referencial", () => {
    const conClaveExtra = {
      id: "enc-x",
      castId: "capi",
      isla: "isla-x",
      anclaje: [0, 0],
      lineas: [{ id: "l1", speaker: "capi", locId: "X", anim: "idle" }],
      puntaje: 10, // safety-ok: es lo que el test prueba que el esquema RECHAZA
    };
    expect(encountersContentSchema.shape.encuentros.element.safeParse(conClaveExtra).success).toBe(
      false,
    );
  });
});

describe("encuentrosVisiblesPara", () => {
  const contenido: EncountersContent = (() => {
    const resultado = parseEncuentros(fixtureRaw);
    if (!resultado.ok) throw new Error("la fixture debería validar para este test");
    return resultado.contenido;
  })();

  it("deja fuera los encuentros que declaran ageModes sin incluir el modo pedido", () => {
    const visiblesPara68 = encuentrosVisiblesPara(contenido, "6-8");
    expect(visiblesPara68.map((encuentro) => encuentro.id)).toEqual(["enc-tomi-mirador"]);

    const visiblesPara912 = encuentrosVisiblesPara(contenido, "9-12");
    expect(visiblesPara912.map((encuentro) => encuentro.id).sort()).toEqual([
      "enc-luna-muelle",
      "enc-tomi-mirador",
    ]);
  });
});
