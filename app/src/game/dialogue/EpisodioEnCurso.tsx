// El episodio en curso (T-001-05).
//
// Es la única pieza que conecta el motor con la pantalla: crea el runtime,
// se suscribe a sus transiciones y decide qué componente presenta cada vista.
// No contiene narrativa ni reglas de navegación; ambas viven, respectivamente,
// en `content/` y en `src/engine`.
//
// La escena 3D de T-001-06 se montará al lado de este mismo estado: por eso
// el runtime no sabe nada de React y esta capa no sabe nada de Three.
//
// Herramientas de desarrollo (selector de escena y salto de nodos sin
// interfaz) solo existen con `import.meta.env.DEV`. En un aula proyectada no
// pueden estar: dejarían cruzar los minijuegos y la escena de Don Beto
// (revisión de content-guardian, T-001-04).

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import {
  crearProgressStore,
  crearRuntime,
  type AgeMode,
  type CastId,
  type EpisodeContent,
  type RuntimeDiagnostic,
} from "../../engine";
import { PRELOADED_CHARACTER_IDS } from "../../shared/assets";
import { crearAlmacenamientoDelNavegador } from "../../shared/browser-storage";
import { SelectorDeEdad } from "../GameShell";
import { EscenaDelEpisodio } from "../scene/EscenaDelEpisodio";
import { soportaWebGL } from "../scene/soporte-webgl";
import { TEXTOS_UI } from "../ui/textos-ui";
import { Minijuego } from "../minigames";
import { AvisoDeDesarrollo } from "./AvisoDeDesarrollo";
import { Celebracion } from "./Celebracion";
import { Decisiones } from "./Decisiones";
import { LineaDeDialogo } from "./LineaDeDialogo";
import { PantallaDeCierre } from "./PantallaDeCierre";

interface EpisodioEnCursoProps {
  readonly episodio: EpisodeContent;
  readonly ageMode: AgeMode;
  /** Cambiarlo reinicia el episodio: ver el comentario de `GameShell`. */
  readonly alCambiarEdad: (modo: AgeMode) => void;
  /**
   * Dejar el episodio y volver al mundo. Es lo que hace el control de parar:
   * parar nunca lleva a una pantalla de castigo ni pierde nada, porque no hay
   * nada que perder (`persistChoices: false`, Constitución V).
   */
  readonly alSalirAlMundo: () => void;
}

/**
 * Oculta el selector de «Grupo de edad» de la barra del adulto en lo que se
 * despliega, a pedido explícito para la demo del 2026-09-18.
 *
 * Importante, y por eso no es simplemente `false`: `GameShell.tsx` no tiene
 * ninguna otra pantalla para elegir el modo de edad («al juego, sin pantalla
 * de inicio», dice su propio comentario de cabecera; `ageMode` arranca fijo
 * en `"6-8"`). Este control de aquí es la ÚNICA forma de llegar a 9-12 en
 * toda la app, no un atajo redundante. Ocultarlo con un `false` a secas
 * dejaría el juego encerrado en 6-8 para siempre, sin manera de volver a ver
 * el contenido de 9-12 ni de probar el filtro de edad (AC-3) jugando.
 *
 * Por eso se ata a `import.meta.env.DEV`: oculto en lo que se construye para
 * producción (lo que ve quien presenta el demo), disponible en
 * `npm run dev` y en los tests, donde `DEV` es `true`. Si la demo necesita
 * mostrar 9-12 en algún momento, esto no alcanza — avisar antes de la demo,
 * no durante.
 */
const MOSTRAR_SELECTOR_DE_EDAD_EN_LA_BARRA = import.meta.env.DEV;

/** Los diagnósticos se quedan en el dispositivo y solo en desarrollo (AC-9). */
function registrarDiagnostico(diagnostico: RuntimeDiagnostic): void {
  if (import.meta.env.DEV) {
    console.warn(`[runtime] ${diagnostico.code} en ${diagnostico.path}: ${diagnostico.message}`);
  }
}

export function EpisodioEnCurso({
  episodio,
  ageMode,
  alCambiarEdad,
  alSalirAlMundo,
}: EpisodioEnCursoProps) {
  // Un runtime por sesión de juego. Cambiar el modo de edad empieza una
  // sesión nueva: no se puede cambiar a mitad de episodio.
  const runtime = useMemo(
    () =>
      crearRuntime(episodio, {
        ageMode,
        progress: crearProgressStore(crearAlmacenamientoDelNavegador()),
        onDiagnostic: registrarDiagnostico,
      }),
    [episodio, ageMode],
  );

  const vista = useSyncExternalStore(runtime.suscribir, runtime.vista);
  const estado = useSyncExternalStore(runtime.suscribir, runtime.estado);

  // Si el personaje que habla ya está en la escena 3D, el retrato 2D sobra:
  // sería el mismo personaje dos veces en la misma pantalla. Vuelve en cuanto
  // la escena se retira, porque entonces hace falta algo que lo muestre.
  const [escena3DViva, setEscena3DViva] = useState(() => soportaWebGL());
  const retirarEscena = useCallback(() => setEscena3DViva(false), []);
  const hablanteEnEscena =
    escena3DViva &&
    vista.kind === "line" &&
    (PRELOADED_CHARACTER_IDS as readonly string[]).includes(vista.speaker);

  // El foco sigue al contenido: al cambiar de nodo se lleva al control
  // principal de la pantalla nueva, para que quien navega con teclado no
  // tenga que buscarlo (Constitución VII).
  const regionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const region = regionRef.current;
    if (!region) return;
    const principal =
      region.querySelector<HTMLElement>("[data-principal='true']") ??
      region.querySelector<HTMLElement>("button");
    principal?.focus();
  }, [estado.nodeId]);

  const avanzar = useCallback(() => {
    runtime.avanzar();
  }, [runtime]);
  const elegir = useCallback(
    (optionId: string) => {
      runtime.elegir(optionId);
    },
    [runtime],
  );
  const saltar = useCallback(() => {
    runtime.saltarNodoNoImplementado();
  }, [runtime]);
  const terminarMinijuego = useCallback(
    (nodeId?: string) => {
      runtime.terminarMinijuego(nodeId);
    },
    [runtime],
  );

  /** Nombre de un personaje, resuelto desde el contenido. */
  const nombreDe = useCallback(
    (castId: CastId) => {
      const entrada = episodio.cast[castId];
      return entrada ? runtime.texto(entrada.displayNameLocId) : castId;
    },
    [episodio, runtime],
  );

  const pausa = episodio.globalUi.pause;
  /* `map`, no `quit`: el botón devuelve al mundo, y el guion ya trae para eso
     una opción con su propio texto validado. Usar el de «Terminar por hoy»
     habría sido prometer que la sesión acaba cuando lo que hace es volver al
     mapa (revisión de content-guardian). */
  const opcionDeVolver = pausa.options.find((opcion) => opcion.id === "map");

  return (
    <section className="episodio" aria-label={TEXTOS_UI.dialogo.regionEpisodio}>
      {/* Mejora progresiva: si no hay WebGL o el 3D falla, esto no renderiza
          nada y el episodio se juega igual en 2D (AC-8). */}
      <EscenaDelEpisodio vista={vista} estado={estado} alRetirarse={retirarEscena} />

      <div className="episodio__contenido" ref={regionRef}>
        {vista.kind === "line" ? (
          <LineaDeDialogo
            vista={vista}
            permiteRepetir={episodio.globalUi.replayLineButton}
            mostrarRetrato={!hablanteEnEscena}
            alContinuar={avanzar}
          />
        ) : null}

        {vista.kind === "choice" ? (
          <Decisiones vista={vista} alElegir={elegir} />
        ) : null}

        {vista.kind === "minigame" ? (
          <Minijuego
            vista={vista}
            ageMode={ageMode}
            texto={runtime.texto}
            nombreDe={nombreDe}
            alTerminar={terminarMinijuego}
          />
        ) : null}

        {vista.kind === "reward" ? (
          <Celebracion alContinuar={runtime.terminarRecompensa} />
        ) : null}

        {vista.kind === "end" ? (
          <PantallaDeCierre
            vista={vista}
            ageMode={ageMode}
            texto={runtime.texto}
            alVolverAJugar={alSalirAlMundo}
          />
        ) : null}

        {vista.kind === "unimplemented" ? (
          <AvisoDeDesarrollo
            titulo={TEXTOS_UI.desarrollo.nodoSinInterfaz}
            diagnosticos={[vista.diagnostic]}
            alSaltar={vista.puedeSaltarse ? saltar : undefined}
          />
        ) : null}

        {vista.kind === "error" ? (
          <AvisoDeDesarrollo
            titulo={TEXTOS_UI.desarrollo.errorDeNavegacion}
            diagnosticos={[vista.diagnostic]}
          />
        ) : null}
      </div>

      {/* Barra de quien acompaña. Parar es siempre posible y nunca cuesta
          nada (Constitución V); el rótulo viene del contenido, no de la
          interfaz. El grupo de edad vive aquí porque es decisión del adulto,
          no del niño, y cambiarlo reinicia el episodio.

          Durante una decisión o un minijuego se queda solo el botón de parar:
          en ambos casos la pantalla ya le está pidiendo algo al niño —elegir
          entre varias tarjetas, colocar una ficha, responder una pregunta— y
          los controles del adulto son ruido compitiendo justo debajo de esas
          opciones (reporte de usuario: la barra se veía "muy sobrecargada"
          encima de un minijuego de dos opciones grandes). Lo que NO se retira
          es parar, aunque se pidiera quitar la barra entera: el momento de
          responder algo es justamente cuando hace falta poder irse, y el
          contenido declara `pause.alwaysVisible: true` (Constitución V).

          La celebración (`reward`) no se reduce: ahí ya no hay ninguna
          decisión ni respuesta pendiente —es una sola pantalla con un botón
          para seguir—, así que el texto de pausa y el selector de edad no
          compiten con nada y caben sin agobiar. */}
      {/* En el cierre no se dibuja: el episodio ya terminó, «Podemos parar
          cuando quieras» no significa nada ahí, y la pantalla de cierre ya
          trae su propio control para volver al mapa. Dejarlo ponía el mismo
          botón dos veces en la misma pantalla. */}
      {pausa.alwaysVisible && vista.kind !== "end" ? (
        <footer
          className={
            vista.kind === "choice" || vista.kind === "minigame"
              ? "episodio__pie barra-adulto barra-adulto--minima"
              : "episodio__pie barra-adulto"
          }
        >
          {vista.kind === "choice" || vista.kind === "minigame" ? null : (
            <>
              <p className="episodio__pausa-texto">{runtime.texto(pausa.promptLocId)}</p>

              {/* El grupo de edad se toca una vez por sesión: plegado, deja de
                  competir por atención con lo que sí se usa en cada línea.
                  Ver `MOSTRAR_SELECTOR_DE_EDAD_EN_LA_BARRA` arriba: oculto
                  para la demo. */}
              {MOSTRAR_SELECTOR_DE_EDAD_EN_LA_BARRA ? (
                <details className="barra-adulto__ajustes">
                  <summary className="objetivo-tactil barra-adulto__resumen">
                    {TEXTOS_UI.adulto.grupoDeEdad}
                  </summary>
                  <SelectorDeEdad ageMode={ageMode} alCambiarEdad={alCambiarEdad} />
                </details>
              ) : null}
            </>
          )}

          <button
            type="button"
            className="objetivo-tactil boton boton--secundario"
            onClick={alSalirAlMundo}
          >
            {opcionDeVolver ? runtime.texto(opcionDeVolver.locId) : TEXTOS_UI.mundo.volverAlMapa}
          </button>
        </footer>
      ) : null}

      {import.meta.env.DEV ? (
        <SelectorDeEscenaDeDesarrollo
          episodio={episodio}
          sceneIdActual={estado.sceneId}
          alIrAEscena={(sceneId) => runtime.irAEscena(sceneId)}
        />
      ) : null}
    </section>
  );
}

interface SelectorDeEscenaProps {
  readonly episodio: EpisodeContent;
  readonly sceneIdActual: string;
  readonly alIrAEscena: (sceneId: string) => void;
}

/**
 * Selector de escena. Existe solo en desarrollo porque el saludo de Capi
 * queda detrás de dos minijuegos que todavía no tienen interfaz; no forma
 * parte de la experiencia publicada (spec.md, «Aclaración de implementación»).
 */
function SelectorDeEscenaDeDesarrollo({
  episodio,
  sceneIdActual,
  alIrAEscena,
}: SelectorDeEscenaProps) {
  return (
    <aside className="herramientas-desarrollo">
      {/* Plegado: en desarrollo hace falta a mano, pero abierto se come una
          esquina del mundo en cada captura y en cada demo. */}
      <details>
        <summary className="herramientas-desarrollo__etiqueta">
          {TEXTOS_UI.desarrollo.etiqueta}
        </summary>
        {/* Etiqueta y control como hermanos, no anidados: una `<label>` que
            envuelve un `<select>` arrastra el texto de las opciones al nombre
            accesible del control en algunos navegadores. */}
        <div className="herramientas-desarrollo__campo">
          <label htmlFor="selector-de-escena">{TEXTOS_UI.desarrollo.selectorDeEscena}</label>
          <select
            id="selector-de-escena"
            value={sceneIdActual}
            onChange={(evento) => alIrAEscena(evento.target.value)}
          >
            {episodio.scenes.map((scene) => (
              <option key={scene.id} value={scene.id}>
                {scene.id}
              </option>
            ))}
          </select>
        </div>
      </details>
    </aside>
  );
}
