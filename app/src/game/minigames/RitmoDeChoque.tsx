// Chocar las manos con Tomi (`high_five_rhythm`, escena s04).
//
// El contenido declara `speedRequired: false`: no hay ritmo que seguir, ni
// tiempo, ni forma de fallar. Se choca las manos las veces que dice el guion
// (`beatsBeforeQuestion`) y se sigue. Eso es deliberado: el episodio trata de
// acordar cómo saludarse, no de reflejos (Constitución V).
//
// El botón de parar está siempre visible porque el contenido lo pide
// (`stopButton.alwaysVisible`), lleva su propio texto y su propio destino
// (`onPress`), y responde también a la tecla que el contenido declara. Es la
// pieza más importante de este minijuego: poder decir basta a mitad de un
// juego físico, y que el juego responda de inmediato, es exactamente lo que
// el episodio enseña.

import { useEffect, useState } from "react";

import type { HighFiveRhythmConfig, LocId } from "../../engine";
import { ICONOS } from "../ui/icons";
import { TEXTOS_UI } from "../ui/textos-ui";

interface RitmoDeChoqueProps {
  readonly config: HighFiveRhythmConfig;
  readonly texto: (locId: LocId) => string;
  /** Sin argumento continúa por el `next`; con uno, va a ese nodo. */
  readonly alTerminar: (nodeId?: string) => void;
}

export function RitmoDeChoque({ config, texto, alTerminar }: RitmoDeChoqueProps) {
  const [choques, setChoques] = useState(0);
  const suficientes = choques >= config.beatsBeforeQuestion;

  // La tecla de parar la declara el contenido (`stopButton.keyboard`), no la
  // interfaz: quien escribe el guion decide cómo se dice basta.
  //
  // El contenido pide `Space`, que es también con lo que el navegador activa
  // el botón que tenga el foco. Si esto se quedara con la tecla siempre, quien
  // juega con teclado nunca podría chocar las manos: pulsar espacio pararía el
  // juego (lo encontró la revisión de a11y). Así que cuando hay un control
  // enfocado manda el control, y la tecla global solo actúa cuando el foco no
  // está en ninguno.
  useEffect(() => {
    function alPulsar(evento: KeyboardEvent): void {
      if (evento.code !== config.stopButton.keyboard) return;
      const enfocado = document.activeElement;
      const esControl =
        enfocado instanceof HTMLButtonElement ||
        enfocado instanceof HTMLInputElement ||
        enfocado instanceof HTMLSelectElement ||
        enfocado instanceof HTMLAnchorElement;
      if (esControl) return;
      evento.preventDefault();
      alTerminar(config.stopButton.onPress);
    }
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [config.stopButton.keyboard, config.stopButton.onPress, alTerminar]);

  const Mano = ICONOS.icon_greet_high_five;

  return (
    <section className="minijuego minijuego--choque" aria-labelledby="choque-titulo">
      <h2 className="dialogo__texto" id="choque-titulo">
        {TEXTOS_UI.minijuegos.chocar}
      </h2>

      <div className="minijuego__controles">
        <button
          type="button"
          className="objetivo-tactil boton boton--primario minijuego__mano"
          data-principal="true"
          onClick={() => (suficientes ? alTerminar() : setChoques((previos) => previos + 1))}
        >
          <span className="opcion__icono" aria-hidden="true">
            <Mano />
          </span>
          <span>{suficientes ? TEXTOS_UI.dialogo.continuar : TEXTOS_UI.minijuegos.chocar}</span>
        </button>

        {/* Parar está siempre, no solo al final, y no cuesta nada. */}
        <button
          type="button"
          className="objetivo-tactil boton boton--secundario"
          onClick={() => alTerminar(config.stopButton.onPress)}
        >
          {texto(config.stopButton.locId)}
        </button>
      </div>
    </section>
  );
}
