// Tests de qué muestra la escena 3D (T-001-06).
//
// Se prueban sobre el episodio real y sin WebGL: el módulo es puro a
// propósito para que la regla más importante del hito —qué personajes se
// descargan— pueda comprobarse sin montar un canvas.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  crearAlmacenamientoEnMemoria,
  crearProgressStore,
  crearRuntime,
  parseEpisodeContent,
  type EpisodeContent,
  type Runtime,
} from "../../engine";
import { PRELOADED_CHARACTER_IDS } from "../../shared/assets";
import { estadoDeEscenaDesde } from "./estado-de-escena";

const currentDir = dirname(fileURLToPath(import.meta.url));
const rutaDelEpisodio = resolve(currentDir, "../../../../content/episodes/ep01-saludo.json");

const episodio: EpisodeContent = (() => {
  const resultado = parseEpisodeContent(readFileSync(rutaDelEpisodio, "utf8"));
  if (!resultado.ok) throw new Error("El episodio real no valida.");
  return resultado.episode;
})();

function montarEn(sceneId: string): Runtime {
  return crearRuntime(episodio, {
    ageMode: "6-8",
    progress: crearProgressStore(crearAlmacenamientoEnMemoria()),
    startSceneId: sceneId,
  });
}

function avanzarHastaLaDecision(runtime: Runtime): void {
  for (let paso = 0; paso < 20 && runtime.vista().kind === "line"; paso += 1) {
    runtime.avanzar();
  }
}

function escenaDe(runtime: Runtime) {
  return estadoDeEscenaDesde(runtime.vista(), runtime.estado());
}

describe("estadoDeEscenaDesde", () => {
  it("pone en escena a quien habla, con la intención que pide el guion", () => {
    const runtime = montarEn("s03_saludo_capi");

    const escena = escenaDe(runtime);

    expect(escena.sceneId).toBe("s03_saludo_capi");
    expect(escena.personajes).toEqual(["capi"]);
    expect(escena.protagonista).toBe("capi");
    expect(escena.gesto).toEqual({ tipo: "intencion", intent: "open_arms" });
  });

  it("deja escuchando a quien hizo la pregunta mientras se decide", () => {
    const runtime = montarEn("s03_saludo_capi");
    avanzarHastaLaDecision(runtime);

    const escena = escenaDe(runtime);

    expect(runtime.vista().kind).toBe("choice");
    expect(escena.protagonista).toBe("capi");
    expect(escena.gesto).toEqual({ tipo: "escuchar" });
  });

  it("monta a Capi y a Tomi juntos en la escena que comparten", () => {
    const runtime = montarEn("s04_tomi");

    const escena = escenaDe(runtime);

    expect([...escena.personajes].sort()).toEqual(["capi", "tomi"]);
    expect(escena.protagonista).toBe("tomi");
  });

  it("no pone en escena a ningún personaje sin GLB sincronizado", () => {
    // Luna, Clara y Beto están registrados pero no se descargan en este hito
    // (PLAN-001). Ninguna escena del episodio puede pedirlos.
    for (const scene of episodio.scenes) {
      const runtime = montarEn(scene.id);
      const escena = escenaDe(runtime);

      for (const personaje of escena.personajes) {
        expect(PRELOADED_CHARACTER_IDS).toContain(personaje);
      }
      expect(escena.protagonista === null || PRELOADED_CHARACTER_IDS.includes(escena.protagonista)).toBe(
        true,
      );
    }
  });

  it("ahora que Luna tiene modelo, actúa ella misma en su escena", () => {
    // Este test decía lo contrario: comprobaba que Luna NO aparecía, porque
    // su GLB no cabía en el presupuesto de assets. Al optimizar los modelos
    // entraron los cinco personajes, así que la escena de Luna ya la
    // protagoniza Luna. Se deja el caso escrito —y no borrado— porque lo que
    // sigue importando es que la escena represente a quien habla.
    const runtime = montarEn("s05_luna");

    const escena = escenaDe(runtime);

    expect(escena.personajes).toContain("luna");
    expect(escena.protagonista).toBe("luna");
    expect(escena.gesto.tipo).toBe("intencion");
  });

  it("quien no tiene modelo nunca sube al escenario", () => {
    // La regla de fondo, que no depende de cuántos modelos haya hoy: la
    // escena solo monta a quien `PRELOADED_CHARACTER_IDS` declara. Si mañana
    // un personaje se cae del presupuesto, el episodio sigue jugándose con su
    // retrato 2D y el diálogo (AC-8), no con un hueco.
    for (const scene of episodio.scenes) {
      const escena = escenaDe(montarEn(scene.id));
      for (const personaje of escena.personajes) {
        expect(PRELOADED_CHARACTER_IDS).toContain(personaje);
      }
    }
  });

  it("deja la escena en reposo mientras se juega un minijuego y en el cierre", () => {
    const runtime = montarEn("s02_brujula");
    avanzarHastaLaDecision(runtime);

    // Durante un minijuego los personajes no actúan: la atención está en las
    // tarjetas, no en el escenario.
    expect(runtime.vista().kind).toBe("minigame");
    expect(escenaDe(runtime).gesto).toEqual({ tipo: "reposo" });
  });

  it("lleva las variables de sesión para los saludos que dependen de la elección", () => {
    const runtime = montarEn("s03_saludo_capi");
    avanzarHastaLaDecision(runtime);
    runtime.elegir("wave");

    expect(escenaDe(runtime).sessionVars["greetCapi"]).toBe("wave");
  });
});
