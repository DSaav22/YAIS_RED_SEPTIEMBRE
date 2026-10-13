// Pantalla de cierre del episodio (T-001-05, AC-5).
//
// Cierra por el camino que sea: no hay final "bueno" ni "malo", ni resumen
// de lo que el niño eligió, ni puntaje (Constitución V). Lo único que
// sobrevivió a la sesión es `ep01.completed`, y lo escribió el motor al
// entrar a este nodo.
//
// El pie del debrief es material para la persona adulta que acompaña
// (`debriefScreen.adultOnly` en el contenido): se muestra en la misma
// pantalla porque el escenario real es un aula con un solo dispositivo
// proyectado, y va marcado como tal. Las preguntas se filtran por modo de
// edad igual que cualquier otro contenido (AC-3).

import { isVisibleForAgeMode, type AgeMode, type EndView, type LocId } from "../../engine";
import { TEXTOS_UI } from "../ui/textos-ui";

interface PantallaDeCierreProps {
  readonly vista: EndView;
  readonly ageMode: AgeMode;
  readonly texto: (locId: LocId) => string;
  readonly alVolverAJugar: () => void;
}

export function PantallaDeCierre({
  vista,
  ageMode,
  texto,
  alVolverAJugar,
}: PantallaDeCierreProps) {
  const debrief = vista.node.debriefScreen;
  const preguntas = (debrief?.adultQuestionsLocIds ?? []).filter((locId) =>
    isVisibleForAgeMode(debrief?.adultQuestionsAgeModes?.[locId], ageMode),
  );

  return (
    <section className="cierre" aria-labelledby="cierre-titulo">
      <h2 className="cierre__titulo" id="cierre-titulo">
        {debrief ? texto(debrief.titleLocId) : TEXTOS_UI.cierre.volverAlMapa}
      </h2>

      {debrief ? <p className="cierre__mensaje">{texto(debrief.childLocId)}</p> : null}

      {debrief ? (
        <section className="cierre__adulto" aria-labelledby="cierre-adulto-titulo">
          <h3 className="cierre__adulto-titulo" id="cierre-adulto-titulo">
            {TEXTOS_UI.cierre.paraLaPersonaAdulta}
          </h3>

          {preguntas.length > 0 ? (
            <>
              <h4 className="cierre__subtitulo">{TEXTOS_UI.cierre.preguntas}</h4>
              <ul>
                {preguntas.map((locId) => (
                  <li key={locId}>{texto(locId)}</li>
                ))}
              </ul>
            </>
          ) : null}

          <h4 className="cierre__subtitulo">{TEXTOS_UI.cierre.actividad}</h4>
          <p>{texto(debrief.activityLocId)}</p>

          {debrief.familyLocIds.length > 0 ? (
            <>
              <h4 className="cierre__subtitulo">{TEXTOS_UI.cierre.enFamilia}</h4>
              <ul>
                {debrief.familyLocIds.map((locId) => (
                  <li key={locId}>{texto(locId)}</li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}

      <div className="dialogo__controles">
        <button
          type="button"
          className="objetivo-tactil boton boton--primario"
          data-principal="true"
          onClick={alVolverAJugar}
        >
          {TEXTOS_UI.cierre.volverAlMapa}
        </button>
      </div>
    </section>
  );
}
