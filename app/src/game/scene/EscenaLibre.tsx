// El mundo abierto entre episodios (T-001-06, exploración).
//
// Se anda por el archipiélago con Capi y no pasa nada hasta que quien juega
// quiere que pase: al llegar al claro de una isla que tiene episodio aparece
// un solo control para empezarlo. Ni cuenta atrás, ni objetos que recoger, ni
// nada que se pierda por no encontrarlo (Constitución V).
//
// La pantalla está casi vacía a propósito. Lo único que se dibuja encima del
// mundo es ese control, cuando hay algo que ofrecer.
//
// Ruta accesible (AC-8): el mundo 3D va `aria-hidden`, como todo el decorado,
// así que la exploración tiene su equivalente en 2D —la lista de islas con
// episodio— y no hace falta caminar para llegar a ninguna parte. Quien navega
// con teclado o lector de pantalla no depende de la escena, igual que en el
// diálogo.
//
// Aquí no hay ni una palabra de narrativa: los títulos salen del contenido de
// cada episodio y los rótulos, de `textos-ui.ts`.

import { useCallback, useMemo, useRef, useState } from "react";

import type { AgeMode, CastId, LocId } from "../../engine";
import { ENCUENTROS_DE_LA_ISLA } from "../../shared/encuentros";
import { EPISODIOS } from "../../shared/episodios";
import { Conversacion } from "../dialogue/Conversacion";
import { TEXTOS_UI } from "../ui/textos-ui";
import { LienzoDeEscena } from "./LienzoDeEscena";
import { PUNTOS_DE_ENCUENTRO } from "./cercania";
import { encuentrosDelMundo } from "./encuentros-del-mundo";
import { ControlesTactiles } from "./ControlesTactiles";
import {
  GIRO_DE_UN_PASO,
  entradaTactilVacia,
  useControlesEnPantalla,
  type EntradaTactil,
} from "./entrada-tactil";
import type { SenalDelMundo } from "./GameCanvas";
import { soportaWebGL } from "./soporte-webgl";

interface EscenaLibreProps {
  readonly alEmpezarEpisodio: (episodioId: string) => void;
  /** Hace falta para filtrar qué encuentros existen a cada edad (AC-3). */
  readonly ageMode: AgeMode;
}

/**
 * Nombre de un personaje. Se lee del elenco del episodio 1, que es donde el
 * contenido los declara; los encuentros no repiten los nombres para no tener
 * dos sitios donde se llame distinto a la misma persona.
 */
function nombreDelElenco(castId: string): string {
  const registrado = EPISODIOS.find((candidato) => candidato.id === "ep01");
  if (!registrado || !registrado.resultado.ok) return castId;
  const contenido = registrado.resultado.episode;
  const entrada = contenido.cast[castId as CastId];
  if (!entrada) return castId;
  return contenido.localization[contenido.defaultLocale]?.[entrada.displayNameLocId] ?? castId;
}

/** Texto de un encuentro, leído de su propia tabla de localización. */
function textoDeEncuentro(locId: LocId): string {
  if (!ENCUENTROS_DE_LA_ISLA.ok) return locId;
  const contenido = ENCUENTROS_DE_LA_ISLA.contenido;
  return contenido.localization[contenido.defaultLocale]?.[locId] ?? locId;
}

/** Título de un episodio, leído de su propio contenido. */
function tituloDe(episodioId: string): string | null {
  const registrado = EPISODIOS.find((candidato) => candidato.id === episodioId);
  if (!registrado || !registrado.resultado.ok) return null;
  const contenido = registrado.resultado.episode;
  return (
    contenido.localization[contenido.defaultLocale]?.[contenido.titleLocId] ?? contenido.slug
  );
}

/**
 * Islas que se pueden visitar, con el título que trae su episodio. La misma
 * lista alimenta los carteles del mundo y la ruta 2D: no puede haber un
 * cartel que la lista no tenga, ni al revés.
 */
const DESTINOS: readonly SenalDelMundo[] = PUNTOS_DE_ENCUENTRO.flatMap((punto) => {
  const texto = tituloDe(punto.episodioId);
  return texto === null ? [] : [{ ...punto, texto }];
});

export function EscenaLibre({ alEmpezarEpisodio, ageMode }: EscenaLibreProps) {
  // Si no se puede caminar —sin WebGL, o con `prefers-reduced-motion`, que
  // apaga el teclado y el clic al suelo por AC-7—, la lista deja de ser una
  // alternativa y pasa a ser el único camino. Cerrada no lo anunciaba
  // (revisión de content-guardian).
  const hayWebGL = useMemo(() => soportaWebGL(), []);
  /* No basta con preguntar si HAY WebGL al montar: el contexto se puede
     perder a mitad de sesión —una laptop vieja sosteniendo un proyector—, y
     entonces el mundo desaparece. Sin esto, los controles de caminar se
     quedaban montados moviendo a un personaje que ya no se ve, y la lista de
     islas seguía plegada: la pantalla no ofrecía ningún camino (AC-8). */
  const [mundoRetirado, setMundoRetirado] = useState(false);
  const alRetirarseElMundo = useCallback(() => setMundoRetirado(true), []);
  /* «Menos movimiento» ya no quita los controles —ver `useControlDelJugador`—,
     así que aquí solo cuenta si hay mundo por el que andar. */
  const seCaminaPorElMundo = hayWebGL && !mundoRetirado;

  const [cerca, setCerca] = useState<string | null>(null);
  const alCambiarCercania = useCallback((episodioId: string | null) => {
    setCerca(episodioId);
  }, []);

  // Quién vive en el mundo a esta edad, y con quién se está ahora mismo.
  const habitantes = useMemo(() => encuentrosDelMundo(ageMode), [ageMode]);
  const [junto, setJunto] = useState<string | null>(null);
  const [hablandoCon, setHablandoCon] = useState<string | null>(null);
  const alCambiarEncuentro = useCallback((encuentroId: string | null) => {
    setJunto(encuentroId);
  }, []);

  const conversacion = habitantes.find((habitante) => habitante.id === hablandoCon);
  const vecino = habitantes.find((habitante) => habitante.id === junto);

  // Controles en pantalla para tablet y celular. Se montan fuera del
  // envoltorio del lienzo, que va `aria-hidden`: unos botones escondidos de
  // un lector de pantalla serían peores que no tenerlos.
  const hayControlesEnPantalla = useControlesEnPantalla() && seCaminaPorElMundo;
  const entradaTactil = useRef<EntradaTactil>(entradaTactilVacia());
  /* Un dedo sobre los controles tiene que reencender el bucle de render, que
     está en modo `demand`. Es un cambio de estado al empezar y otro al
     soltar, no uno por cuadro. */
  const [tactilActivo, setTactilActivo] = useState(false);
  const girarDeGolpe = useRef<((radianes: number) => void) | null>(null);

  const alCambiarDireccion = useCallback((direccion: EntradaTactil["direccion"]) => {
    entradaTactil.current.direccion = direccion;
    setTactilActivo(direccion !== null || entradaTactil.current.giro !== 0);
  }, []);

  const alGirarCamara = useCallback((giro: -1 | 0 | 1) => {
    entradaTactil.current.giro = giro;
    setTactilActivo(giro !== 0 || entradaTactil.current.direccion !== null);
  }, []);

  const alGirarUnPaso = useCallback((sentido: -1 | 1) => {
    girarDeGolpe.current?.(sentido * GIRO_DE_UN_PASO);
    // Un paso suelto necesita un cuadro para verse; se apaga en cuanto la
    // cámara termina de acomodarse.
    setTactilActivo(true);
    setTactilActivo(false);
  }, []);

  const alTenerGiroDeGolpe = useCallback((girar: (radianes: number) => void) => {
    girarDeGolpe.current = girar;
  }, []);

  /* Elegir una isla en la lista manda a caminar hasta ella; no abre el
     episodio. Abrirlo directamente saltaba el mundo entero, que es lo que se
     quería jugar. Al llegar al claro aparece el botón de entrar, igual que si
     se hubiera llegado andando. */
  const caminarHasta = useRef<((x: number, z: number) => void) | null>(null);
  const alTenerIrA = useCallback((irA: (x: number, z: number) => void) => {
    caminarHasta.current = irA;
  }, []);

  const saltar = useRef<(() => void) | null>(null);
  const alTenerSalto = useCallback((pedir: () => void) => {
    saltar.current = pedir;
  }, []);
  const alSaltar = useCallback(() => {
    saltar.current?.();
  }, []);

  const alElegirIsla = useCallback(
    (destino: SenalDelMundo) => {
      const irA = caminarHasta.current;
      // Sin mundo 3D no hay a dónde caminar: se entra al episodio, que es la
      // ruta 2D de siempre (AC-8).
      if (!irA) {
        alEmpezarEpisodio(destino.episodioId);
        return;
      }
      irA(destino.posicion[0], destino.posicion[1]);
    },
    [alEmpezarEpisodio],
  );

  const tituloCercano = cerca === null ? null : tituloDe(cerca);

  // Bug de superposición (captura real de celular en vertical): el botón de
  // "Hablar con..." / "Empezar aquí" quedaba tapado detrás del joystick y
  // los botones de girar/saltar, ambos pegados al mismo borde inferior de
  // la pantalla. Esta clase es la condición exacta con la que se decide si
  // esos controles están en pantalla —la misma que usa `ControlesTactiles`
  // más abajo—, así que el CSS que reserva espacio para `.mundo__oferta`
  // (`juego.css`) nunca puede desacoplarse de si los controles están de
  // verdad ahí. El `@media` de ese mismo bloque es la red de seguridad para
  // el instante antes de que React monte este estado.
  const claseDelMundo = hayControlesEnPantalla
    ? "mundo mundo--con-controles-tactiles"
    : "mundo";

  return (
    <section className={claseDelMundo} aria-label={TEXTOS_UI.mundo.region}>
      <LienzoDeEscena
        escena={null}
        className="escena escena--mundo"
        alRetirarse={alRetirarseElMundo}
        alCambiarCercania={alCambiarCercania}
        senales={DESTINOS}
        entradaTactil={entradaTactil}
        tactilActivo={tactilActivo}
        alTenerGiroDeGolpe={alTenerGiroDeGolpe}
        alTenerIrA={alTenerIrA}
        alTenerSalto={alTenerSalto}
        encuentros={habitantes}
        alCambiarEncuentro={alCambiarEncuentro}
      />

      {/* Mientras se conversa no se dibujan: no se está andando, y el
          joystick quedaba encima del botón de continuar. */}
      {hayControlesEnPantalla && !conversacion ? (
        <ControlesTactiles
          alCambiarDireccion={alCambiarDireccion}
          alGirarCamara={alGirarCamara}
          alGirarUnPaso={alGirarUnPaso}
          alSaltar={alSaltar}
        />
      ) : null}

      {/* Hablando con alguien, la conversación es lo único que hay en
          pantalla: ni carteles ni ofertas compitiendo con lo que dice. */}
      {conversacion ? (
        <div className="mundo__conversacion">
          <Conversacion
            encuentro={conversacion.encuentro}
            texto={textoDeEncuentro}
            nombreDe={nombreDelElenco}
            alTerminar={() => setHablandoCon(null)}
          />
        </div>
      ) : null}

      {/* Estar al lado de alguien ofrece hablar. Acercarse no abre nada solo:
          abre quien lo pide. */}
      {!conversacion && vecino ? (
        <div className="mundo__oferta">
          <button
            type="button"
            className="objetivo-tactil boton boton--primario"
            data-principal="true"
            onClick={() => setHablandoCon(vecino.id)}
          >
            {TEXTOS_UI.mundo.hablarCon} {nombreDelElenco(vecino.characterId)}
          </button>
        </div>
      ) : null}

      {/* Lo único que se dibuja sobre el mundo, y solo cuando hay algo que
          ofrecer. Acercarse no entra a ningún sitio: entra quien lo pide. */}
      {!conversacion && !vecino && cerca !== null && tituloCercano !== null ? (
        <div className="mundo__oferta">
          <button
            type="button"
            className="objetivo-tactil boton boton--primario"
            data-principal="true"
            onClick={() => alEmpezarEpisodio(cerca)}
          >
            {TEXTOS_UI.mundo.empezarAqui} {tituloCercano}
          </button>
        </div>
      ) : null}

      {/* Ruta 2D: llegar a una isla sin caminar. Plegada, porque caminar es lo
          que se propone; disponible siempre, porque caminar no puede ser el
          único camino. */}
      {conversacion ? null : (
      <footer className="mundo__pie">
        {/* `key` y no `open`: con `open` el `<details>` quedaba controlado y
            React volvía a abrirlo cada render, pisando a quien lo hubiera
            plegado a mano. Así solo se decide el estado inicial, y cuando
            caminar deja de ser posible se remonta ya abierto. */}
        <details
          key={seCaminaPorElMundo ? "caminando" : "sin-caminar"}
          className="mundo__destinos"
          open={!seCaminaPorElMundo}
        >
          <summary className="objetivo-tactil mundo__resumen">{TEXTOS_UI.mundo.irAUnaIsla}</summary>
          <ul className="mundo__lista">
            {DESTINOS.map((destino) => (
              <li key={destino.clave}>
                <button
                  type="button"
                  className="objetivo-tactil boton boton--opcion"
                  onClick={() => alElegirIsla(destino)}
                >
                  {destino.texto}
                </button>
              </li>
            ))}
          </ul>
        </details>
      </footer>
      )}
    </section>
  );
}
