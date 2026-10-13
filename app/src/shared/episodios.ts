// Los episodios versionados del juego.
//
// El contenido se lee desde `content/`, nunca se copia dentro de un
// componente (AGENTS.md). Se importan como módulos, así que viajan dentro del
// paquete: la demo del aula funciona sin Internet y sin ninguna petición de
// red (SPEC-001 AC-9).
//
// Cada episodio se valida aquí, una sola vez, antes de que ningún componente
// lo vea: si un JSON no cumple el esquema, la app muestra un error de
// desarrollo legible en vez de una pantalla en blanco (AC-1).
//
// Añadir el episodio 3 es añadir una línea a esta lista. Los tests de
// `schema.test.ts` y `animation-intents.test.ts` recorren la carpeta entera,
// así que un episodio nuevo queda cubierto sin tocar ningún test.

import contenidoEp01 from "../../../content/episodes/ep01-saludo.json";
import contenidoEp02 from "../../../content/episodes/ep02-circulo.json";

import { validateEpisodeContent, type EpisodeValidationResult } from "../engine";

export interface EpisodioRegistrado {
  /** Id estable para la interfaz; el del contenido es la fuente de verdad. */
  readonly id: string;
  readonly resultado: EpisodeValidationResult;
}

export const EPISODIOS: readonly EpisodioRegistrado[] = [
  { id: "ep01", resultado: validateEpisodeContent(contenidoEp01) },
  { id: "ep02", resultado: validateEpisodeContent(contenidoEp02) },
];

/** El primero de la lista: con lo que se abre el juego si nadie elige. */
export const EPISODIO_INICIAL = EPISODIOS[0];
