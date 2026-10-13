// Reglas que comparten el esquema, la integridad referencial y el runtime
// (T-001-03).
//
// Están aquí, y no en el esquema, porque no son formas que validar sino
// decisiones del producto: qué se puede persistir y qué se ve en cada modo de
// edad. Tenerlas en un solo sitio evita que la validación y el motor
// respondan distinto a la misma pregunta.

import { FLAGS_PERSISTIBLES } from "./progress";
import { ALL_AGE_MODES, type AgeMode, type FlagId } from "./types";

/**
 * Allowlist de persistencia (AGENTS.md, SPEC-001 AC-5): en este vertical
 * slice solo puede sobrevivir a la sesión el flag `ep01.completed`. Es
 * literal a propósito: cualquier otro flag de `progressFlags`, aunque el
 * JSON lo declare con `persist: true`, se reporta como diagnóstico de
 * desarrollo y el runtime lo ignora.
 *
 * La lista vive en `progress.ts`, donde además define el tipo que `writeFlag`
 * acepta; aquí solo se reexporta con el nombre que usa la validación, para
 * que no existan dos allowlists que puedan separarse.
 */
export const PERSISTENCE_ALLOWLIST: readonly FlagId[] = FLAGS_PERSISTIBLES;

export function ageModesOrDefault(ageModes: readonly AgeMode[] | undefined): readonly AgeMode[] {
  return ageModes && ageModes.length > 0 ? ageModes : ALL_AGE_MODES;
}

/**
 * Regla de visibilidad por edad (AC-3): sin `ageModes`, un nodo u opción es
 * visible en los dos modos. La comparten la validación, que comprueba que
 * ninguna decisión se quede sin opciones, y el runtime, que decide qué
 * mostrar.
 */
export function isVisibleForAgeMode(ageModes: readonly AgeMode[] | undefined, age: AgeMode): boolean {
  return ageModesOrDefault(ageModes).includes(age);
}
