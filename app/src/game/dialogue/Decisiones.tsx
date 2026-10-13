// Las decisiones de una escena (T-001-05).
//
// La pregunta que encabeza una decisión NO se escribe aquí: es la línea que
// el guion pone justo antes (por ejemplo `s03_n002`, «¿Cómo quieres
// saludarme?»), que se mantiene en pantalla mientras el niño elige. Antes
// este componente mostraba un rótulo propio y el niño dejaba de ver la
// pregunta del contenido justo en el momento de decidir: eso es contenido
// infantil escrito en código, y lo bloqueó la revisión de content-guardian
// (AGENTS.md; Constitución IV).
//
// Cada opción es una tarjeta con el icono grande arriba y el texto debajo,
// como la pantalla de saludo de `assets/concepts/isla-acuerdos-core-screens.png`.
// El icono se dibuja como SVG en código: las láminas son brief de arte y no se
// recortan ni se sirven como UI (assets/concepts/ASSET-INVENTORY.md).
//
// Nunca solo icono y nunca solo color: la forma del icono, el texto y el orden
// son tres señales distintas (Constitución VII). El icono va `aria-hidden`
// porque el texto de la tarjeta ya es su nombre accesible; repetirlo obligaría
// a escucharlo dos veces. El disco de color detrás del icono es decoración.
//
// No hay opción correcta ni incorrecta: aquí no existe estado de acierto, ni
// de error, ni marca de intento (Constitución V, AC-2 y AC-4). Elegir otra
// vez es simplemente volver a pulsar.

import type { ChoiceView } from "../../engine";
import { ICONOS, type IconId } from "../ui/icons";

interface DecisionesProps {
  readonly vista: ChoiceView;
  readonly alElegir: (optionId: string) => void;
}

function esIconoConocido(id: string): id is IconId {
  return Object.prototype.hasOwnProperty.call(ICONOS, id);
}

export function Decisiones({ vista, alElegir }: DecisionesProps) {
  // La pregunta la trae la vista desde el motor: es la última línea que se
  // mostró en esta escena, no un rótulo de la interfaz.
  const pregunta = vista.precedingLine;
  const idPregunta = `decision-${vista.node.id}-pregunta`;

  return (
    // `role="group"` y no el `region` implícito de `<section>` con nombre:
    // cada decisión es un grupo de controles relacionados, no una zona de la
    // página. Llenar la lista de puntos de referencia con una región por
    // decisión estorbaría a quien navega por landmarks.
    //
    // El grupo se nombra con la línea del guion cuando existe. Si no existe
    // (se entró directo a la decisión con el selector de escena de
    // desarrollo), queda sin nombre: inventarle uno sería volver a poner
    // texto para un niño en el código.
    <section
      className="decisiones"
      role="group"
      {...(pregunta ? { "aria-labelledby": idPregunta } : {})}
    >
      {pregunta ? (
        <div className="decisiones__pregunta">
          <p className="dialogo__hablante">{pregunta.speakerName}</p>
          {/* La pregunta del guion es además el encabezado de la pantalla.
              Al quitar el rótulo inventado, la decisión se quedó sin ningún
              encabezado y quien navega con la tecla H perdía el tramo central
              del episodio (revisión de a11y-perf-reviewer). Se marca como
              `h2` el texto que ya estaba, sin escribir texto nuevo. */}
          <h2 className="dialogo__texto" id={idPregunta}>
            {pregunta.text}
          </h2>
        </div>
      ) : null}

      <ul className="decisiones__lista">
        {vista.options.map(({ option, text }, indice) => {
          const Icono = esIconoConocido(option.icon) ? ICONOS[option.icon] : null;
          return (
            <li key={option.id}>
              <button
                type="button"
                className="objetivo-tactil boton boton--opcion"
                data-principal={indice === 0 ? "true" : undefined}
                onClick={() => alElegir(option.id)}
              >
                {Icono ? (
                  <span className="opcion__icono" aria-hidden="true">
                    <Icono />
                  </span>
                ) : null}
                <span>{text}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
