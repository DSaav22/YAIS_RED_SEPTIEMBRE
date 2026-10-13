// Una conversación suelta con alguien del mundo (encuentros).
//
// Dos a cuatro líneas, una detrás de otra, y se acabó. No hay decisiones, no
// se guarda nada y no se puede fallar: es lo que separa un encuentro de un
// episodio. Se puede dejar a medias en cualquier momento (Constitución V).
//
// Todo el texto sale de `content/encuentros/`; lo único escrito aquí son los
// rótulos de los dos botones, que viven en `textos-ui.ts`.

import { useState } from "react";

import type { Encuentro, LocId } from "../../engine";
import { TEXTOS_UI } from "../ui/textos-ui";

interface ConversacionProps {
  readonly encuentro: Encuentro;
  readonly texto: (locId: LocId) => string;
  readonly nombreDe: (castId: string) => string;
  readonly alTerminar: () => void;
}

export function Conversacion({ encuentro, texto, nombreDe, alTerminar }: ConversacionProps) {
  const [indice, setIndice] = useState(0);
  const linea = encuentro.lineas[indice];

  // Si el contenido cambiara bajo los pies, se cierra en vez de romperse.
  if (!linea) {
    alTerminar();
    return null;
  }

  const esLaUltima = indice === encuentro.lineas.length - 1;

  return (
    <section className="conversacion" aria-label={TEXTOS_UI.mundo.conversacion}>
      <div className="dialogo">
        <p className="dialogo__hablante">{nombreDe(linea.speaker)}</p>
        <p className="dialogo__texto">{texto(linea.locId)}</p>
      </div>

      <div className="conversacion__controles">
        <button
          type="button"
          className="objetivo-tactil boton boton--primario"
          data-principal="true"
          onClick={() => {
            if (esLaUltima) alTerminar();
            else setIndice((anterior) => anterior + 1);
          }}
        >
          {TEXTOS_UI.dialogo.continuar}
        </button>

        {/* Irse a media conversación no cuesta nada y no hay que terminarla
            para que cuente: no cuenta para nada. */}
        {esLaUltima ? null : (
          <button
            type="button"
            className="objetivo-tactil boton boton--secundario"
            onClick={alTerminar}
          >
            {TEXTOS_UI.mundo.seguirExplorando}
          </button>
        )}
      </div>
    </section>
  );
}
