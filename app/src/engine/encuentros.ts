// Esquema y cargador de «encuentros» (conversaciones sueltas de mundo
// abierto).
//
// Un encuentro NO es un episodio en miniatura: es una charla de una a cuatro
// líneas que aparece al acercarse a un personaje en una isla. No tiene
// decisiones, no tiene minijuego, no tiene cierre y no guarda nada (ninguna
// clave de este esquema escribe en `ProgressStore` ni en `sessionVars`). Esa
// ausencia es una regla dura del proyecto (Constitución III: nada de perfil
// del niño), no un descuido de alcance, por eso se hace cumplir con
// `.strict()` en cada objeto: una clave desconocida como `"opciones"` o
// `"setSession"` debe rechazar el contenido, nunca ignorarlo en silencio.
//
// Reglas de este directorio (AGENTS.md y PLAN-001):
// - TypeScript puro: sin React, sin DOM, sin Three y sin tocar el disco. La
//   fixture de prueba se lee desde el test con `readFileSync`, igual que hace
//   `runtime.test.ts` con el episodio real.
// - Nunca se lanza un `throw` opaco: la API pública devuelve un resultado
//   discriminado (`EncounterValidationResult`), con el mismo contrato que
//   `EpisodeValidationResult` en `schema.ts`.

import { z } from "zod";

import { ageModeSchema, castIdSchema, reviewMarkerSchema } from "./comun";
import { isVisibleForAgeMode } from "./reglas";
import type { AgeMode } from "./types";

// Mismo motivo que en `schema.ts`: los mensajes incorporados de zod (formas,
// uniones, tamaños de arreglo…) salen en español. Es idempotente llamarlo dos
// veces (una vez por `schema.ts`, otra por este módulo) porque solo reasigna
// la configuración global del locale; no hay dos configuraciones compitiendo.
z.config(z.locales.es());

/* -------------------------------------------------------------------------- */
/* Esquema de una línea de encuentro                                          */
/* -------------------------------------------------------------------------- */

const lineaDeEncuentroSchema = z
  .object({
    id: z.string(),
    speaker: castIdSchema,
    locId: z.string(),
    anim: z.string(),
    review: reviewMarkerSchema.optional(),
    reviewNote: z.string().optional(),
  })
  .strict();

export type LineaDeEncuentro = Readonly<z.infer<typeof lineaDeEncuentroSchema>>;

/* -------------------------------------------------------------------------- */
/* Esquema de un encuentro                                                    */
/* -------------------------------------------------------------------------- */

// Coordenada 2D sobre el plano de la isla (no es una posición 3D completa:
// la altura la decide la escena, no el contenido).
const anclajeSchema = z.tuple([z.number(), z.number()]);

const encuentroSchema = z
  .object({
    id: z.string(),
    castId: castIdSchema,
    isla: z.string(),
    anclaje: anclajeSchema,
    ageModes: z.array(ageModeSchema).optional(),
    // Entre 1 y 4 líneas: más que eso deja de ser una charla suelta y
    // debería modelarse como episodio (ver `esRegistroDeEncuentroValido`,
    // que da el mensaje explicando por qué se rechaza).
    lineas: z.array(lineaDeEncuentroSchema).min(1).max(4),
  })
  .strict();

export type Encuentro = Readonly<z.infer<typeof encuentroSchema>>;

/* -------------------------------------------------------------------------- */
/* Documento completo de encuentros                                          */
/* -------------------------------------------------------------------------- */

const reviewPolicySchema = z
  .object({
    blockProductionIfPending: z.boolean(),
  })
  .strict();

export const encountersContentSchema = z
  .object({
    schemaVersion: z.number(),
    defaultLocale: z.string(),
    locales: z.array(z.string()).min(1),
    reviewPolicy: reviewPolicySchema,
    encuentros: z.array(encuentroSchema),
    localization: z.record(z.string(), z.record(z.string(), z.string())),
  })
  .strict();

export type EncountersContent = Readonly<z.infer<typeof encountersContentSchema>>;

/* -------------------------------------------------------------------------- */
/* Resultado de validación (mismo contrato que `schema.ts`)                   */
/* -------------------------------------------------------------------------- */

export interface EncounterValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface EncounterValidationWarning {
  readonly path: string;
  readonly message: string;
}

export type EncounterValidationResult =
  | {
      readonly ok: true;
      readonly contenido: EncountersContent;
      readonly warnings: readonly EncounterValidationWarning[];
    }
  | {
      readonly ok: false;
      readonly issues: readonly EncounterValidationIssue[];
    };

/** Convierte la ruta de un issue de zod en una cadena legible (copiado del
 * mismo helper de `schema.ts`: no vale la pena una dependencia cruzada por
 * una función de diez líneas). */
function formatZodPath(path: readonly PropertyKey[]): string {
  let result = "";
  for (const segment of path) {
    if (typeof segment === "number") {
      result += `[${segment}]`;
    } else if (result.length === 0) {
      result += String(segment);
    } else {
      result += `.${String(segment)}`;
    }
  }
  return result.length > 0 ? result : "(raíz)";
}

/* -------------------------------------------------------------------------- */
/* Integridad referencial: lo que la forma sola no puede comprobar            */
/* -------------------------------------------------------------------------- */

function verificarIntegridad(contenido: EncountersContent): {
  issues: EncounterValidationIssue[];
  warnings: EncounterValidationWarning[];
} {
  const issues: EncounterValidationIssue[] = [];
  const warnings: EncounterValidationWarning[] = [];

  const idsDeEncuentroVistos = new Set<string>();
  const locIdsUsados = new Set<string>();

  for (const [indiceEncuentro, encuentro] of contenido.encuentros.entries()) {
    const rutaEncuentro = `encuentros[${indiceEncuentro}]`;

    // Id de encuentro único: dos encuentros con el mismo id son
    // indistinguibles para quien decide qué mostrar en la isla.
    if (idsDeEncuentroVistos.has(encuentro.id)) {
      issues.push({
        path: `${rutaEncuentro}.id`,
        message: `El id de encuentro "${encuentro.id}" está repetido; cada encuentro necesita un id único.`,
      });
    }
    idsDeEncuentroVistos.add(encuentro.id);

    const idsDeLineaVistos = new Set<string>();

    for (const [indiceLinea, linea] of encuentro.lineas.entries()) {
      const rutaLinea = `${rutaEncuentro}.lineas[${indiceLinea}]`;

      // Id de línea único dentro del encuentro (no hace falta que sea único
      // entre encuentros distintos).
      if (idsDeLineaVistos.has(linea.id)) {
        issues.push({
          path: `${rutaLinea}.id`,
          message: `El encuentro "${encuentro.id}" repite el id de línea "${linea.id}".`,
        });
      }
      idsDeLineaVistos.add(linea.id);

      // El hablante tiene que ser el personaje del encuentro o "all": un
      // encuentro es la charla de un único personaje con quien juega, no un
      // guion coral con reparto libre.
      if (linea.speaker !== encuentro.castId && linea.speaker !== "all") {
        issues.push({
          path: `${rutaLinea}.speaker`,
          message: `La línea "${linea.id}" del encuentro "${encuentro.id}" tiene speaker "${linea.speaker}", pero el encuentro es de "${encuentro.castId}" (o "all").`,
        });
      }

      locIdsUsados.add(linea.locId);

      // locId presente en la tabla de localización de cada locale declarado.
      for (const locale of contenido.locales) {
        const tabla = contenido.localization[locale];
        if (!tabla || !(linea.locId in tabla)) {
          issues.push({
            path: `${rutaLinea}.locId`,
            message: `El locId "${linea.locId}" (línea "${linea.id}" del encuentro "${encuentro.id}") no existe en localization["${locale}"].`,
          });
        }
      }
    }
  }

  // locId declarados que nadie usa: no rompe nada, pero es basura que alguien
  // debería limpiar antes de que se acumule.
  for (const locale of contenido.locales) {
    const tabla = contenido.localization[locale];
    if (!tabla) continue;
    for (const locId of Object.keys(tabla)) {
      if (!locIdsUsados.has(locId)) {
        warnings.push({
          path: `localization.${locale}.${locId}`,
          message: `El locId "${locId}" está declarado en localization["${locale}"] pero ninguna línea lo usa.`,
        });
      }
    }
  }

  return { issues, warnings };
}

/* -------------------------------------------------------------------------- */
/* API pública                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Valida un valor ya interpretado (por ejemplo, el resultado de
 * `JSON.parse`) contra el esquema de encuentros y su integridad referencial.
 * Nunca lanza: siempre devuelve un resultado discriminado.
 */
export function validateEncuentros(datos: unknown): EncounterValidationResult {
  const parsed = encountersContentSchema.safeParse(datos);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: formatZodPath(issue.path),
        message: `${issue.message} (código: ${issue.code}).`,
      })),
    };
  }

  const contenido: EncountersContent = parsed.data;
  const { issues, warnings } = verificarIntegridad(contenido);
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, contenido, warnings };
}

/**
 * Punto de entrada de más alto nivel: recibe el texto crudo de un archivo de
 * encuentros, lo interpreta como JSON y lo valida. Un JSON corrupto o mal
 * formado produce un `issue` legible en vez de una excepción.
 */
export function parseEncuentros(json: string): EncounterValidationResult {
  let datos: unknown;
  try {
    datos = JSON.parse(json);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      issues: [{ path: "(raíz)", message: `El contenido no es JSON válido: ${reason}` }],
    };
  }

  return validateEncuentros(datos);
}

/**
 * Encuentros visibles para un modo de edad dado, en el mismo sentido que
 * `isVisibleForAgeMode` decide qué nodo o qué opción se muestra en un
 * episodio: sin `ageModes` declarado, el encuentro es visible en los dos
 * modos.
 */
export function encuentrosVisiblesPara(
  contenido: EncountersContent,
  modo: AgeMode,
): readonly Encuentro[] {
  return contenido.encuentros.filter((encuentro) => isVisibleForAgeMode(encuentro.ageModes, modo));
}
