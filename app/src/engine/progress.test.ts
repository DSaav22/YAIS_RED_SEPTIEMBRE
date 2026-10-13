// Tests de `ProgressStore` (T-001-04, mitad de persistencia).
//
// Ninguno de estos tests toca el almacenamiento real del navegador: usan
// un adaptador falso en memoria que además registra cada llamada, para
// poder afirmar no solo el estado final sino qué operaciones ocurrieron
// (por ejemplo, que `clear()` nunca llama `removeItem` sobre una clave
// ajena).

import { describe, expect, it, vi } from "vitest";

import {
  crearAlmacenamientoEnMemoria,
  crearProgressStore,
  type AdaptadorDeAlmacenamiento,
} from "./progress";

// El store guarda el booleano como el string "true"; se nombra aquí para
// no repetir el literal mágico en la aserción de abajo.
const VALOR_VERDADERO_ESPERADO = "true";

interface LlamadaRegistrada {
  metodo: "getItem" | "setItem" | "removeItem";
  clave: string;
}

interface AdaptadorFalso extends AdaptadorDeAlmacenamiento {
  /** Estado real que "sobrevive" entre llamadas, para inspección directa. */
  almacen: Map<string, string>;
  /** Historial de operaciones, en orden. */
  llamadas: LlamadaRegistrada[];
}

/** Adaptador en memoria que registra cada operación que recibe. */
function crearAdaptadorFalso(valoresIniciales: Record<string, string> = {}): AdaptadorFalso {
  const almacen = new Map(Object.entries(valoresIniciales));
  const llamadas: LlamadaRegistrada[] = [];

  return {
    almacen,
    llamadas,
    getItem(clave) {
      llamadas.push({ metodo: "getItem", clave });
      return almacen.has(clave) ? (almacen.get(clave) ?? null) : null;
    },
    setItem(clave, valor) {
      llamadas.push({ metodo: "setItem", clave });
      almacen.set(clave, valor);
    },
    removeItem(clave) {
      llamadas.push({ metodo: "removeItem", clave });
      almacen.delete(clave);
    },
  };
}

describe("ProgressStore", () => {
  it("leer antes de escribir devuelve false", () => {
    const store = crearProgressStore(crearAdaptadorFalso());

    expect(store.readFlag("ep01.completed")).toBe(false);
  });

  it("escribir true y releer devuelve true", () => {
    const store = crearProgressStore(crearAdaptadorFalso());

    store.writeFlag("ep01.completed", true);

    expect(store.readFlag("ep01.completed")).toBe(true);
  });

  it("tras un recorrido completo simulado, el almacenamiento contiene exactamente la clave de ep01.completed (AC-5)", () => {
    const adaptador = crearAdaptadorFalso();
    const store = crearProgressStore(adaptador);

    // Simula el cierre de un recorrido completo del episodio. Las
    // decisiones del jugador y el resto de flags del JSON
    // (`ep01.started`, `ep01.lastScene`, `island.bridge_main`,
    // `island.bench`, `mascot.star_01`, `ep02.unlocked`) viven solo en
    // `sessionVars`/estado en memoria del runtime y nunca llegan a esta
    // interfaz: el tipo de `writeFlag` no acepta ningún id que no sea
    // "ep01.completed", así que no hay forma de compilar una llamada que
    // persista alguno de ellos aunque el contenido los declare con
    // `persist: true`.
    store.writeFlag("ep01.completed", true);

    expect([...adaptador.almacen.keys()]).toEqual(["yais.ep01.completed"]);
    expect(adaptador.almacen.get("yais.ep01.completed")).toBe(VALOR_VERDADERO_ESPERADO);
  });

  it("un adaptador que lanza en setItem no rompe la experiencia y el store sigue respondiendo", () => {
    const adaptadorQueLanza: AdaptadorDeAlmacenamiento = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError simulado");
      },
      removeItem: () => {},
    };
    const store = crearProgressStore(adaptadorQueLanza);

    expect(() => store.writeFlag("ep01.completed", true)).not.toThrow();
    // El store degrada a memoria y reintenta: la escritura no se pierde.
    expect(store.readFlag("ep01.completed")).toBe(true);
  });

  it("un valor corrupto en el almacenamiento se lee como false", () => {
    const adaptador = crearAdaptadorFalso({
      "yais.ep01.completed": "no-es-un-booleano-valido",
    });
    const store = crearProgressStore(adaptador);

    expect(store.readFlag("ep01.completed")).toBe(false);
  });

  it("clear() no borra claves de almacenamiento que no son suyas", () => {
    const adaptador = crearAdaptadorFalso({
      "yais.ep01.completed": "true",
      "otraApp.configuracion": "algo-que-no-es-nuestro",
    });
    const store = crearProgressStore(adaptador);

    store.clear();

    expect(adaptador.almacen.has("otraApp.configuracion")).toBe(true);
    expect(adaptador.almacen.get("otraApp.configuracion")).toBe("algo-que-no-es-nuestro");
    expect(adaptador.almacen.has("yais.ep01.completed")).toBe(false);
    expect(store.readFlag("ep01.completed")).toBe(false);

    const clavesBorradas = adaptador.llamadas
      .filter((llamada) => llamada.metodo === "removeItem")
      .map((llamada) => llamada.clave);
    expect(clavesBorradas).toEqual(["yais.ep01.completed"]);
  });

  it("ninguna operación del store emite una petición de red (AC-9)", () => {
    const fetchEspiado = vi.fn();
    // El nombre va como string para espiarlo: este test existe para
    // demostrar que el store jamás lo invoca (AC-9), no para llamarlo.
    vi.stubGlobal("fetch", fetchEspiado); // safety-ok: AC-9 — se espía para probar que nunca se llama, no es una petición real

    try {
      const store = crearProgressStore(crearAdaptadorFalso());

      store.readFlag("ep01.completed");
      store.writeFlag("ep01.completed", true);
      store.readFlag("ep01.completed");
      store.clear();

      expect(fetchEspiado).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("el adaptador en memoria por sí solo cumple el ciclo lectura/escritura/borrado", () => {
    const store = crearProgressStore(crearAlmacenamientoEnMemoria());

    expect(store.readFlag("ep01.completed")).toBe(false);
    store.writeFlag("ep01.completed", true);
    expect(store.readFlag("ep01.completed")).toBe(true);
    store.clear();
    expect(store.readFlag("ep01.completed")).toBe(false);
  });
});
