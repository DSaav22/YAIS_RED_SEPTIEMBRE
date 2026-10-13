// Tests de la puerta de entrada a la escena 3D (T-001-06).
//
// jsdom no tiene WebGL, así que este archivo prueba exactamente el escenario
// de AC-8: un equipo que no puede dibujar en 3D. Lo que debe ocurrir es
// nada —ni canvas, ni descarga del motor, ni error— y que el episodio siga
// jugándose en 2D.

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  crearAlmacenamientoEnMemoria,
  crearProgressStore,
  crearRuntime,
  type EpisodeContent,
} from "../../engine";
import { EPISODIO_01 } from "../../shared/episode";
import { EscenaDelEpisodio } from "./EscenaDelEpisodio";
import * as soporte from "./soporte-webgl";

const episodio: EpisodeContent = (() => {
  if (!EPISODIO_01.ok) throw new Error("El episodio real no valida.");
  return EPISODIO_01.episode;
})();

function runtimeEn(sceneId: string) {
  return crearRuntime(episodio, {
    ageMode: "6-8",
    progress: crearProgressStore(crearAlmacenamientoEnMemoria()),
    startSceneId: sceneId,
  });
}

describe("EscenaDelEpisodio", () => {
  it("no monta nada si el dispositivo no soporta WebGL (AC-8)", () => {
    vi.spyOn(soporte, "soportaWebGL").mockReturnValue(false);
    const runtime = runtimeEn("s03_saludo_capi");

    const { container } = render(
      <EscenaDelEpisodio vista={runtime.vista()} estado={runtime.estado()} />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("con WebGL disponible no muestra nada mientras el lienzo carga", () => {
    vi.spyOn(soporte, "soportaWebGL").mockReturnValue(true);
    const runtime = runtimeEn("s06_adultos");

    // El módulo del lienzo se carga con `import()`: en este render todavía no
    // llegó. Lo que se comprueba es que eso no rompe nada y que no aparece
    // ningún cartel de carga que robe atención al diálogo.
    const { container } = render(
      <EscenaDelEpisodio vista={runtime.vista()} estado={runtime.estado()} />,
    );

    expect(screen.queryByRole("alert")).toBeNull();
    expect(container.textContent).toBe("");
  });

  it("la escena es decorado: no aporta nada al árbol de accesibilidad", () => {
    vi.spyOn(soporte, "soportaWebGL").mockReturnValue(false);
    const runtime = runtimeEn("s04_tomi");

    const { container } = render(
      <EscenaDelEpisodio vista={runtime.vista()} estado={runtime.estado()} />,
    );

    expect(container.querySelector("[aria-hidden='false']")).toBeNull();
    expect(container.textContent).toBe("");
  });
});
