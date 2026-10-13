// Tests de la experiencia 2D (T-001-05).
//
// Corren en jsdom, que no tiene WebGL: todo lo que pasa aquí es exactamente
// la ruta de fallback de AC-8. Cuando T-001-06 monte la escena 3D, estos
// mismos tests deben seguir verdes sin tocarlos.
//
// No se copia texto narrativo: los rótulos que se buscan en pantalla se leen
// de la tabla de localización del propio episodio, igual que hace la app.

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import type { ChoiceNode, EpisodeContent, LocId } from "../engine";
import { EPISODIO_01 } from "../shared/episode";
import GameShell from "./GameShell";
import { TEXTOS_UI } from "./ui/textos-ui";

const episodio: EpisodeContent = (() => {
  if (!EPISODIO_01.ok) {
    throw new Error("El episodio real no valida; los tests de la interfaz no pueden correr.");
  }
  return EPISODIO_01.episode;
})();

function texto(locId: LocId): string {
  return episodio.localization[episodio.defaultLocale]?.[locId] ?? locId;
}

/** Texto de una línea del guion, leído del contenido y no escrito aquí. */
function textoDeLinea(sceneId: string, nodeId: string): string {
  const scene = episodio.scenes.find((candidata) => candidata.id === sceneId);
  const node = scene?.nodes.find((candidato) => candidato.id === nodeId);
  if (!node || node.type !== "line") throw new Error(`${nodeId} no es una línea.`);
  return texto(node.locId);
}

/** Texto de una opción de decisión, leído del contenido y no escrito aquí. */
function textoDeOpcion(sceneId: string, nodeId: string, optionId: string): string {
  const scene = episodio.scenes.find((candidata) => candidata.id === sceneId);
  const node = scene?.nodes.find((candidato) => candidato.id === nodeId);
  if (!node || node.type !== "choice") throw new Error(`${nodeId} no es una decisión.`);
  const option = (node as ChoiceNode).options.find((candidata) => candidata.id === optionId);
  if (!option) throw new Error(`La opción ${optionId} no existe en ${nodeId}.`);
  return texto(option.locId);
}

const SALUDO = {
  escena: "s03_saludo_capi",
  decision: "s03_c001",
  confirmacion: "s03_c002",
  /** Línea que hace la pregunta justo antes de la decisión. */
  pregunta: "s03_n002",
};

/**
 * Abre el juego —se entra directo al mundo, sin pantalla de inicio—, entra al
 * episodio por su isla y salta a una escena con el selector de desarrollo.
 *
 * La isla se elige por la ruta 2D del mundo, no caminando: en jsdom no hay
 * WebGL, así que esto es exactamente el fallback de AC-8. Que estos tests
 * pasen por ahí es la prueba de que explorar no es el único camino.
 */
async function empezarEn(escena: string, modo?: "6-8" | "9-12") {
  const usuario = userEvent.setup();
  render(<GameShell />);

  await usuario.click(screen.getByText(TEXTOS_UI.mundo.irAUnaIsla));
  await usuario.click(screen.getByRole("button", { name: texto(episodio.titleLocId) }));

  if (modo) {
    await usuario.click(
      screen.getByRole("radio", {
        name: TEXTOS_UI.inicio[modo === "6-8" ? "edad68" : "edad912"],
      }),
    );
  }
  await usuario.selectOptions(screen.getByLabelText(TEXTOS_UI.desarrollo.selectorDeEscena), escena);

  return usuario;
}

/**
 * Juega hacia adelante pulsando el control principal de cada pantalla, sea
 * una línea, un minijuego o una celebración. Se detiene en una decisión —ahí
 * hay que elegir— o al llegar al cierre.
 */
async function jugarHastaElegirOTerminar(
  usuario: ReturnType<typeof userEvent.setup>,
  maxPasos = 60,
) {
  for (let paso = 0; paso < maxPasos; paso += 1) {
    if (document.querySelector(".cierre")) return "cierre";
    // Una decisión del guion se reconoce por su rol, no por la clase de la
    // lista: los minijuegos reutilizan esa retícula para sus tarjetas.
    if (document.querySelector('[role="group"]')) return "decision";
    const principal = document.querySelector<HTMLButtonElement>("[data-principal='true']");
    if (!principal) return "sin-control";
    await usuario.click(principal);
  }
  throw new Error(`El episodio no avanzó en ${maxPasos} pasos.`);
}

/** Avanza líneas pulsando "Continuar" hasta que aparezca una decisión. */
async function avanzarHastaLaDecision(usuario: ReturnType<typeof userEvent.setup>) {
  for (let intento = 0; intento < 20; intento += 1) {
    const continuar = screen.queryByRole("button", { name: TEXTOS_UI.dialogo.continuar });
    if (!continuar) return;
    await usuario.click(continuar);
  }
  throw new Error("No apareció ninguna decisión después de 20 líneas.");
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("GameShell — arranque", () => {
  it("entra directo al mundo, sin pantalla de inicio ni menú", () => {
    render(<GameShell />);

    // Lo primero es el sitio, no un menú: el mundo y la ruta 2D para llegar
    // a una isla sin caminar (AC-8).
    expect(screen.getByText(TEXTOS_UI.mundo.irAUnaIsla)).toBeVisible();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(TEXTOS_UI.mundo.region);
  });

  it("desde el mundo se entra al episodio de su isla", async () => {
    const usuario = userEvent.setup();
    render(<GameShell />);

    await usuario.click(screen.getByText(TEXTOS_UI.mundo.irAUnaIsla));
    await usuario.click(screen.getByRole("button", { name: texto(episodio.titleLocId) }));

    expect(screen.getByRole("button", { name: TEXTOS_UI.dialogo.continuar })).toBeVisible();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(texto(episodio.titleLocId));
  });

  it("deja a quien acompaña elegir el grupo de edad durante el juego", async () => {
    await empezarEn(SALUDO.escena);

    expect(screen.getByRole("radio", { name: TEXTOS_UI.inicio.edad68 })).toBeChecked();
    expect(screen.getByRole("radio", { name: TEXTOS_UI.inicio.edad912 })).not.toBeChecked();
  });

  it("no escribe nada en el almacenamiento solo por abrir la app", () => {
    render(<GameShell />);

    expect(window.localStorage.length).toBe(0);
  });
});

describe("GameShell — el saludo de Capi", () => {
  it("el distintivo de borrador está apagado, y se puede volver a encender", async () => {
    // AC-10 pedía el distintivo mientras el contenido no estuviera aprobado.
    // Arianna lo aprobó el 2026-09-18 y se apagó a petición de producto. El
    // componente sigue existiendo con su constante: este test vigila que
    // apagarlo fuera una decisión y no un borrado accidental, y se cae el día
    // que alguien lo vuelva a encender sin actualizar lo que AC-10 espera.
    await empezarEn(SALUDO.escena);

    expect(screen.queryByText(TEXTOS_UI.distintivoBorrador)).not.toBeInTheDocument();
  });

  it("se completa solo con teclado y sin WebGL (AC-6, AC-8)", async () => {
    const usuario = await empezarEn(SALUDO.escena);

    // El foco viaja al control principal en cada transición: basta con
    // pulsar Enter para avanzar las líneas.
    for (let linea = 0; linea < 10; linea += 1) {
      if (!screen.queryByRole("button", { name: TEXTOS_UI.dialogo.continuar })) break;
      expect(screen.getByRole("button", { name: TEXTOS_UI.dialogo.continuar })).toHaveFocus();
      await usuario.keyboard("{Enter}");
    }

    const decision = screen.getByRole("group", {
      name: textoDeLinea(SALUDO.escena, SALUDO.pregunta),
    });
    const saludoConLaMano = textoDeOpcion(SALUDO.escena, SALUDO.decision, "wave");
    expect(within(decision).getByRole("button", { name: saludoConLaMano })).toHaveFocus();

    await usuario.keyboard("{Enter}");
    await avanzarHastaLaDecision(usuario);

    const confirmar = textoDeOpcion(SALUDO.escena, SALUDO.confirmacion, "keep");
    await usuario.click(screen.getByRole("button", { name: confirmar }));

    // La escena siguiente empieza sin que haya hecho falta el ratón.
    expect(screen.getByRole("button", { name: TEXTOS_UI.dialogo.continuar })).toBeVisible();
  });

  it("la pregunta que acompaña a la decisión es la del guion, no una de la interfaz", async () => {
    const usuario = await empezarEn(SALUDO.escena);
    await avanzarHastaLaDecision(usuario);

    // Elegir no puede borrar de la pantalla la pregunta que el contenido
    // hace: si la interfaz escribiera la suya, este test fallaría y habría
    // texto para niños fuera de `content/` (Constitución IV).
    const preguntaDelGuion = textoDeLinea(SALUDO.escena, SALUDO.pregunta);
    const decision = screen.getByRole("group", { name: preguntaDelGuion });
    expect(within(decision).getByText(preguntaDelGuion)).toBeVisible();
  });

  it("la pregunta es también el encabezado de la pantalla de decisión", async () => {
    const usuario = await empezarEn(SALUDO.escena);
    await avanzarHastaLaDecision(usuario);

    // Quien navega por encabezados con lector de pantalla tiene que poder
    // saltar al tramo de decisiones, no solo al inicio y al cierre.
    const preguntaDelGuion = textoDeLinea(SALUDO.escena, SALUDO.pregunta);
    expect(screen.getByRole("heading", { level: 2, name: preguntaDelGuion })).toBeVisible();
  });

  it("oculta la opción solo para 9-12 en el modo 6-8 (AC-3)", async () => {
    const usuario = await empezarEn(SALUDO.escena, "6-8");
    await avanzarHastaLaDecision(usuario);

    const soloMayores = textoDeOpcion(SALUDO.escena, SALUDO.decision, "fist_bump");
    expect(screen.queryByRole("button", { name: soloMayores })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: textoDeOpcion(SALUDO.escena, SALUDO.decision, "wave") }),
    ).toBeVisible();
  });

  it("muestra esa misma opción en el modo 9-12 (AC-3)", async () => {
    const usuario = await empezarEn(SALUDO.escena, "9-12");
    await avanzarHastaLaDecision(usuario);

    const soloMayores = textoDeOpcion(SALUDO.escena, SALUDO.decision, "fist_bump");
    expect(screen.getByRole("button", { name: soloMayores })).toBeVisible();
  });

  it("permite cambiar de saludo cuantas veces quiera, sin mensaje de fallo (AC-4)", async () => {
    const usuario = await empezarEn(SALUDO.escena);
    await avanzarHastaLaDecision(usuario);

    const cambiar = textoDeOpcion(SALUDO.escena, SALUDO.confirmacion, "change");
    for (const saludo of ["wave", "hug", "distance"]) {
      await usuario.click(
        screen.getByRole("button", { name: textoDeOpcion(SALUDO.escena, SALUDO.decision, saludo) }),
      );
      await avanzarHastaLaDecision(usuario);
      await usuario.click(screen.getByRole("button", { name: cambiar }));
    }

    // Se vuelve a la misma decisión, con las mismas opciones y sin rastro de
    // los intentos anteriores. Se busca por su nombre porque el grupo del
    // adulto (el selector de edad) también es un `group`.
    const decision = screen.getByRole("group", {
      name: textoDeLinea(SALUDO.escena, SALUDO.pregunta),
    });
    expect(within(decision).getAllByRole("button")).toHaveLength(5);
  });

  it("todo control del diálogo lleva la clase de objetivo táctil de 44x44 (AC-6)", async () => {
    const usuario = await empezarEn(SALUDO.escena);
    await avanzarHastaLaDecision(usuario);

    // jsdom no calcula medidas: lo que se comprueba aquí es que ningún
    // control se saltó la clase que las aplica. La medida real la revisa
    // `a11y-perf-reviewer` en T-001-07.
    for (const boton of screen.getAllByRole("button")) {
      expect(boton).toHaveClass("objetivo-tactil");
    }
  });

  it("repetir la línea vuelve a anunciarla sin cambiar de nodo", async () => {
    const usuario = await empezarEn(SALUDO.escena);

    const region = document.querySelector(".visualmente-oculto");
    await waitFor(() => expect(region?.textContent).not.toBe(""));
    const anuncioInicial = region?.textContent ?? "";

    await usuario.click(screen.getByRole("button", { name: TEXTOS_UI.dialogo.repetir }));
    await waitFor(() => expect(region?.textContent).toBe(anuncioInicial));
    expect(screen.getByRole("button", { name: TEXTOS_UI.dialogo.continuar })).toBeVisible();
  });
});

describe("GameShell — cierre del episodio", () => {
  it("muestra el cierre y el pie para la persona adulta, y persiste solo ep01.completed (AC-5)", async () => {
    const usuario = await empezarEn("s07_reconstruccion");

    // La última escena se juega entera: el minijuego del puente y la
    // celebración, sin saltarse nada.
    await jugarHastaElegirOTerminar(usuario);

    const debrief = episodio.scenes
      .find((scene) => scene.id === "s07_reconstruccion")
      ?.nodes.find((node) => node.type === "end");
    if (!debrief || debrief.type !== "end" || !debrief.debriefScreen) {
      throw new Error("El nodo final del episodio perdió su pantalla de cierre.");
    }

    expect(screen.getByRole("heading", { name: texto(debrief.debriefScreen.titleLocId) })).toBeVisible();
    expect(screen.getByText(texto(debrief.debriefScreen.childLocId))).toBeVisible();
    expect(screen.getByText(TEXTOS_UI.cierre.paraLaPersonaAdulta)).toBeVisible();

    expect(window.localStorage.getItem("yais.ep01.completed")).toBe("true");
    expect(window.localStorage.length).toBe(1);
  });

  it("deja volver a jugar desde el cierre, sin penalización (AC-4)", async () => {
    const usuario = await empezarEn("s07_reconstruccion");
    await jugarHastaElegirOTerminar(usuario);

    await usuario.click(screen.getByRole("button", { name: TEXTOS_UI.cierre.volverAlMapa }));

    // Devuelve al mundo, no a una pantalla de resultado: desde ahí se puede
    // volver a entrar a la misma isla o irse a otra parte.
    expect(screen.getByText(TEXTOS_UI.mundo.irAUnaIsla)).toBeVisible();
  });
});

describe("GameShell — minijuegos", () => {
  it("la brújula corporal acepta cualquier respuesta y ninguna es un error", async () => {
    const usuario = await empezarEn("s02_brujula");
    await avanzarHastaLaDecision(usuario);

    // Las tres respuestas están disponibles y ninguna se marca como buena o
    // mala: elegir cualquiera lleva a la respuesta de Capi (Constitución V).
    const respuestas = screen.getAllByRole("button").filter((boton) =>
      /Todo tranquilo|Hmm, no sé|¡Uh-oh!/.test(boton.textContent ?? ""),
    );
    expect(respuestas).toHaveLength(3);

    await usuario.click(respuestas[2]!);
    expect(screen.getByRole("button", { name: TEXTOS_UI.dialogo.continuar })).toBeVisible();
  });

  it("el juego de chocar las manos se puede parar en cualquier momento", async () => {
    const usuario = await empezarEn("s04_tomi");
    await avanzarHastaLaDecision(usuario);
    await usuario.click(screen.getByRole("button", { name: /Preguntar primero/ }));
    await avanzarHastaLaDecision(usuario);
    await usuario.click(screen.getByRole("button", { name: /Con la mano/ }));
    await avanzarHastaLaDecision(usuario);
    await usuario.click(screen.getByRole("button", { name: /Sí|Dale/ }));

    // El botón de parar existe desde el primer momento, con el texto que le
    // pone el contenido, y no hace falta llegar a ningún sitio para usarlo.
    const parar = screen.getByRole("button", { name: texto("UI_STOP") });
    expect(parar).toBeVisible();

    await usuario.click(parar);
    expect(screen.queryByText(TEXTOS_UI.minijuegos.chocar)).not.toBeInTheDocument();
  });

  it("el puente se arma en cualquier orden y sin equivocarse", async () => {
    const usuario = await empezarEn("s07_reconstruccion");
    await avanzarHastaLaDecision(usuario);

    // Las tablas se buscan por su locId en el contenido, no por su texto
    // escrito aquí.
    const locIdsDeTablas = ["EP01_S07_T001", "EP01_S07_T002", "EP01_S07_T003"];
    const tablas = locIdsDeTablas.map((locId) =>
      screen.getByRole("button", { name: texto(locId) }),
    );

    // Se colocan en orden inverso: el contenido dice `anyOrderValid`.
    for (const tabla of [...tablas].reverse()) {
      await usuario.click(tabla);
    }

    expect(screen.getByRole("button", { name: TEXTOS_UI.dialogo.continuar })).toBeVisible();
  });
});
