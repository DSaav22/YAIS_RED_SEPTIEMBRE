// Los encuentros sueltos del mundo, validados una sola vez.
//
// Mismo patrón que `episodios.ts`: el JSON se importa como módulo, así que
// viaja dentro del paquete y la demo del aula no hace ni una petición de red
// (AC-9). Si el archivo no cumple el esquema, el mundo se queda sin
// encuentros en vez de romperse: son una capa encima de la exploración, no
// algo sin lo que el juego no funcione.

import contenido from "../../../content/encuentros/isla-encuentros.json";

import { validateEncuentros, type EncounterValidationResult } from "../engine";

export const ENCUENTROS_DE_LA_ISLA: EncounterValidationResult = validateEncuentros(contenido);
