// Los minijuegos del episodio (T-001-06, más allá de SPEC-001).
//
// Un componente por minijuego y un repartidor que elige según el
// `minigameId` del contenido. El motor no sabe jugar ninguno: entrega el nodo
// con su configuración y espera a que la interfaz diga que terminó.
//
// Lo que todos comparten, y no es negociable:
//
// - Ninguno se puede perder. No hay acierto, error, puntaje, contador ni
//   tiempo (Constitución V). El contenido lo dice en sus propios datos:
//   `anyAnswerValid`, `anyOrderValid`, `speedRequired: false`.
// - Todo el texto sale de `content/`. Lo único escrito en código son los
//   rótulos de interfaz de `textos-ui.ts`, y están marcados como pendientes
//   de validación igual que el resto.
// - Se puede parar siempre.
//
// SPEC-001 manda los minijuegos a SPEC-004; esto es un prototipo para que el
// episodio se pueda recorrer entero, no la versión final de ninguno.

import type { AgeMode, CastId, LocId, MinigameView } from "../../engine";

import { BrujulaCorporal } from "./BrujulaCorporal";
import { CirculoDeTres } from "./CirculoDeTres";
import { FichasDeConfianza } from "./FichasDeConfianza";
import { MiradaLibre } from "./MiradaLibre";
import { RitmoDeChoque } from "./RitmoDeChoque";
import { TablasDelPuente } from "./TablasDelPuente";

interface MinijuegoProps {
  readonly vista: MinigameView;
  /** Hace falta para filtrar fichas y zonas por edad (AC-3). */
  readonly ageMode: AgeMode;
  readonly texto: (locId: LocId) => string;
  readonly nombreDe: (castId: CastId) => string;
  /** Sin argumento continúa por el `next` del nodo; con uno, va a ese nodo. */
  readonly alTerminar: (nodeId?: string) => void;
}

export function Minijuego({ vista, ageMode, texto, nombreDe, alTerminar }: MinijuegoProps) {
  const nodo = vista.node;

  switch (nodo.minigameId) {
    case "free_look":
      return <MiradaLibre texto={texto} alTerminar={() => alTerminar()} />;
    case "body_compass_practice":
      return (
        <BrujulaCorporal
          config={nodo.config}
          texto={texto}
          nombreDe={nombreDe}
          alTerminar={() => alTerminar()}
        />
      );
    case "high_five_rhythm":
      return <RitmoDeChoque config={nodo.config} texto={texto} alTerminar={alTerminar} />;
    case "trust_cards":
      return (
        <FichasDeConfianza
          config={nodo.config}
          ageMode={ageMode}
          texto={texto}
          nombreDe={nombreDe}
          alTerminar={() => alTerminar()}
        />
      );
    case "circle_of_three":
      return (
        <CirculoDeTres
          config={nodo.config}
          texto={texto}
          nombreDe={nombreDe}
          alTerminar={() => alTerminar()}
        />
      );
    case "bridge_planks":
      return (
        <TablasDelPuente config={nodo.config} texto={texto} alTerminar={() => alTerminar()} />
      );
    default:
      // El esquema no deja llegar aquí: la unión de minijuegos está cerrada.
      // Si el contenido trae uno nuevo, se continúa en vez de romper.
      return null;
  }
}
