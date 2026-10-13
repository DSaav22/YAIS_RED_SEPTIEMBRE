// Fichas de confianza (`trust_cards`, episodio 2, escena s02).
//
// Cada ficha dice una conducta —«Te escucha cuando hablas»— y se coloca en
// una zona: «Eso es cuidar», «Eso no es cuidar» o, en 9-12, «No sé, lo
// pregunto». Las fichas hablan de **conductas, nunca de personas**: eso es lo
// que hace que el episodio no enseñe a clasificar gente (Constitución III).
//
// No se puede perder. Si la ficha va a la zona que el guion no esperaba, Capi
// no dice que esté mal: pregunta cómo se sentiría la brújula. Al segundo
// desvío da una pista, y el guion prevé que al tercero la coloque él y lo
// explique. Nunca hay bloqueo ni sonido de error (Constitución V).
//
// Nada de lo que el niño clasifica se guarda: el contenido declara
// `storeAnswers: false` y el esquema exige que sea exactamente `false`.
//
// Todo el texto sale de `content/`: fichas, zonas y las cinco respuestas de
// Capi.

import { useState } from "react";

import { isVisibleForAgeMode, type AgeMode, type CastId, type LocId, type TrustCardsConfig } from "../../engine";
import { ICONOS, type IconId } from "../ui/icons";
import { TEXTOS_UI } from "../ui/textos-ui";

interface FichasDeConfianzaProps {
  readonly config: TrustCardsConfig;
  readonly ageMode: AgeMode;
  readonly texto: (locId: LocId) => string;
  readonly nombreDe: (castId: CastId) => string;
  readonly alTerminar: () => void;
}

function esIconoConocido(id: string): id is IconId {
  return Object.prototype.hasOwnProperty.call(ICONOS, id);
}

/** Cuántos desvíos con la misma ficha antes de que Capi dé la pista. */
const DESVIOS_ANTES_DE_LA_PISTA = 1;

/**
 * Al tercer desvío Capi coloca la ficha él y lo explica. Lo pide el guion con
 * esas palabras, y es lo que garantiza que el minijuego siempre avance: sin
 * esto, una ficha que el niño lee distinto lo dejaba dando vueltas para
 * siempre. Nunca hay bloqueo (Constitución V).
 */
const DESVIOS_ANTES_DE_QUE_CAPI_LA_COLOQUE = 2;

export function FichasDeConfianza({
  config,
  ageMode,
  texto,
  nombreDe,
  alTerminar,
}: FichasDeConfianzaProps) {
  const fichas = config.cards.filter((ficha) => isVisibleForAgeMode(ficha.ageModes, ageMode));
  const zonas = config.zones.filter((zona) => isVisibleForAgeMode(zona.ageModes, ageMode));

  const [colocadas, setColocadas] = useState<readonly string[]>([]);
  const [desvios, setDesvios] = useState(0);
  const [respuesta, setRespuesta] = useState<{ locId: LocId; speaker: CastId } | null>(null);

  const pendientes = fichas.filter((ficha) => !colocadas.includes(ficha.id));
  const ficha = pendientes[0];

  function colocar(zonaId: string): void {
    if (!ficha) return;

    const acertoLaZona = ficha.anyZoneValid || ficha.expectedZone === zonaId;
    if (!acertoLaZona) {
      // No es un error: es una pregunta, luego una pista, y al tercer intento
      // Capi la coloca y lo explica.
      const siguiente = desvios + 1;
      if (siguiente > DESVIOS_ANTES_DE_QUE_CAPI_LA_COLOQUE) {
        setRespuesta({ locId: config.feedbackHint.locId, speaker: config.feedbackHint.speaker });
        setColocadas((previas) => [...previas, ficha.id]);
        setDesvios(0);
        return;
      }
      setDesvios(siguiente);
      const reaccion =
        siguiente > DESVIOS_ANTES_DE_LA_PISTA ? config.feedbackHint : config.feedbackUnexpected;
      setRespuesta({ locId: reaccion.locId, speaker: reaccion.speaker });
      return;
    }

    const reaccion = ficha.anyZoneValid
      ? config.feedbackAnyZone
      : (config.feedbackByZone[zonaId] ?? config.feedbackUnexpected);
    setRespuesta({ locId: reaccion.locId, speaker: reaccion.speaker });
    setColocadas((previas) => [...previas, ficha.id]);
    setDesvios(0);
  }

  function continuar(): void {
    setRespuesta(null);
    if (pendientes.length === 0) alTerminar();
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
          onClick={continuar}
        >
          {TEXTOS_UI.dialogo.continuar}
        </button>
      </section>
    );
  }

  if (!ficha) {
    return (
      <section className="minijuego">
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
    <section className="minijuego" aria-labelledby="ficha-actual">
      {/* La ficha es el encabezado: es lo que hay que leer y decidir. */}
      <h2 className="dialogo__texto" id="ficha-actual">
        {texto(ficha.locId)}
      </h2>

      <ul className="decisiones__lista">
        {zonas.map((zona, posicion) => {
          const Icono = esIconoConocido(zona.icon) ? ICONOS[zona.icon] : null;
          return (
            <li key={zona.id}>
              <button
                type="button"
                className="objetivo-tactil boton boton--opcion"
                data-principal={posicion === 0 ? "true" : undefined}
                onClick={() => colocar(zona.id)}
              >
                {Icono ? (
                  <span className="opcion__icono" aria-hidden="true">
                    <Icono />
                  </span>
                ) : null}
                <span>{texto(zona.locId)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
