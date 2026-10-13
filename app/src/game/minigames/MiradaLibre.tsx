// Mirar la isla con calma (`free_look`, escena s01).
//
// El contenido no pide más que esto: quedarse mirando y seguir cuando se
// quiera (`continueTrigger: "tap_star"`, `timeLimitSeconds: null`). No hay
// nada que encontrar ni nada que se pierda por tardar.
//
// Como la escena 3D ya ocupa la pantalla y con el control de Capi se puede
// recorrer el archipiélago, este minijuego no dibuja un mundo propio: se
// aparta y deja una sola manera de continuar, la estrella que el contenido
// nombra como disparador.
//
// El rótulo del botón sale del contenido: es la opción «seguir» del menú de
// pausa que el episodio ya declara, no un texto inventado aquí.

import type { LocId } from "../../engine";
import { ICONOS } from "../ui/icons";

/** `globalUi.pause.options` declara esta opción con el texto «Seguir». */
const LOC_ID_SEGUIR: LocId = "UI_PAUSE_RESUME";

interface MiradaLibreProps {
  readonly texto: (locId: LocId) => string;
  readonly alTerminar: () => void;
}

export function MiradaLibre({ texto, alTerminar }: MiradaLibreProps) {
  const Estrella = ICONOS.icon_star;

  return (
    <section className="minijuego minijuego--mirada">
      <button
        type="button"
        className="objetivo-tactil boton boton--primario"
        data-principal="true"
        onClick={alTerminar}
      >
        <span className="opcion__icono" aria-hidden="true">
          <Estrella />
        </span>
        <span>{texto(LOC_ID_SEGUIR)}</span>
      </button>
    </section>
  );
}
