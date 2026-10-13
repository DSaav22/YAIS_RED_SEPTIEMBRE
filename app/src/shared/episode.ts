// Carga del contenido del episodio (T-001-05).
//
// El contenido se lee desde `content/`, nunca se copia dentro de un
// componente (AGENTS.md). Se importa como módulo, así que viaja dentro del
// paquete de la app: la demo del aula funciona sin Internet y sin ninguna
// petición de red (PLAN-001, riesgo "CDN/red"; SPEC-001 AC-9).
//
// La validación ocurre aquí, una sola vez, antes de que ningún componente
// vea el contenido: si el JSON no cumple el esquema, la app muestra un error
// de desarrollo legible en vez de una pantalla en blanco (AC-1).

import contenidoDelEpisodio from "../../../content/episodes/ep01-saludo.json";

import { validateEpisodeContent, type EpisodeValidationResult } from "../engine";

/**
 * Resultado de validar `content/episodes/ep01-saludo.json`. Es un resultado
 * discriminado, no un `throw`: quien lo consume decide qué mostrar cuando
 * `ok` es `false`.
 */
export const EPISODIO_01: EpisodeValidationResult = validateEpisodeContent(contenidoDelEpisodio);
