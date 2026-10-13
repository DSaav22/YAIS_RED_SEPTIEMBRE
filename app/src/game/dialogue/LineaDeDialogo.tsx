// Una línea de diálogo (T-001-05).
//
// Muestra quién habla, qué dice y los dos únicos controles de una línea:
// repetirla y continuar. El texto viene ya resuelto desde `localization`
// (el runtime lo hace); este componente no conoce ningún locId ni copia
// narrativa alguna.
//
// Accesibilidad (Constitución VII, AC-6):
// - La línea vive en una región `aria-live` para que un lector de pantalla
//   la anuncie al cambiar de nodo sin robar el foco.
// - "Repetir" vacía y vuelve a llenar esa región: una región cuyo contenido
//   no cambia no se vuelve a anunciar. Todavía no hay audio locutado (SPEC-001
//   lo deja fuera del slice), así que esto es literalmente lo que "repetir"
//   puede hacer hoy; en T-001-06 además volverá a disparar el gesto en 3D.
// - Los dos botones usan `.objetivo-tactil` (44x44 mínimo) y el foco visible
//   global de `base.css`.

import { useEffect, useRef } from "react";

import type { LineView } from "../../engine";
import { Personaje } from "../ui/Personaje";
import { TEXTOS_UI } from "../ui/textos-ui";

interface LineaDeDialogoProps {
  readonly vista: LineView;
  /** `globalUi.replayLineButton` del contenido; no se decide en el componente. */
  readonly permiteRepetir: boolean;
  /**
   * Si se dibuja el retrato 2D. Se apaga cuando quien habla ya está en la
   * escena 3D, animado y a tamaño completo: verlo dos veces a la vez no
   * aporta nada y le roba sitio al mundo.
   */
  readonly mostrarRetrato: boolean;
  readonly alContinuar: () => void;
}

/**
 * Escribe el anuncio en la región `aria-live`, vaciándola primero.
 *
 * Es el único lugar de la app que toca el DOM a mano, y es a propósito: una
 * región cuyo contenido no cambia no se vuelve a anunciar, así que "repetir"
 * necesita vaciar y volver a llenar. React no gestiona el contenido de esta
 * región (se renderiza vacía), así que no hay dos dueños del mismo nodo.
 */
function anunciar(region: HTMLElement | null, texto: string): void {
  if (!region) return;
  region.textContent = "";
  // El vaciado y el llenado deben caer en cuadros distintos para que el
  // lector de pantalla note el cambio.
  requestAnimationFrame(() => {
    region.textContent = texto;
  });
}

export function LineaDeDialogo({
  vista,
  permiteRepetir,
  mostrarRetrato,
  alContinuar,
}: LineaDeDialogoProps) {
  const regionRef = useRef<HTMLParagraphElement>(null);
  const anuncio = `${vista.speakerName}: ${vista.text}`;

  useEffect(() => {
    anunciar(regionRef.current, anuncio);
  }, [anuncio]);

  return (
    <div className={mostrarRetrato ? "dialogo" : "dialogo dialogo--sin-retrato"}>
      {mostrarRetrato ? <Personaje castId={vista.speaker} nombre={vista.speakerName} /> : null}

      <div className="dialogo__globo">
        <p className="dialogo__hablante">{vista.speakerName}</p>
        <p className="dialogo__texto">{vista.text}</p>
        <p className="visualmente-oculto" aria-live="polite" aria-atomic="true" ref={regionRef} />
      </div>

      <div className="dialogo__controles">
        {permiteRepetir ? (
          <button
            type="button"
            className="objetivo-tactil boton boton--secundario"
            onClick={() => anunciar(regionRef.current, anuncio)}
          >
            {TEXTOS_UI.dialogo.repetir}
          </button>
        ) : null}
        <button
          type="button"
          className="objetivo-tactil boton boton--primario"
          data-principal="true"
          onClick={alContinuar}
        >
          {TEXTOS_UI.dialogo.continuar}
        </button>
      </div>
    </div>
  );
}
