// Adaptador de almacenamiento del navegador (T-001-05).
//
// Este es el ÚNICO archivo de producción de la app que puede tocar el
// almacenamiento del navegador: `scripts/check-safety.mjs` lo tiene en su
// allowlist (`ARCHIVOS_CON_ALMACENAMIENTO`) y cualquier otro archivo que lo
// use falla la compuerta. El motor (`src/engine`) ni siquiera puede
// nombrarlo: recibe este adaptador inyectado a través de `ProgressStore`
// (PLAN-001; SPEC-001 AC-5).
//
// Qué se guarda de verdad lo decide `crearProgressStore`: solo la clave
// `yais.ep01.completed`. Aquí no hay ninguna política de contenido, solo las
// tres operaciones del adaptador y la degradación a memoria cuando el
// navegador no deja escribir (modo incógnito, cuota llena, almacenamiento
// bloqueado por política del equipo del aula).

import { crearAlmacenamientoEnMemoria, type AdaptadorDeAlmacenamiento } from "../engine";

/**
 * Devuelve el almacenamiento persistente del navegador si está disponible y
 * es escribible; si no, una copia en memoria que dura lo que la pestaña.
 *
 * La comprobación es una escritura real con una clave temporal, no una
 * lectura de `typeof`: Safari en modo privado y algunos navegadores
 * administrados exponen el objeto y lanzan al escribir.
 */
export function crearAlmacenamientoDelNavegador(): AdaptadorDeAlmacenamiento {
  const disponible = obtenerAlmacenamientoSiEsEscribible();
  if (!disponible) return crearAlmacenamientoEnMemoria();

  return {
    getItem: (clave) => disponible.getItem(clave),
    setItem: (clave, valor) => disponible.setItem(clave, valor),
    removeItem: (clave) => disponible.removeItem(clave),
  };
}

const CLAVE_DE_PRUEBA = "yais.__prueba__";

function obtenerAlmacenamientoSiEsEscribible(): Storage | null {
  try {
    const almacen = window.localStorage;
    almacen.setItem(CLAVE_DE_PRUEBA, "1");
    almacen.removeItem(CLAVE_DE_PRUEBA);
    return almacen;
  } catch {
    return null;
  }
}
