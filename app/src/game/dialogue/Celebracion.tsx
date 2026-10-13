// La celebración del episodio (nodo `reward`, escena s07).
//
// Es cosmética y por completar, nunca por acertar: el contenido lo declara en
// sus propios datos (`conditionalOnPerformance: false`) y el motor lo
// sostiene ignorando todos sus flags, que no están en la allowlist de AC-5.
//
// Por eso esta pantalla no dice qué tan bien se hizo nada, no compara, no
// puntúa y no premia una elección sobre otra (Constitución V). Solo marca que
// el episodio llegó a su final y deja continuar.
//
// Esta pantalla no dice nada. Tenía un «¡Lo lograron juntos!» escrito en
// código y puesto en el sitio del hablante, o sea una línea de diálogo
// inventada y atribuida al elenco; lo bloqueó la revisión de
// content-guardian (AGENTS.md, Constitución IV). La celebración la cuentan la
// escena 3D y la línea que el guion trae justo después; aquí solo queda el
// control para seguir.

import { TEXTOS_UI } from "../ui/textos-ui";

interface CelebracionProps {
  readonly alContinuar: () => void;
}

export function Celebracion({ alContinuar }: CelebracionProps) {
  return (
    <section className="minijuego">
      <button
        type="button"
        className="objetivo-tactil boton boton--primario"
        data-principal="true"
        onClick={alContinuar}
      >
        {TEXTOS_UI.dialogo.continuar}
      </button>
    </section>
  );
}
