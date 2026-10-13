// Practicar la brújula corporal (`body_compass_practice`, escena s02).
//
// Se muestran las tarjetas que declara el contenido, una a una, y para cada
// una las mismas tres respuestas: tranquilo, no sé, uh-oh. **Cualquier
// respuesta es válida** (`anyAnswerValid: true` en el contenido) y ninguna se
// guarda (`storeAnswers: false`): esto no evalúa a nadie, enseña a nombrar lo
// que se siente en el cuerpo.
//
// Por eso aquí no hay acierto ni error, ni contador, ni forma de "hacerlo
// mal" (Constitución V). Después de cada tarjeta responde Capi con la línea
// que el guion trae.
//
// Todo el texto —tarjetas, respuestas y respuesta de Capi— viene de
// `content/`; aquí no hay ni una palabra escrita para un niño. Tuvo un rótulo
// «Tu brújula» y la revisión de content-guardian lo bloqueó con razón: no
// nombraba una acción, nombraba el concepto central del episodio con el mismo
// posesivo que usa Capi, y salía en el sitio donde va quien habla.
//
// La cabecera del minijuego es la propia tarjeta. Cada tarjeta se responde una
// vez: el guion no contempla volver atrás, y como no se guarda ni se juzga
// nada, no hay nada que rehacer.

import { useState } from "react";

import type { BodyCompassPracticeConfig, CastId, LocId } from "../../engine";
import { ICONOS, type IconId } from "../ui/icons";
import { TEXTOS_UI } from "../ui/textos-ui";

interface BrujulaCorporalProps {
  readonly config: BodyCompassPracticeConfig;
  readonly texto: (locId: LocId) => string;
  readonly nombreDe: (castId: CastId) => string;
  readonly alTerminar: () => void;
}

function esIconoConocido(id: string): id is IconId {
  return Object.prototype.hasOwnProperty.call(ICONOS, id);
}

export function BrujulaCorporal({
  config,
  texto,
  nombreDe,
  alTerminar,
}: BrujulaCorporalProps) {
  const [indice, setIndice] = useState(0);
  const [respondida, setRespondida] = useState(false);

  const tarjeta = config.cards[indice];
  if (!tarjeta) {
    // Sin tarjetas no hay nada que practicar; se continúa en vez de dejar la
    // pantalla en blanco.
    return null;
  }

  // El contenido cambia la respuesta de Capi a partir de cierta tarjeta.
  const respuesta =
    indice >= config.feedbackVariantAfterCard.cardIndexFrom
      ? config.feedbackVariantAfterCard
      : config.feedbackAfterEachCard;

  const esUltima = indice === config.cards.length - 1;

  function continuar(): void {
    if (esUltima) {
      alTerminar();
      return;
    }
    setIndice((anterior) => anterior + 1);
    setRespondida(false);
  }

  return (
    <section className="minijuego" aria-labelledby="brujula-tarjeta">
      <h2 className="dialogo__texto" id="brujula-tarjeta">
        {texto(tarjeta.locId)}
      </h2>

      {respondida ? (
        <div className="minijuego__respuesta">
          <p className="dialogo__hablante">{nombreDe(respuesta.speaker)}</p>
          <p className="dialogo__texto">{texto(respuesta.locId)}</p>
          <button
            type="button"
            className="objetivo-tactil boton boton--primario"
            data-principal="true"
            onClick={continuar}
          >
            {TEXTOS_UI.dialogo.continuar}
          </button>
        </div>
      ) : (
        <ul className="decisiones__lista">
          {config.answers.map(({ id, locId, icon }, posicion) => {
            const Icono = esIconoConocido(icon) ? ICONOS[icon] : null;
            return (
              <li key={id}>
                <button
                  type="button"
                  className="objetivo-tactil boton boton--opcion"
                  data-principal={posicion === 0 ? "true" : undefined}
                  onClick={() => setRespondida(true)}
                >
                  {Icono ? (
                    <span className="opcion__icono" aria-hidden="true">
                      <Icono />
                    </span>
                  ) : null}
                  <span>{texto(locId)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
