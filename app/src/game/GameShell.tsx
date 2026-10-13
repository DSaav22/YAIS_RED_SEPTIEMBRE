// Shell del juego (T-001-05, replanteado en T-001-06).
//
// Dos estados: contenido que no valida, y episodio en curso. Se entra directo
// al juego, sin pantalla de inicio.
//
// Hay más de un episodio. Cuál se juega lo elige quien acompaña desde la
// barra de abajo, con el título que cada episodio trae en su propio
// contenido. No hay progresión automática de uno a otro: el episodio 1
// declara `ep02.unlocked` como flag persistente, pero SPEC-001 AC-5 solo
// permite guardar `ep01.completed`, así que encadenarlos de verdad exige
// primero una decisión de spec sobre qué puede sobrevivir a la sesión. El distintivo de borrador se dibuja aquí,
// fuera del conmutador, para que esté en los dos (AC-10, Constitución IV).
//
// El modo de edad vive aquí porque decide qué nodos y opciones existen (AC-3).
// Lo elige quien acompaña desde la barra de abajo, y cambiarlo reinicia el
// episodio: alterar a media conversación qué opciones se ven sería peor que
// volver a empezar. No se guarda en ningún sitio, ni aquí ni en el
// dispositivo.

import { useCallback, useState } from "react";

import type { AgeMode } from "../engine";
import { EPISODIOS } from "../shared/episodios";
import { AvisoDeDesarrollo } from "./dialogue/AvisoDeDesarrollo";
import { EpisodioEnCurso } from "./dialogue/EpisodioEnCurso";
import { EscenaLibre } from "./scene/EscenaLibre";
import { DistintivoBorrador } from "./ui/DistintivoBorrador";
import { TEXTOS_UI } from "./ui/textos-ui";

const MODOS_DE_EDAD: readonly { readonly id: AgeMode; readonly etiqueta: string }[] = [
  { id: "6-8", etiqueta: TEXTOS_UI.inicio.edad68 },
  { id: "9-12", etiqueta: TEXTOS_UI.inicio.edad912 },
];

export default function GameShell() {
  const [ageMode, setAgeMode] = useState<AgeMode>("6-8");
  /**
   * `null` significa que no hay episodio y se está explorando. Se entra por
   * ahí: el mundo es el sitio del que se sale hacia los episodios y al que se
   * vuelve, no una pantalla de menú.
   */
  const [episodioId, setEpisodioId] = useState<string | null>(null);

  const volverAlMundo = useCallback(() => setEpisodioId(null), []);

  if (episodioId === null) return <Mundo alEmpezarEpisodio={setEpisodioId} ageMode={ageMode} />;

  const elegido = EPISODIOS.find((candidato) => candidato.id === episodioId) ?? EPISODIOS[0];

  // AC-1: si el contenido no valida, un error de desarrollo legible en vez de
  // una pantalla en blanco. La app no arranca el episodio en ese caso.
  if (!elegido || !elegido.resultado.ok) {
    return (
      <main className="shell">
        <DistintivoBorrador />
        <AvisoDeDesarrollo
          titulo={TEXTOS_UI.desarrollo.errorDeContenido}
          diagnosticos={(elegido?.resultado.ok === false ? elegido.resultado.issues : []).map(
            (issue) => ({
              code: "navegacion-rota" as const,
              path: issue.path,
              message: issue.message,
            }),
          )}
        />
      </main>
    );
  }

  const episodio = elegido.resultado.episode;
  const titulo = episodio.localization[episodio.defaultLocale]?.[episodio.titleLocId] ?? episodio.slug;

  return (
    <main className="shell shell--juego">
      {/* Encabezado flotante. Lo único que se ve es el distintivo, que no
          puede apagarse (AC-10). El título del episodio se queda como `h1`
          —hace falta para la estructura de encabezados y para quien navega
          con lector de pantalla— pero no se dibuja: en pantalla era un rótulo
          permanente que no cambia nunca, ocupando sitio del mundo. */}
      <header className="shell__encabezado shell__encabezado--flotante">
        <DistintivoBorrador />
        <h1 className="shell__titulo shell__titulo--juego visualmente-oculto">{titulo}</h1>
      </header>

      <EpisodioEnCurso
        episodio={episodio}
        ageMode={ageMode}
        alCambiarEdad={setAgeMode}
        alSalirAlMundo={volverAlMundo}
      />
    </main>
  );
}

/**
 * El mundo abierto, con el mismo distintivo de borrador que todo lo demás: no
 * se apaga por estar fuera de un episodio (AC-10).
 */
function Mundo({
  alEmpezarEpisodio,
  ageMode,
}: {
  readonly alEmpezarEpisodio: (id: string) => void;
  readonly ageMode: AgeMode;
}) {
  return (
    <main className="shell shell--juego">
      {/* El `h1` no se dibuja —en pantalla sería un rótulo permanente que no
          cambia nunca, ocupando sitio del mundo— pero existe: hace falta para
          la estructura de encabezados y para quien navega con lector de
          pantalla. */}
      <header className="shell__encabezado shell__encabezado--flotante">
        <DistintivoBorrador />
        <h1 className="shell__titulo shell__titulo--juego visualmente-oculto">
          {TEXTOS_UI.mundo.region}
        </h1>
      </header>
      <EscenaLibre alEmpezarEpisodio={alEmpezarEpisodio} ageMode={ageMode} />
    </main>
  );
}

/** Control de quien acompaña: por qué grupo de edad se está jugando (AC-3). */
export function SelectorDeEdad({
  ageMode,
  alCambiarEdad,
}: {
  readonly ageMode: AgeMode;
  readonly alCambiarEdad: (modo: AgeMode) => void;
}) {
  return (
    <fieldset className="barra-adulto__edades">
      <legend className="visualmente-oculto">{TEXTOS_UI.inicio.leyendaEdad}</legend>
      {MODOS_DE_EDAD.map((modo) => (
        <label key={modo.id} className="objetivo-tactil barra-adulto__edad">
          <input
            type="radio"
            name="modo-de-edad"
            value={modo.id}
            checked={ageMode === modo.id}
            onChange={() => alCambiarEdad(modo.id)}
          />
          <span>{modo.etiqueta}</span>
        </label>
      ))}
    </fieldset>
  );
}
