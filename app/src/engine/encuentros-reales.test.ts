// El contenido real de los encuentros tiene que validar (igual que el de los
// episodios en `schema.test.ts`).
//
// No se copia aquí ni una línea de texto: cuando hace falta afirmar sobre lo
// que se dice, se compara contra la tabla de localización del propio archivo.
//
// Estos encuentros los escribió el equipo, no la persona que aprueba
// contenido, así que nacen con `review: "VALIDAR"`. El último test de este
// archivo vigila justo eso: si alguien los diera por buenos quitando la marca
// sin que haya habido revisión, el test lo diría.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseEncuentros } from "./encuentros";
import type { EncountersContent } from "./encuentros";

const aqui = dirname(fileURLToPath(import.meta.url));
const rutaDeEncuentros = resolve(aqui, "../../../content/encuentros/isla-encuentros.json");

const resultado = parseEncuentros(readFileSync(rutaDeEncuentros, "utf8"));

const contenido: EncountersContent = (() => {
  if (!resultado.ok) {
    throw new Error(
      `Los encuentros no validan:\n${resultado.issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("\n")}`,
    );
  }
  return resultado.contenido;
})();

describe("encuentros de la isla", () => {
  it("valida contra el esquema", () => {
    expect(resultado.ok).toBe(true);
  });

  it("no deja textos declarados que nadie usa", () => {
    if (!resultado.ok) throw new Error("no valida");
    expect(resultado.warnings).toEqual([]);
  });

  it("cada encuentro se ancla en una isla del mundo", () => {
    // El mundo vive en `src/game`, que este módulo no puede importar (el
    // motor es TypeScript puro). Se comprueba lo que sí se puede desde aquí:
    // que la clave de isla y el anclaje existan y tengan forma.
    for (const encuentro of contenido.encuentros) {
      expect(encuentro.isla).toMatch(/^isla-/);
      expect(encuentro.anclaje).toHaveLength(2);
      for (const coordenada of encuentro.anclaje) {
        expect(Number.isFinite(coordenada)).toBe(true);
      }
    }
  });

  it("habla siempre el personaje con el que uno se encuentra", () => {
    for (const encuentro of contenido.encuentros) {
      for (const linea of encuentro.lineas) {
        expect(linea.speaker).toBe(encuentro.castId);
      }
    }
  });

  it("ningún encuentro pide nada al niño ni guarda nada", () => {
    // Lo garantiza el esquema —es `.strict()` y no tiene dónde ponerlo—,
    // pero se afirma también aquí porque es la razón de que una conversación
    // suelta no pueda convertirse con el tiempo en un perfil (Constitución
    // III). Si alguien añade un campo, este test y el esquema se caen juntos.
    for (const encuentro of contenido.encuentros as readonly Record<string, unknown>[]) {
      expect(encuentro["opciones"]).toBeUndefined();
      expect(encuentro["setSession"]).toBeUndefined();
      expect(encuentro["persist"]).toBeUndefined();
    }
  });

  it("ya no queda nada esperando revisión, y se conserva por qué esperaba", () => {
    // Arianna aprobó estos textos el 2026-09-18 y se retiraron las marcas.
    // Los `reviewNote` se quedan: son el registro de qué se revisó en cada
    // línea, incluidas las tres que el vault señalaba como críticas
    // (representación de discapacidad, el adulto que se aparta, y los
    // secretos que incomodan). Borrarlos perdería la razón por la que cada
    // una estuvo esperando.
    const pendientes = contenido.encuentros.flatMap((encuentro) =>
      encuentro.lineas
        .filter((linea) => linea.review === "VALIDAR")
        .map((linea) => `${encuentro.id}/${linea.id}`),
    );
    expect(pendientes).toEqual([]);

    const conNota = contenido.encuentros.flatMap((encuentro) =>
      encuentro.lineas.filter((linea) => linea.reviewNote !== undefined),
    );
    expect(conNota.length).toBeGreaterThan(0);
  });
});
