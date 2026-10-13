// Tests de los minijuegos del episodio 2.
//
// No se prueba que "funcionen": se prueban las dos reglas que el episodio no
// puede romper sin dejar de ser lo que es.
//
// 1. Las fichas de confianza no se pueden fallar. Ninguna colocación bloquea
//    y, al tercer desvío, Capi coloca la ficha él —lo pide el guion— para que
//    el juego siempre avance.
// 2. «Todavía estoy pensando» ilumina el círculo igual que haber pensado en
//    tres personas. Es el caso de un niño sin tres adultos de confianza, y el
//    guion decide que no se note como fracaso.
//
// Los textos se leen del contenido real, nunca se escriben aquí.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type {
  CircleOfThreeConfig,
  EpisodeContent,
  LocId,
  TrustCardsConfig,
} from "../../engine";
import { EPISODIOS } from "../../shared/episodios";
import { CirculoDeTres } from "./CirculoDeTres";
import { FichasDeConfianza } from "./FichasDeConfianza";

const episodio: EpisodeContent = (() => {
  const registrado = EPISODIOS.find((candidato) => candidato.id === "ep02");
  if (!registrado || !registrado.resultado.ok) {
    throw new Error("El episodio 2 no valida; sus minijuegos no se pueden probar.");
  }
  return registrado.resultado.episode;
})();

function texto(locId: LocId): string {
  return episodio.localization[episodio.defaultLocale]?.[locId] ?? locId;
}

function configDe<T>(sceneId: string, minigameId: string): T {
  for (const escena of episodio.scenes) {
    if (escena.id !== sceneId) continue;
    for (const nodo of escena.nodes) {
      if (nodo.type === "minigame" && nodo.minigameId === minigameId) {
        return nodo.config as T;
      }
    }
  }
  throw new Error(`No hay minijuego ${minigameId} en ${sceneId}.`);
}

const configFichas = configDe<TrustCardsConfig>("s02_fichas", "trust_cards");
const configCirculo = configDe<CircleOfThreeConfig>("s04_circulo", "circle_of_three");

describe("fichas de confianza", () => {
  it("nunca se guarda lo que el niño clasificó", () => {
    // Lo exige el esquema, pero se afirma aquí también: es la diferencia
    // entre enseñar a reconocer conductas y hacer un perfil del niño.
    expect(configFichas.storeAnswers).toBe(false);
  });

  it("colocar donde el guion no esperaba no bloquea: Capi pregunta", async () => {
    const usuario = userEvent.setup();
    render(
      <FichasDeConfianza
        config={configFichas}
        ageMode="6-8"
        texto={texto}
        nombreDe={() => "Capi"}
        alTerminar={() => undefined}
      />,
    );

    // La primera ficha va en «Eso es cuidar»; se pone en la otra zona.
    await usuario.click(screen.getByRole("button", { name: texto("EP02_S02_Z002") }));

    expect(screen.getByText(texto("EP02_S02_F003"))).toBeVisible();
    // Y se puede seguir: no hay pantalla sin salida.
    expect(screen.getByRole("button")).toBeVisible();
  });

  it("al tercer desvío Capi coloca la ficha y el juego avanza", async () => {
    const usuario = userEvent.setup();
    render(
      <FichasDeConfianza
        config={configFichas}
        ageMode="6-8"
        texto={texto}
        nombreDe={() => "Capi"}
        alTerminar={() => undefined}
      />,
    );

    const primeraFicha = texto(configFichas.cards[0]!.locId);
    const zonaEquivocada = texto("EP02_S02_Z002");
    const continuar = () => screen.getByRole("button", { name: /Continuar/ });

    for (let intento = 0; intento < 3; intento += 1) {
      await usuario.click(screen.getByRole("button", { name: zonaEquivocada }));
      await usuario.click(continuar());
    }

    // Tras el tercero, la ficha ya no está: el guion dice que Capi la coloca
    // y lo explica, y eso es lo que impide que el juego se quede atascado.
    expect(screen.queryByText(primeraFicha)).not.toBeInTheDocument();
  });

  it("la ficha que vale en cualquier zona no puede equivocarse", async () => {
    const usuario = userEvent.setup();
    render(
      <FichasDeConfianza
        config={configFichas}
        ageMode="9-12"
        texto={texto}
        nombreDe={() => "Capi"}
        alTerminar={() => undefined}
      />,
    );

    const fichaLibre = configFichas.cards.find((carta) => carta.anyZoneValid);
    expect(fichaLibre).toBeDefined();

    // Se colocan las anteriores para llegar a ella por su zona esperada.
    for (const carta of configFichas.cards) {
      if (carta.id === fichaLibre?.id) break;
      const zona = configFichas.zones.find((z) => z.id === carta.expectedZone);
      await usuario.click(screen.getByRole("button", { name: texto(zona!.locId) }));
      await usuario.click(screen.getByRole("button", { name: /Continuar/ }));
    }

    expect(screen.getByText(texto(fichaLibre!.locId))).toBeVisible();
    // Cualquier zona vale, y responde con la línea que el guion trae para ella.
    await usuario.click(screen.getByRole("button", { name: texto("EP02_S02_Z002") }));
    expect(screen.getByText(texto("EP02_S02_F005"))).toBeVisible();
  });
});

describe("mi círculo de 3", () => {
  it("nunca se guarda en quién pensó el niño", () => {
    expect(configCirculo.storeAnswers).toBe(false);
  });

  it("«todavía estoy pensando» ilumina el círculo igual", async () => {
    const usuario = userEvent.setup();
    render(
      <CirculoDeTres
        config={configCirculo}
        texto={texto}
        nombreDe={() => "Capi"}
        alTerminar={() => undefined}
      />,
    );

    await usuario.click(screen.getByRole("button", { name: texto(configCirculo.stillThinkingLocId) }));

    // Responde con la línea cálida del guion, no con una de consuelo por
    // haberlo hecho a medias, y se puede continuar igual que en el otro caso.
    expect(screen.getByText(texto(configCirculo.feedbackStillThinking.locId))).toBeVisible();
    expect(screen.getByRole("button", { name: /Continuar/ })).toBeVisible();
  });

  it("pensar en los tres sitios lleva a la misma pantalla de continuar", async () => {
    const usuario = userEvent.setup();
    render(
      <CirculoDeTres
        config={configCirculo}
        texto={texto}
        nombreDe={() => "Capi"}
        alTerminar={() => undefined}
      />,
    );

    for (const sitio of configCirculo.slots) {
      await usuario.click(screen.getByRole("button", { name: texto(sitio.locId) }));
    }

    expect(screen.getByText(texto(configCirculo.feedbackComplete.locId))).toBeVisible();
    expect(screen.getByRole("button", { name: /Continuar/ })).toBeVisible();
  });
});
