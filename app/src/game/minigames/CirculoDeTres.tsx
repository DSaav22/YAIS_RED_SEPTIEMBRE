// Mi círculo de 3 (`circle_of_three`, episodio 2, escena s04).
//
// Tres sitios —casa, escuela, comunidad— y una sola cosa que hacer en cada
// uno: decir que ya pensaste en alguien. **No se escribe ningún nombre, no se
// elige ninguna cara y no se guarda nada**: el contenido lo declara con
// `storeAnswers: false` y el esquema exige que sea exactamente `false`. Eso
// es lo que separa este ejercicio de un registro de la red de apoyo de un
// niño, que es precisamente lo que el producto no puede hacer
// (Constitución I y III).
//
// «Todavía estoy pensando» está siempre disponible y **el círculo se ilumina
// igual**. No es un consuelo: es el caso de un niño que no tiene tres adultos
// en quienes confiar, y el guion decide a propósito que no se note como
// fracaso. Por eso aquí no hay contador de cuántos sitios llevas, ni un
// estado «incompleto».
//
// Todo el texto sale de `content/`.

import { useState } from "react";

import type { CastId, CircleOfThreeConfig, LocId } from "../../engine";
import { ICONOS, type IconId } from "../ui/icons";
import { TEXTOS_UI } from "../ui/textos-ui";

interface CirculoDeTresProps {
  readonly config: CircleOfThreeConfig;
  readonly texto: (locId: LocId) => string;
  readonly nombreDe: (castId: CastId) => string;
  readonly alTerminar: () => void;
}

function esIconoConocido(id: string): id is IconId {
  return Object.prototype.hasOwnProperty.call(ICONOS, id);
}

export function CirculoDeTres({ config, texto, nombreDe, alTerminar }: CirculoDeTresProps) {
  const [encendidos, setEncendidos] = useState<readonly string[]>([]);
  const [respuesta, setRespuesta] = useState<{ locId: LocId; speaker: CastId } | null>(null);

  const faltan = config.slots.filter((sitio) => !encendidos.includes(sitio.id));

  function encender(slotId: string): void {
    const siguientes = [...encendidos, slotId];
    setEncendidos(siguientes);
    if (siguientes.length === config.slots.length) {
      setRespuesta({
        locId: config.feedbackComplete.locId,
        speaker: config.feedbackComplete.speaker,
      });
    }
  }

  function todaviaPensando(): void {
    // El círculo se ilumina igual: el guion no deja que esto se lea como
    // haberlo hecho a medias.
    setEncendidos(config.slots.map((sitio) => sitio.id));
    setRespuesta({
      locId: config.feedbackStillThinking.locId,
      speaker: config.feedbackStillThinking.speaker,
    });
  }

  if (respuesta) {
    return (
      <section className="minijuego">
        <div className="minijuego__respuesta">
          <p className="dialogo__hablante">{nombreDe(respuesta.speaker)}</p>
          <p className="dialogo__texto">{texto(respuesta.locId)}</p>
        </div>
        <button
          type="button"
          className="objetivo-tactil boton boton--primario"
          data-principal="true"
          onClick={alTerminar}
        >
          {TEXTOS_UI.dialogo.continuar}
        </button>
      </section>
    );
  }

  return (
    <section className="minijuego">
      <ul className="decisiones__lista">
        {config.slots.map((sitio) => {
          const encendido = encendidos.includes(sitio.id);
          const Icono = esIconoConocido(sitio.icon) ? ICONOS[sitio.icon] : null;
          return (
            <li key={sitio.id}>
              <button
                type="button"
                className="objetivo-tactil boton boton--opcion"
                data-principal={sitio.id === faltan[0]?.id ? "true" : undefined}
                aria-disabled={encendido || undefined}
                onClick={() => {
                  if (encendido) return;
                  encender(sitio.id);
                }}
              >
                {Icono ? (
                  <span className="opcion__icono" aria-hidden="true">
                    <Icono />
                  </span>
                ) : null}
                <span>{texto(sitio.locId)}</span>
                {/* El sitio dice su nombre; el estado lo dice el texto de la
                    acción, no un color. */}
                <span className="visualmente-oculto">
                  {encendido ? texto(config.confirmLocId) : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="minijuego__controles">
        <button
          type="button"
          className="objetivo-tactil boton boton--secundario"
          onClick={todaviaPensando}
        >
          {texto(config.stillThinkingLocId)}
        </button>
      </div>
    </section>
  );
}
