// Retrato 2D de quien habla (T-001-05).
//
// Es la ruta base de la experiencia, no un placeholder del 3D: si WebGL
// falla o el dispositivo no lo soporta, esto es lo que se ve (AC-8). La
// escena R3F de T-001-06 se monta al lado consumiendo el mismo estado.
//
// Solo Capi y Tomi tienen arte sincronizado en este hito
// (`PRELOADED_CHARACTER_IDS`): el resto del elenco aparece con su silueta y
// su nombre, nunca con una imagen rota ni con un GLB que no debe
// descargarse todavía (PLAN-001).

import { CHARACTERS, PRELOADED_CHARACTER_IDS, type CharacterId } from "../../shared/assets";

interface PersonajeProps {
  /** Quién habla. `all` (el elenco completo) no tiene retrato propio. */
  readonly castId: CharacterId | "all";
  /** Nombre ya resuelto desde `localization`; nunca un rótulo escrito en código. */
  readonly nombre: string;
}

// El retrato no lleva pie de foto: el nombre de quien habla ya está escrito
// justo al lado, encima de su línea. Ponerlo dos veces obligaba a leerlo dos
// veces, y con lector de pantalla a escucharlo dos veces.

function tieneArteSincronizado(castId: CharacterId | "all"): castId is CharacterId {
  return castId !== "all" && PRELOADED_CHARACTER_IDS.includes(castId);
}

export function Personaje({ castId, nombre }: PersonajeProps) {
  if (tieneArteSincronizado(castId)) {
    return (
      <img
        className="personaje personaje__retrato"
        src={CHARACTERS[castId].posterUrl}
        // Decorativa: el nombre está al lado como texto real.
        alt=""
        width={160}
        height={160}
        decoding="async"
      />
    );
  }

  return (
    <span className="personaje personaje__retrato personaje__retrato--sin-arte" aria-hidden="true">
      {nombre.slice(0, 1)}
    </span>
  );
}
