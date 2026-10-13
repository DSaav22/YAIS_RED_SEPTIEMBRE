// Tests de la barra de quien acompaña dentro del episodio.
//
// Un reporte con captura de pantalla real mostraba, durante un minijuego, el
// texto «Podemos parar cuando quieras», el selector de «Grupo de edad» y el
// botón de volver al mapa compitiendo por atención justo debajo de una
// pregunta con opciones grandes. La barra ya se reducía a solo el botón de
// parar durante una decisión (`vista.kind === "choice"`); estos tests
// comprueban que un minijuego recibe el mismo tratamiento, sin que eso
// oculte nunca el botón de parar (Constitución V) ni rompa el caso de una
// línea de diálogo simple, que sigue mostrando la barra completa.
//
// No se copia texto narrativo: todo lo que se busca en pantalla se lee de la
// tabla de localización del propio episodio, igual que hace la app.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { EpisodeContent, LocId } from "../../engine";
import { EPISODIOS } from "../../shared/episodios";
import { TEXTOS_UI } from "../ui/textos-ui";
import { EpisodioEnCurso } from "./EpisodioEnCurso";

function episodioRegistrado(id: string): EpisodeContent {
  const registrado = EPISODIOS.find((candidato) => candidato.id === id);
  if (!registrado || !registrado.resultado.ok) {
    throw new Error(`El episodio ${id} no valida; este test no puede correr.`);
  }
  return registrado.resultado.episode;
}

const episodio1 = episodioRegistrado("ep01");
const episodio2 = episodioRegistrado("ep02");

function texto(episodio: EpisodeContent, locId: LocId): string {
  return episodio.localization[episodio.defaultLocale]?.[locId] ?? locId;
}

/**
 * Salta con el selector de escena de desarrollo. Es la misma herramienta que
 * usa quien desarrolla para llegar a un minijuego o a una decisión sin
 * recorrer el episodio entero; no forma parte de la experiencia publicada.
 */
async function irAEscena(usuario: ReturnType<typeof userEvent.setup>, sceneId: string) {
  await usuario.selectOptions(screen.getByLabelText(TEXTOS_UI.desarrollo.selectorDeEscena), sceneId);
}

/** Avanza líneas pulsando «Continuar» hasta que ya no haya ninguna. */
async function avanzarHastaLaDecision(usuario: ReturnType<typeof userEvent.setup>) {
  for (let intento = 0; intento < 20; intento += 1) {
    const continuar = screen.queryByRole("button", { name: TEXTOS_UI.dialogo.continuar });
    if (!continuar) return;
    await usuario.click(continuar);
  }
  throw new Error("No apareció ninguna decisión después de 20 líneas.");
}

describe("EpisodioEnCurso — barra de quien acompaña", () => {
  it("en una línea de diálogo se ve la barra completa", () => {
    render(
      <EpisodioEnCurso
        episodio={episodio1}
        ageMode="6-8"
        alCambiarEdad={vi.fn()}
        alSalirAlMundo={vi.fn()}
      />,
    );

    // El selector de «Grupo de edad» se muestra aquí porque los tests corren
    // con `import.meta.env.DEV` en `true`, igual que `npm run dev`. En el
    // build de producción que se despliega está apagado
    // (`MOSTRAR_SELECTOR_DE_EDAD_EN_LA_BARRA` en `EpisodioEnCurso.tsx`), a
    // pedido explícito para la demo del 2026-09-18 — pero sigue disponible
    // aquí porque es la ÚNICA forma de llegar al modo 9-12 en toda la app
    // (no hay pantalla de inicio separada, ver `GameShell.tsx`), y varios
    // tests de AC-3 dependen de poder cambiarlo.
    expect(screen.getByText(texto(episodio1, "UI_PAUSE_PROMPT"))).toBeVisible();
    expect(screen.getByText(TEXTOS_UI.adulto.grupoDeEdad)).toBeVisible();
    expect(screen.getByRole("button", { name: texto(episodio1, "UI_PAUSE_MAP") })).toBeVisible();
  });

  it("en una decisión solo queda el botón de parar", async () => {
    const usuario = userEvent.setup();
    render(
      <EpisodioEnCurso
        episodio={episodio1}
        ageMode="6-8"
        alCambiarEdad={vi.fn()}
        alSalirAlMundo={vi.fn()}
      />,
    );

    await irAEscena(usuario, "s03_saludo_capi");
    await avanzarHastaLaDecision(usuario);

    // Por nombre, no por rol a secas: el panel de desarrollo trae su propio
    // `<details>`, que también resuelve a rol «group».
    expect(screen.getByRole("group", { name: texto(episodio1, "EP01_S03_L002") })).toBeVisible();
    expect(screen.queryByText(texto(episodio1, "UI_PAUSE_PROMPT"))).not.toBeInTheDocument();
    expect(screen.queryByText(TEXTOS_UI.adulto.grupoDeEdad)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: texto(episodio1, "UI_PAUSE_MAP") })).toBeVisible();
  });

  it("en un minijuego también solo queda el botón de parar", async () => {
    const usuario = userEvent.setup();
    render(
      <EpisodioEnCurso
        episodio={episodio2}
        ageMode="6-8"
        alCambiarEdad={vi.fn()}
        alSalirAlMundo={vi.fn()}
      />,
    );

    // `s02_fichas` entra por una línea de Capi y de ahí va directo a las
    // fichas de confianza (`trust_cards`, nodo `s02_m001`).
    await irAEscena(usuario, "s02_fichas");
    await usuario.click(screen.getByRole("button", { name: TEXTOS_UI.dialogo.continuar }));

    // La primera ficha —«Te escucha cuando hablas»— confirma que ya se ve el
    // minijuego y no la línea de antes.
    expect(screen.getByText(texto(episodio2, "EP02_S02_T001"))).toBeVisible();

    expect(screen.queryByText(texto(episodio2, "UI_PAUSE_PROMPT"))).not.toBeInTheDocument();
    expect(screen.queryByText(TEXTOS_UI.adulto.grupoDeEdad)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: texto(episodio2, "UI_PAUSE_MAP") })).toBeVisible();
  });
});
