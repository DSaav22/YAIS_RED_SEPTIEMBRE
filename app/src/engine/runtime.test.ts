// Tests del runtime de navegación (T-001-04, mitad "motor puro").
//
// Como en `schema.test.ts`, este archivo vive fuera de `tsconfig.engine.json`
// y lee el episodio real con `readFileSync`; el motor de producción nunca
// toca el disco. Ningún test escribe en disco.
//
// Tampoco se copia texto narrativo del contenido: cuando hace falta afirmar
// sobre un texto, se compara contra la tabla de localización del propio
// episodio (`localization["es-BO"][locId]`), nunca contra una línea escrita a
// mano aquí.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import {
  crearProgressStore,
  type AdaptadorDeAlmacenamiento,
  type ProgressStore,
} from "./progress";
import { crearRuntime, type Runtime, type RuntimeDiagnostic, type RuntimeView } from "./runtime";
import { parseEpisodeContent, validateEpisodeContent } from "./schema";
import type { AgeMode, EpisodeContent, LocId } from "./types";

const currentDir = dirname(fileURLToPath(import.meta.url));
const realEpisodePath = resolve(currentDir, "../../../content/episodes/ep01-saludo.json");

/** El episodio real, validado una vez para todos los tests de este archivo. */
const episodio: EpisodeContent = (() => {
  const result = parseEpisodeContent(readFileSync(realEpisodePath, "utf8"));
  if (!result.ok) {
    throw new Error(
      `El episodio real no valida; los tests del runtime no pueden correr:\n${result.issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("\n")}`,
    );
  }
  return result.episode;
})();

const textos: Readonly<Record<LocId, string>> = episodio.localization[episodio.defaultLocale] ?? {};

/**
 * El mismo episodio, pero con `s06_n003` marcado `review: "VALIDAR"`.
 *
 * El guion real ya está aprobado y no le queda ningún marcador, así que la
 * puerta de `blockProductionIfPending` no se puede probar contra él sin que
 * el test dependa de que alguien no haya aprobado algo todavía. Se prueba
 * contra este episodio de mentira: la puerta tiene que seguir funcionando
 * para el contenido que se escriba mañana, que sí nacerá pendiente.
 */
const episodioConNodoPendiente: EpisodeContent = (() => {
  const crudo: unknown = JSON.parse(readFileSync(realEpisodePath, "utf8"));
  const escenas = (crudo as { scenes: { id: string; nodes: { id: string }[] }[] }).scenes;
  const escena = escenas.find((candidata) => candidata.id === "s06_adultos");
  const nodo = escena?.nodes.find((candidato) => candidato.id === "s06_n003");
  if (!nodo) throw new Error("s06_n003 ya no existe: este test necesita otro nodo.");
  Object.assign(nodo, { review: "VALIDAR" });

  const result = parseEpisodeContent(JSON.stringify(crudo));
  if (!result.ok) throw new Error("El episodio de prueba con nodo pendiente no valida.");
  return result.episode;
})();

/* ------------------------------------------------------------------------ */
/* Utilidades de prueba                                                      */
/* ------------------------------------------------------------------------ */

interface AlmacenamientoFalso extends AdaptadorDeAlmacenamiento {
  /** Lo que realmente quedó guardado, para inspeccionarlo clave por clave. */
  readonly almacen: Map<string, string>;
}

function crearAlmacenamientoFalso(): AlmacenamientoFalso {
  const almacen = new Map<string, string>();
  return {
    almacen,
    getItem: (clave) => (almacen.has(clave) ? (almacen.get(clave) ?? null) : null),
    setItem: (clave, valor) => {
      almacen.set(clave, valor);
    },
    removeItem: (clave) => {
      almacen.delete(clave);
    },
  };
}

interface EntornoDePrueba {
  readonly runtime: Runtime;
  readonly almacenamiento: AlmacenamientoFalso;
  readonly progress: ProgressStore;
  readonly diagnosticos: RuntimeDiagnostic[];
}

interface OpcionesDePrueba {
  readonly ageMode?: AgeMode;
  readonly startSceneId?: string;
  readonly episode?: EpisodeContent;
  readonly permitirContenidoPendiente?: boolean;
}

function montar(opciones: OpcionesDePrueba = {}): EntornoDePrueba {
  const almacenamiento = crearAlmacenamientoFalso();
  const progress = crearProgressStore(almacenamiento);
  const diagnosticos: RuntimeDiagnostic[] = [];
  const runtime = crearRuntime(opciones.episode ?? episodio, {
    ageMode: opciones.ageMode ?? "6-8",
    progress,
    startSceneId: opciones.startSceneId,
    permitirContenidoPendiente: opciones.permitirContenidoPendiente,
    onDiagnostic: (diagnostic) => diagnosticos.push(diagnostic),
  });
  return { runtime, almacenamiento, progress, diagnosticos };
}

/** Estrecha la vista a un tipo concreto y falla con un mensaje útil si no lo es. */
function esperarVista<K extends RuntimeView["kind"]>(
  vista: RuntimeView,
  kind: K,
): Extract<RuntimeView, { kind: K }> {
  expect(vista.kind).toBe(kind);
  return vista as Extract<RuntimeView, { kind: K }>;
}

/** Avanza líneas hasta la próxima decisión, fin o nodo sin interfaz. */
function avanzarHastaParar(runtime: Runtime, maxPasos = 50): void {
  for (let paso = 0; paso < maxPasos && runtime.vista().kind === "line"; paso += 1) {
    runtime.avanzar();
  }
}

/**
 * Recorre el episodio completo de forma determinista: avanza las líneas,
 * cruza con la salida de desarrollo los nodos que todavía no tienen interfaz
 * y, en cada decisión, elige la primera opción que lleve a un nodo no
 * visitado (así el recorrido no se queda dando vueltas en las decisiones que
 * permiten volver atrás, que son precisamente las de reintento).
 */
function recorrerEpisodioCompleto(runtime: Runtime, maxPasos = 300): readonly string[] {
  const visitados = new Set<string>();
  const recorrido: string[] = [];

  for (let paso = 0; paso < maxPasos; paso += 1) {
    const vista = runtime.vista();
    const idActual = runtime.estado().nodeId;
    visitados.add(idActual);
    recorrido.push(idActual);

    if (vista.kind === "end") return recorrido;
    if (vista.kind === "error") throw new Error(`Recorrido roto en ${idActual}: ${vista.diagnostic.message}`);
    if (vista.kind === "line") {
      runtime.avanzar();
      continue;
    }
    if (vista.kind === "minigame") {
      runtime.terminarMinijuego();
      continue;
    }
    if (vista.kind === "reward") {
      runtime.terminarRecompensa();
      continue;
    }
    if (vista.kind === "unimplemented") {
      runtime.saltarNodoNoImplementado();
      continue;
    }

    const noVisitada = vista.options.find((entrada) => !visitados.has(entrada.option.next));
    const elegida = noVisitada ?? vista.options[0];
    if (!elegida) throw new Error(`La decisión ${idActual} no dejó ninguna opción visible.`);
    runtime.elegir(elegida.option.id);
  }

  throw new Error(`El recorrido no llegó al final en ${maxPasos} pasos.`);
}

/* ------------------------------------------------------------------------ */
/* Arranque                                                                  */
/* ------------------------------------------------------------------------ */

describe("crearRuntime — arranque", () => {
  it("empieza en la escena y el nodo de entrada del episodio", () => {
    const { runtime } = montar();

    expect(runtime.estado().sceneId).toBe(episodio.entryScene);
    expect(runtime.estado().nodeId).toBe("s01_n001");
    expect(runtime.estado().completed).toBe(false);
    expect(runtime.estado().sessionVars).toEqual({});
  });

  it("presenta la primera línea con su texto y el nombre de quien habla ya resueltos", () => {
    const { runtime } = montar();
    const vista = esperarVista(runtime.vista(), "line");

    expect(vista.speaker).toBe("capi");
    expect(vista.text).toBe(textos[vista.node.locId]);
    expect(vista.speakerName).toBe(textos[episodio.cast.capi.displayNameLocId]);
  });

  it("puede arrancar en otra escena (selector de escena de desarrollo)", () => {
    const { runtime } = montar({ startSceneId: "s03_saludo_capi" });

    expect(runtime.estado().sceneId).toBe("s03_saludo_capi");
    expect(runtime.estado().nodeId).toBe("s03_n001");
  });

  it("avisa y usa la escena de entrada si le piden una escena que no existe", () => {
    const { runtime, diagnosticos } = montar({ startSceneId: "escena_inventada" });

    expect(runtime.estado().sceneId).toBe(episodio.entryScene);
    expect(diagnosticos.some((d) => d.code === "navegacion-rota")).toBe(true);
  });
});

/* ------------------------------------------------------------------------ */
/* Navegación                                                                */
/* ------------------------------------------------------------------------ */

describe("crearRuntime — navegación", () => {
  it("avanzar sigue el `next` de la línea", () => {
    const { runtime } = montar();

    expect(runtime.avanzar()).toBe(true);
    expect(runtime.estado().nodeId).toBe("s01_n002");
  });

  it("nunca presenta un `sceneChange`: entra solo a la escena siguiente", () => {
    const { runtime } = montar({ startSceneId: "s03_saludo_capi" });

    avanzarHastaParar(runtime);
    runtime.elegir("wave");
    avanzarHastaParar(runtime);
    // s03_c002 cierra la escena del saludo de Capi.
    runtime.elegir("keep");

    expect(runtime.estado().sceneId).toBe("s04_tomi");
    expect(runtime.estado().nodeId).toBe("s04_n001");
    expect(runtime.vista().kind).toBe("line");
  });

  it("la decisión conserva la última línea mostrada de su escena", () => {
    const { runtime } = montar({ startSceneId: "s03_saludo_capi" });

    avanzarHastaParar(runtime);
    const decision = esperarVista(runtime.vista(), "choice");

    // `s03_n002` es la línea que el guion pone justo antes de la decisión.
    expect(decision.precedingLine?.node.id).toBe("s03_n002");
    expect(decision.precedingLine?.text).toBe(textos["EP01_S03_L002"]);
  });

  it("al volver a una decisión por reintento recupera su propia pregunta", () => {
    const { runtime } = montar({ startSceneId: "s03_saludo_capi" });
    avanzarHastaParar(runtime);
    runtime.elegir("wave");
    avanzarHastaParar(runtime);

    // En `s03_c002` la pregunta es la suya (`s03_n004`), no la del saludo.
    expect(esperarVista(runtime.vista(), "choice").precedingLine?.node.id).toBe("s03_n004");

    runtime.elegir("change");

    // De vuelta en `s03_c001`: la pregunta vuelve a ser la del saludo, y no
    // la última línea leída, que era la de la otra decisión.
    const saludo = esperarVista(runtime.vista(), "choice");
    expect(saludo.node.id).toBe("s03_c001");
    expect(saludo.precedingLine?.node.id).toBe("s03_n002");
  });

  it("no arrastra la pregunta de una escena a la siguiente", () => {
    const { runtime } = montar({ startSceneId: "s03_saludo_capi" });
    avanzarHastaParar(runtime);
    runtime.elegir("wave");
    avanzarHastaParar(runtime);
    runtime.elegir("keep");

    // Ya en s04: se entra por su primera línea, así que la pregunta previa
    // de s03 no puede seguir viva.
    expect(runtime.estado().sceneId).toBe("s04_tomi");
    runtime.irAEscena("s05_luna");
    const decisionDeOtraEscena = (() => {
      avanzarHastaParar(runtime);
      return esperarVista(runtime.vista(), "choice");
    })();
    expect(decisionDeOtraEscena.precedingLine?.scene.id).toBe("s05_luna");
  });

  it("no entra por una rama a contenido que espera aprobación", () => {
    const { runtime, diagnosticos } = montar({
      ageMode: "9-12",
      startSceneId: "s06_adultos",
      episode: episodioConNodoPendiente,
    });

    avanzarHastaParar(runtime);
    // `s06_c001`: se saluda sin abrazo, que es la condición de la rama.
    runtime.elegir("wave");
    runtime.avanzar();

    // La condición se cumple, pero el nodo destino está marcado `VALIDAR` y
    // el contenido declara `blockProductionIfPending`. El episodio sigue por
    // el camino por defecto, que es el que no insiste.
    expect(runtime.estado().nodeId).toBe("s06_n004");
    expect(diagnosticos.some((d) => d.code === "rama-pendiente-de-validar")).toBe(true);
  });

  it("con la aprobación explícita sí entra, y solo entonces", () => {
    // El interruptor existe para poder revisar esa escena con quien tiene que
    // aprobarla. Por defecto está apagado.
    const { runtime, diagnosticos } = montar({
      ageMode: "9-12",
      startSceneId: "s06_adultos",
      episode: episodioConNodoPendiente,
      permitirContenidoPendiente: true,
    });

    avanzarHastaParar(runtime);
    runtime.elegir("wave");
    runtime.avanzar();

    expect(runtime.vista().kind).toBe("line");
    expect(runtime.estado().nodeId).toBe("s06_n003");
    expect(diagnosticos.some((d) => d.code === "rama-resuelta")).toBe(true);
  });

  it("aprobado el guion, la rama se recorre sin interruptor ninguno", () => {
    // Es el cambio real: el episodio ya no tiene ningún nodo esperando, así
    // que la rama de 9-12 se juega tal como está escrita.
    const { runtime, diagnosticos } = montar({ ageMode: "9-12", startSceneId: "s06_adultos" });

    avanzarHastaParar(runtime);
    runtime.elegir("wave");
    runtime.avanzar();

    expect(runtime.estado().nodeId).toBe("s06_n003");
    expect(diagnosticos.some((d) => d.code === "rama-pendiente-de-validar")).toBe(false);
  });

  it("en 6-8 la misma rama cae por el camino por defecto", () => {
    const { runtime } = montar({ ageMode: "6-8", startSceneId: "s06_adultos" });

    avanzarHastaParar(runtime);
    runtime.elegir("wave");
    runtime.avanzar();

    // `s06_n003` está marcado solo para 9-12; en 6-8 el episodio sigue por
    // `s06_n004`, sin pasar por la insistencia.
    expect(runtime.estado().nodeId).toBe("s06_n004");
  });

  it("presenta el minijuego con la configuración que declara el contenido", () => {
    const { runtime } = montar({ startSceneId: "s02_brujula" });

    avanzarHastaParar(runtime);
    const vista = esperarVista(runtime.vista(), "minigame");

    expect(vista.node.id).toBe("s02_m001");
    expect(vista.node.minigameId).toBe("body_compass_practice");
    // El motor no sabe jugar: entrega la configuración y espera.
    if (vista.node.minigameId !== "body_compass_practice") return;
    expect(vista.node.config.cards).toHaveLength(3);
    expect(vista.node.config.anyAnswerValid).toBe(true);
  });

  it("al terminar un minijuego continúa por donde dice el contenido", () => {
    const { runtime } = montar({ startSceneId: "s02_brujula" });

    avanzarHastaParar(runtime);
    expect(runtime.terminarMinijuego()).toBe(true);
    expect(runtime.estado().nodeId).toBe("s02_n008");
  });

  it("un minijuego puede terminar en el nodo que su propia configuración señala", () => {
    // El botón de parar del juego de chocar las manos lleva a `s04_r003`, y
    // ese destino lo declara el contenido, no la interfaz.
    const { runtime } = montar({ startSceneId: "s04_tomi" });
    avanzarHastaParar(runtime);
    runtime.elegir("ask_first");
    avanzarHastaParar(runtime);
    runtime.elegir("wave");
    avanzarHastaParar(runtime);
    runtime.elegir("yes");

    expect(runtime.vista().kind).toBe("minigame");
    expect(runtime.terminarMinijuego("s04_r003")).toBe(true);
    expect(runtime.estado().nodeId).toBe("s04_r003");
  });

  it("la recompensa es cosmética: no persiste ninguno de sus flags", () => {
    const { runtime, almacenamiento, diagnosticos } = montar({
      startSceneId: "s07_reconstruccion",
    });

    avanzarHastaParar(runtime);
    runtime.terminarMinijuego();
    avanzarHastaParar(runtime);
    const recompensa = esperarVista(runtime.vista(), "reward");

    expect(recompensa.node.conditionalOnPerformance).toBe(false);
    expect(almacenamiento.almacen.size).toBe(0);
    expect(diagnosticos.some((d) => d.code === "flag-ignorado")).toBe(true);
    expect(runtime.terminarRecompensa()).toBe(true);
    expect(runtime.estado().nodeId).toBe("s07_n005");
  });

  it("el selector de escena de desarrollo cambia de escena y rechaza una inexistente", () => {
    const { runtime } = montar();

    expect(runtime.irAEscena("s05_luna")).toBe(true);
    expect(runtime.estado().nodeId).toBe("s05_n001");
    expect(runtime.irAEscena("s99_inexistente")).toBe(false);
    expect(runtime.estado().sceneId).toBe("s05_luna");
  });

  it("notifica cada transición a quien se suscribe, y deja de hacerlo al cancelar", () => {
    const { runtime } = montar();
    const escucha = vi.fn();

    const cancelar = runtime.suscribir(escucha);
    runtime.avanzar();
    expect(escucha).toHaveBeenCalledTimes(1);

    cancelar();
    runtime.avanzar();
    expect(escucha).toHaveBeenCalledTimes(1);
  });
});

/* ------------------------------------------------------------------------ */
/* Modo de edad (AC-3)                                                       */
/* ------------------------------------------------------------------------ */

describe("crearRuntime — modo de edad", () => {
  it("el saludo de Capi ofrece una opción más en 9-12 que en 6-8", () => {
    const menores = montar({ ageMode: "6-8", startSceneId: "s03_saludo_capi" });
    const mayores = montar({ ageMode: "9-12", startSceneId: "s03_saludo_capi" });
    avanzarHastaParar(menores.runtime);
    avanzarHastaParar(mayores.runtime);

    const decisionMenores = esperarVista(menores.runtime.vista(), "choice");
    const decisionMayores = esperarVista(mayores.runtime.vista(), "choice");
    const idsMenores = decisionMenores.options.map((entrada) => entrada.option.id);
    const idsMayores = decisionMayores.options.map((entrada) => entrada.option.id);

    expect(idsMenores).not.toContain("fist_bump");
    expect(idsMayores).toContain("fist_bump");
    expect(idsMayores.filter((id) => id !== "fist_bump")).toEqual(idsMenores);
  });

  it("elegir una opción que el modo de edad no muestra no cambia el estado", () => {
    const { runtime, diagnosticos } = montar({ ageMode: "6-8", startSceneId: "s03_saludo_capi" });
    avanzarHastaParar(runtime);
    const antes = runtime.estado();

    expect(runtime.elegir("fist_bump")).toBe(false);
    expect(runtime.estado()).toBe(antes);
    expect(diagnosticos.some((d) => d.code === "opcion-invalida")).toBe(true);
  });

  it("recorre el saludo de Capi de principio a fin en los dos modos de edad", () => {
    for (const ageMode of ["6-8", "9-12"] as const) {
      const { runtime } = montar({ ageMode, startSceneId: "s03_saludo_capi" });

      avanzarHastaParar(runtime);
      const decision = esperarVista(runtime.vista(), "choice");
      expect(decision.node.id).toBe("s03_c001");

      expect(runtime.elegir("wave")).toBe(true);
      expect(runtime.estado().sessionVars["greetCapi"]).toBe("wave");

      avanzarHastaParar(runtime);
      const confirmacion = esperarVista(runtime.vista(), "choice");
      expect(confirmacion.node.id).toBe("s03_c002");

      expect(runtime.elegir("keep")).toBe(true);
      expect(runtime.estado().sceneId).toBe("s04_tomi");
    }
  });
});

/* ------------------------------------------------------------------------ */
/* Reintento (AC-4, Constitución V)                                          */
/* ------------------------------------------------------------------------ */

describe("crearRuntime — reintento", () => {
  it("permite cambiar de saludo cuantas veces quiera sin acumular estado", () => {
    const { runtime } = montar({ startSceneId: "s03_saludo_capi" });
    avanzarHastaParar(runtime);

    const saludos = ["wave", "hug", "distance", "high_five", "not_today"] as const;
    for (const saludo of saludos) {
      expect(runtime.elegir(saludo)).toBe(true);
      avanzarHastaParar(runtime);
      expect(runtime.estado().nodeId).toBe("s03_c002");
      expect(runtime.elegir("change")).toBe(true);
      // Volver atrás deja exactamente la misma decisión, sin marcas de intento.
      expect(runtime.estado().nodeId).toBe("s03_c001");
    }

    const decision = esperarVista(runtime.vista(), "choice");
    expect(decision.options).toHaveLength(5);
    // Lo único que queda de las vueltas anteriores es el último saludo elegido.
    expect(runtime.estado().sessionVars).toEqual({ greetCapi: "none" });
  });

  it("reiniciar vuelve al principio con la sesión vacía", () => {
    const { runtime } = montar({ startSceneId: "s03_saludo_capi" });
    avanzarHastaParar(runtime);
    runtime.elegir("hug");

    runtime.reiniciar();

    expect(runtime.estado().nodeId).toBe("s03_n001");
    expect(runtime.estado().sessionVars).toEqual({});
    expect(runtime.estado().completed).toBe(false);
  });
});

/* ------------------------------------------------------------------------ */
/* Elecciones en memoria y persistencia (AC-5, AC-9, Constitución I)          */
/* ------------------------------------------------------------------------ */

describe("crearRuntime — elecciones y persistencia", () => {
  it("guarda la elección en la sesión, no en el almacenamiento", () => {
    const { runtime, almacenamiento } = montar({ startSceneId: "s03_saludo_capi" });
    avanzarHastaParar(runtime);

    runtime.elegir("hug");

    expect(runtime.estado().sessionVars["greetCapi"]).toBe("hug");
    expect(almacenamiento.almacen.size).toBe(0);
  });

  it("la instantánea de `sessionVars` no se puede modificar desde fuera", () => {
    const { runtime } = montar({ startSceneId: "s03_saludo_capi" });
    avanzarHastaParar(runtime);
    runtime.elegir("wave");

    const sessionVars = runtime.estado().sessionVars as Record<string, string | boolean>;
    expect(() => {
      sessionVars["greetCapi"] = "hug";
    }).toThrow();
    expect(runtime.estado().sessionVars["greetCapi"]).toBe("wave");
  });

  it("ignora los flags de progreso que el contenido declara fuera de la allowlist", () => {
    const { runtime, almacenamiento, diagnosticos } = montar();

    // `s01_llegada.onEnter` pide `ep01.started` y guardar la última escena.
    expect(almacenamiento.almacen.size).toBe(0);
    expect(diagnosticos.filter((d) => d.code === "flag-ignorado")).toHaveLength(1);
    expect(diagnosticos.some((d) => d.code === "progreso-ignorado")).toBe(true);
    expect(runtime.estado().sceneId).toBe("s01_llegada");
  });

  it("al terminar el episodio persiste solo `ep01.completed`", () => {
    const { runtime, almacenamiento, progress, diagnosticos } = montar();

    const recorrido = recorrerEpisodioCompleto(runtime);
    const fin = esperarVista(runtime.vista(), "end");

    expect(fin.node.id).toBe("s07_end");
    expect(runtime.estado().completed).toBe(true);
    expect(recorrido).toContain("s03_c001");
    expect(progress.readFlag("ep01.completed")).toBe(true);
    expect([...almacenamiento.almacen.keys()]).toEqual(["yais.ep01.completed"]);
    // `ep02.unlocked` también viene con persist:true en el contenido.
    expect(diagnosticos.some((d) => d.code === "flag-ignorado" && d.message.includes("ep02.unlocked"))).toBe(true);
  });

  it("el almacenamiento no contiene ninguna elección ni rastro del recorrido", () => {
    const { runtime, almacenamiento } = montar();

    recorrerEpisodioCompleto(runtime);

    const idsDeSesion = episodio.sessionVars.map((sessionVar) => sessionVar.id);
    const guardado = [...almacenamiento.almacen.entries()].map(([clave, valor]) => `${clave}=${valor}`);
    expect(guardado).toEqual(["yais.ep01.completed=true"]);
    for (const idDeSesion of idsDeSesion) {
      expect(guardado.some((entrada) => entrada.includes(idDeSesion))).toBe(false);
    }
    // Tampoco queda el valor de un saludo ni un identificador de escena.
    for (const rastro of ["wave", "hug", "fist_bump", "distance", "s03_saludo_capi", "lastScene"]) {
      expect(guardado.some((entrada) => entrada.includes(rastro))).toBe(false);
    }
  });

  it("`clearSessionVars` del nodo final borra las elecciones de la sesión", () => {
    const { runtime } = montar();

    recorrerEpisodioCompleto(runtime);

    expect(runtime.estado().sessionVars).toEqual({});
  });
});

/* ------------------------------------------------------------------------ */
/* Llamadas fuera de lugar y contenido roto (AC-1)                           */
/* ------------------------------------------------------------------------ */

describe("crearRuntime — robustez", () => {
  it("elegir sobre una línea no hace nada y deja un diagnóstico", () => {
    const { runtime, diagnosticos } = montar();
    const antes = runtime.estado();

    expect(runtime.elegir("wave")).toBe(false);
    expect(runtime.estado()).toBe(antes);
    expect(diagnosticos.some((d) => d.code === "accion-fuera-de-lugar")).toBe(true);
  });

  it("avanzar sobre una decisión no hace nada y deja un diagnóstico", () => {
    const { runtime, diagnosticos } = montar({ startSceneId: "s03_saludo_capi" });
    avanzarHastaParar(runtime);

    expect(runtime.avanzar()).toBe(false);
    expect(runtime.estado().nodeId).toBe("s03_c001");
    expect(diagnosticos.some((d) => d.code === "accion-fuera-de-lugar")).toBe(true);
  });

  it("un ciclo de cambios de escena termina en un diagnóstico, no en un cuelgue", () => {
    const validado = validateEpisodeContent(construirEpisodioCiclico());
    expect(validado.ok).toBe(true);
    if (!validado.ok) return;

    const { runtime, diagnosticos } = montar({ episode: validado.episode });
    const vista = esperarVista(runtime.vista(), "error");

    expect(vista.diagnostic.code).toBe("navegacion-rota");
    expect(diagnosticos.some((d) => d.message.includes("ciclo"))).toBe(true);
  });
});

/**
 * Episodio válido para el esquema pero con dos escenas que se apuntan entre
 * sí: la validación referencial no detecta ciclos (cada destino existe), así
 * que es el runtime quien debe cortar.
 */
function construirEpisodioCiclico() {
  const escenaCiclica = (id: string, destino: string) => ({
    id,
    environment: {},
    camera: "wide",
    cast: ["capi"],
    onEnter: {},
    entryNode: `${id}_sc`,
    nodes: [{ id: `${id}_sc`, type: "sceneChange", scene: destino }],
  });

  return {
    schemaVersion: "0.1.0",
    contentVersion: "0.1.0-draft",
    episodeId: "epCiclo",
    slug: "ciclo",
    titleLocId: "TITLE",
    status: "draft-not-validated",
    updated: "2026-09-17",
    source: "fixture-de-prueba",
    reviewPolicy: { requiredReviewers: ["psicologia"], blockProductionIfPending: true, note: "nota" },
    defaultLocale: "es-BO",
    locales: ["es-BO"],
    ageModes: ["6-8", "9-12"],
    estimatedPlayMinutes: { "6-8": 1, "9-12": 1 },
    privacy: {
      persistChoices: false,
      persistFlagsOnly: true,
      freeTextInput: false,
      telemetry: "none",
      note: "nota",
    },
    cast: {
      capi: { model: "m1", displayNameLocId: "NAME_CAPI" },
      tomi: { model: "m2", displayNameLocId: "NAME_TOMI" },
      luna: { model: "m3", displayNameLocId: "NAME_LUNA" },
      clara: { model: "m4", displayNameLocId: "NAME_CLARA" },
      beto: { model: "m5", displayNameLocId: "NAME_BETO" },
      all: { model: null, displayNameLocId: "NAME_ALL" },
    },
    props: [],
    environment: [],
    globalUi: {
      pause: {
        alwaysVisible: true,
        promptLocId: "PAUSE_PROMPT",
        options: [{ id: "resume", locId: "PAUSE_RESUME" }],
      },
      replayLineButton: true,
      bodyCompassHud: { unlockedBy: "sA", states: ["calm"] },
    },
    progressFlags: [{ id: "ep01.completed", persist: true }],
    sessionVars: [],
    entryScene: "sA",
    scenes: [escenaCiclica("sA", "sB"), escenaCiclica("sB", "sA")],
    localization: {
      "es-BO": {
        // Valores deliberadamente falsos: si alguien copiara esta fixture a
        // un componente, se notaría en pantalla al instante.
        TITLE: "TITULO-DE-PRUEBA",
        NAME_CAPI: "NOMBRE-1",
        NAME_TOMI: "NOMBRE-2",
        NAME_LUNA: "NOMBRE-3",
        NAME_CLARA: "NOMBRE-4",
        NAME_BETO: "NOMBRE-5",
        NAME_ALL: "NOMBRE-6",
        PAUSE_PROMPT: "PAUSA-PROMPT",
        PAUSE_RESUME: "PAUSA-SEGUIR",
      },
    },
  };
}
