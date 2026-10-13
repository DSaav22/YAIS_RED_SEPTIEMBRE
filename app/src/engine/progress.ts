// Persistencia mínima del episodio (T-001-04, mitad "ProgressStore").
//
// Contexto (PLAN-001, contrato `ProgressStore`; SPEC-001 AC-5 y AC-9;
// Constitución I): el progreso sobrevive a la sesión únicamente como un
// booleano por dispositivo/aula. No hay identidad infantil, no hay
// elecciones persistidas y no hay más flags que los de la allowlist de
// abajo, aunque `content/episodes/ep01-saludo.json` declare siete flags
// con `persist: true` (`ep01.started`, `ep01.completed`, `ep01.lastScene`,
// `island.bridge_main`, `island.bench`, `mascot.star_01`,
// `ep02.unlocked`). Esa contradicción es conocida (fila "Política de
// persistencia contradictoria" en PLAN-001) y se resuelve aquí en el
// tipo, no solo en tiempo de ejecución: `ProgressStore.writeFlag` no
// acepta ningún id fuera de `FLAGS_PERSISTIBLES`, así que escribir
// "ep01.lastScene" (o cualquier otro) no compila.
//
// `app/src/engine` es TypeScript puro: no puede tocar el almacenamiento
// persistente del navegador ni ninguna otra API global directamente (ver
// `tsconfig.engine.json`, el bloque `src/engine/**` de `eslint.config.js`
// y `scripts/check-safety.mjs`). Por eso el almacenamiento entra
// inyectado como `AdaptadorDeAlmacenamiento`: la capa de UI le pasa una
// implementación respaldada por el almacenamiento persistente real del
// navegador; aquí solo se usa la interfaz.

/**
 * Adaptador mínimo de almacenamiento. Solo las tres operaciones que el
 * store necesita, nada más. Quien vive en el navegador (fuera de
 * `engine/`) construye uno respaldado por el almacenamiento persistente
 * real y lo inyecta; los tests usan uno falso en memoria.
 */
export interface AdaptadorDeAlmacenamiento {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
  removeItem(clave: string): void;
}

/**
 * Allowlist literal de flags que este vertical slice puede persistir.
 * SPEC-001 AC-5 exige que sea exactamente `ep01.completed`: agregar
 * cualquier otro id aquí requiere primero actualizar la spec (ver
 * "Aclaración de implementación, 2026-09-17").
 *
 * Es la única fuente de verdad del proyecto: `schema.ts` la reexporta como
 * `PERSISTENCE_ALLOWLIST` para su diagnóstico y el runtime la consulta con
 * `esFlagDePersistencia`, así que no existen dos listas que puedan
 * separarse.
 */
export const FLAGS_PERSISTIBLES = ["ep01.completed"] as const;

/** Tipo derivado de la allowlist: no existe otro valor posible. */
export type FlagDePersistencia = (typeof FLAGS_PERSISTIBLES)[number];

/**
 * Guardián de tipo sobre la allowlist. El contenido declara siete flags con
 * `persist: true` y el runtime (T-001-04) recorre esa lista tal cual viene
 * del JSON: necesita preguntar, con un `string` cualquiera en la mano, si
 * ese flag puede llegar a `writeFlag`. Devolver `id is FlagDePersistencia`
 * hace que el compilador, y no una revisión manual, sostenga la regla.
 */
export function esFlagDePersistencia(id: string): id is FlagDePersistencia {
  return (FLAGS_PERSISTIBLES as readonly string[]).includes(id);
}

// Prefijo explícito de clave de almacenamiento. No incluye nada que
// identifique a un niño ni a un aula concreta: el progreso es genérico
// por dispositivo (Constitución I).
const PREFIJO_CLAVE = "yais.";

function claveDeAlmacenamiento(id: FlagDePersistencia): string {
  return `${PREFIJO_CLAVE}${id}`;
}

// El adaptador guarda strings; el store solo modela booleanos.
const VALOR_VERDADERO = "true";
const VALOR_FALSO = "false";

/** Contrato de PLAN-001, literal. */
export interface ProgressStore {
  readFlag(id: FlagDePersistencia): boolean;
  writeFlag(id: FlagDePersistencia, value: boolean): void;
  clear(): void;
}

/**
 * Adaptador en memoria: implementación de referencia para tests y para
 * degradar cuando el adaptador inyectado no está disponible o falla
 * (modo incógnito, cuota agotada). No sobrevive a un recargar la página;
 * eso es preferible a romper la experiencia del niño.
 */
export function crearAlmacenamientoEnMemoria(): AdaptadorDeAlmacenamiento {
  const almacen = new Map<string, string>();
  return {
    getItem(clave) {
      return almacen.has(clave) ? (almacen.get(clave) ?? null) : null;
    },
    setItem(clave, valor) {
      almacen.set(clave, valor);
    },
    removeItem(clave) {
      almacen.delete(clave);
    },
  };
}

/**
 * Construye el `ProgressStore`. Recibe el adaptador por parámetro: el
 * motor nunca decide cómo se guarda, solo qué se guarda y bajo qué clave.
 *
 * Robustez: si el adaptador inyectado lanza en cualquier operación (por
 * ejemplo el almacenamiento del navegador en modo incógnito o con la
 * cuota llena), el store degrada de forma permanente a una copia en
 * memoria y sigue
 * respondiendo sin excepciones. Un valor guardado que no sea exactamente
 * `"true"` (corrupto, de otra versión, o cualquier otra cosa) se lee
 * como `false`.
 */
export function crearProgressStore(adaptador: AdaptadorDeAlmacenamiento): ProgressStore {
  let adaptadorActivo: AdaptadorDeAlmacenamiento = adaptador;
  const respaldoEnMemoria = crearAlmacenamientoEnMemoria();
  let degradado = false;

  function degradarAMemoria(): void {
    if (degradado) return;
    degradado = true;
    adaptadorActivo = respaldoEnMemoria;
  }

  return {
    readFlag(id) {
      const clave = claveDeAlmacenamiento(id);
      try {
        return adaptadorActivo.getItem(clave) === VALOR_VERDADERO;
      } catch {
        // El adaptador falló al leer: se degrada y se responde `false`,
        // nunca se propaga el error al jugador.
        degradarAMemoria();
        return false;
      }
    },
    writeFlag(id, value) {
      const clave = claveDeAlmacenamiento(id);
      const valor = value ? VALOR_VERDADERO : VALOR_FALSO;
      try {
        adaptadorActivo.setItem(clave, valor);
      } catch {
        // El adaptador falló al escribir (cuota, incógnito, lo que sea).
        // Se degrada a memoria y se reintenta una vez ahí para que el
        // cierre del episodio no se pierda en silencio.
        degradarAMemoria();
        try {
          adaptadorActivo.setItem(clave, valor);
        } catch {
          // La copia en memoria no debería fallar nunca. Si de algún
          // modo lo hace, no hay nada más seguro que intentar: se
          // ignora para no romper la experiencia del niño.
        }
      }
    },
    clear() {
      // Borra únicamente las claves de la allowlist. Nunca toca ninguna
      // otra clave del adaptador inyectado.
      for (const id of FLAGS_PERSISTIBLES) {
        const clave = claveDeAlmacenamiento(id);
        try {
          adaptadorActivo.removeItem(clave);
        } catch {
          degradarAMemoria();
        }
      }
    },
  };
}
