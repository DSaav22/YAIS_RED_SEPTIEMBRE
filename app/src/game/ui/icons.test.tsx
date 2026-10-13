/// <reference types="node" />
// Ver la nota en `shared/assets.test.ts`: esta es la única razón para tocar
// `node:fs` en `src/` -el test corre en Node vía Vitest, no en el
// navegador- y necesita leer el contenido real del episodio para
// comprobar que ningún icono referenciado se queda sin registrar.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ICONOS } from "./icons";

// icons.test.tsx vive en app/src/game/ui; la raíz del repo está cuatro
// niveles arriba (app/src/game/ui -> app/src/game -> app/src -> app -> raíz).
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const EPISODE_PATH = join(REPO_ROOT, "content", "episodes", "ep01-saludo.json");

/** Recorre el JSON del episodio y junta todo valor de una clave "icon". */
function recolectarIconos(valor: unknown, encontrados: Set<string>): void {
  if (Array.isArray(valor)) {
    for (const item of valor) recolectarIconos(item, encontrados);
    return;
  }
  if (valor !== null && typeof valor === "object") {
    for (const [clave, sub] of Object.entries(valor)) {
      if (clave === "icon" && typeof sub === "string") {
        encontrados.add(sub);
      }
      recolectarIconos(sub, encontrados);
    }
  }
}

describe("registro de iconos ICONOS", () => {
  it("contiene todo icono referenciado por content/episodes/ep01-saludo.json", () => {
    const episodio: unknown = JSON.parse(readFileSync(EPISODE_PATH, "utf8"));
    const encontrados = new Set<string>();
    recolectarIconos(episodio, encontrados);

    // Si esto falla, el contenido cambió: es la señal de que hay que
    // agregar el icono nuevo a `ICONOS`, no de que el test está mal.
    expect(encontrados.size).toBeGreaterThan(0);

    const idsRegistrados = new Set(Object.keys(ICONOS));
    for (const iconId of encontrados) {
      expect(idsRegistrados.has(iconId), `falta "${iconId}" en ICONOS`).toBe(true);
    }
  });

  it("un icono con nombre accesible lo expone a lectores de pantalla", () => {
    const IconEstrella = ICONOS.icon_star;
    render(<IconEstrella nombreAccesible="Estrella" />);

    expect(screen.getByRole("img", { name: "Estrella" })).toBeVisible();
  });

  it("un icono sin nombre accesible queda oculto para lectores de pantalla", () => {
    const IconEstrella = ICONOS.icon_star;
    const { container } = render(<IconEstrella />);

    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).not.toHaveAttribute("role");
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("ningún icono contiene <image> ni <text>: son formas dibujadas, no capturas ni texto rasterizado", () => {
    for (const [iconId, Icono] of Object.entries(ICONOS)) {
      const { container, unmount } = render(
        <Icono nombreAccesible={`icono de prueba: ${iconId}`} />,
      );

      expect(container.querySelector("image"), `${iconId} tiene <image>`).toBeNull();
      expect(container.querySelector("text"), `${iconId} tiene <text>`).toBeNull();

      unmount();
    }
  });
});
