// Tests de los encuentros colocados en el mundo.
//
// Son la red que protege el contenido de los cambios del mundo. El
// archipiélago se reescribe a menudo —islas nuevas, alturas, puentes— y los
// encuentros están anclados en coordenadas: si una isla se mueve o encoge, un
// personaje puede quedar sobre el agua y `encuentrosDelMundo` lo descarta en
// silencio. Silencio es exactamente lo que no queremos: un personaje que
// desaparece del juego sin que nadie se entere.

import { describe, expect, it } from "vitest";

import { ENCUENTROS_DE_LA_ISLA } from "../../shared/encuentros";
import { PRELOADED_CHARACTER_IDS } from "../../shared/assets";
import { RADIO_PARA_HABLAR, encuentroCercano, encuentrosDelMundo } from "./encuentros-del-mundo";
import { esCaminable } from "./mundo";

const contenido = (() => {
  if (!ENCUENTROS_DE_LA_ISLA.ok) throw new Error("Los encuentros no validan.");
  return ENCUENTROS_DE_LA_ISLA.contenido;
})();

describe("encuentros colocados en el mundo", () => {
  it("ningún encuentro se pierde por caer fuera del suelo pisable", () => {
    // Se comprueba contra el contenido completo, no contra lo que sobrevive
    // al filtro: si alguien mueve una isla y deja a un personaje en el agua,
    // este test lo dice en vez de que el personaje desaparezca sin más.
    const enElAgua = contenido.encuentros
      .filter((encuentro) => !esCaminable(encuentro.anclaje[0], encuentro.anclaje[1]))
      .map((encuentro) => `${encuentro.id} en ${encuentro.isla}`);

    expect(enElAgua, "Estos encuentros quedaron sobre el agua tras cambiar el mundo.").toEqual([]);
  });

  it("todos los personajes de los encuentros tienen modelo sincronizado", () => {
    const sinModelo = contenido.encuentros
      .filter(
        (encuentro) => !(PRELOADED_CHARACTER_IDS as readonly string[]).includes(encuentro.castId),
      )
      .map((encuentro) => `${encuentro.id} (${encuentro.castId})`);

    expect(sinModelo, "Estos encuentros no se pueden vivir: su personaje no está en el juego.").toEqual(
      [],
    );
  });

  it("en cada modo de edad hay encuentros, y los de 9-12 no aparecen en 6-8", () => {
    const pequenos = encuentrosDelMundo("6-8");
    const grandes = encuentrosDelMundo("9-12");

    expect(pequenos.length).toBeGreaterThan(0);
    expect(grandes.length).toBeGreaterThanOrEqual(pequenos.length);

    const soloGrandes = contenido.encuentros.filter(
      (encuentro) => encuentro.ageModes?.length === 1 && encuentro.ageModes[0] === "9-12",
    );
    for (const encuentro of soloGrandes) {
      expect(pequenos.map((visible) => visible.id)).not.toContain(encuentro.id);
    }
  });

  it("estar junto a un personaje ofrece hablar con ese, no con otro", () => {
    for (const habitante of encuentrosDelMundo("9-12")) {
      const encontrado = encuentroCercano(
        habitante.anclaje[0],
        habitante.anclaje[1],
        encuentrosDelMundo("9-12"),
      );
      expect(encontrado?.id, `junto a ${habitante.id} se ofrece otro`).toBe(habitante.id);
    }
  });

  it("lejos de todos no se ofrece hablar con nadie", () => {
    expect(encuentroCercano(500, 500, encuentrosDelMundo("9-12"))).toBeNull();
  });

  it("el radio para hablar es más corto que el de las misiones", () => {
    // Hablar es acercarse a alguien; una misión se ve desde lejos. Si fueran
    // iguales, la oferta de hablar taparía la de empezar el episodio.
    expect(RADIO_PARA_HABLAR).toBeLessThan(1.6);
  });
});
