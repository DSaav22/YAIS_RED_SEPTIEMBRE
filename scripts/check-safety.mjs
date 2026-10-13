#!/usr/bin/env node
// Compuerta automática de las reglas duras de `specs/constitution.md` y `AGENTS.md`.
// Falla con código 1 si encuentra una violación. Se corre en `npm run verify` y en CI.
//
// QUÉ CUBRE (y solo esto):
//   I    identidad infantil en código y en flags de contenido
//   II   chat, texto libre sobre un menor, `privacy.freeTextInput`
//   III  marcado de riesgo, semáforos y rankings de aulas
//   V    puntaje, racha, cuenta regresiva y estado de "respuesta incorrecta"
//   AC-5 qué puede persistir el contenido y dónde puede vivir el almacenamiento
//   AC-9 red saliente y telemetría en todo `app/src`
//   AGENTS.md  pureza de `app/src/engine` (sin React, DOM ni Three)
//
// QUÉ NO CUBRE (no confíes en esta compuerta para esto):
//   IV   aprobación de contenido por Arianna y marcas `[VALIDAR]`
//   VI   peso de assets y rendimiento en el aula real
//   VII  accesibilidad (contraste, foco, teclado, objetivos táctiles)
//   IX   que un texto no presente como validado algo que no lo está
//   Narrativa copiada dentro de componentes en vez de leída de `content/`
// Eso se revisa con `content-guardian`, con `a11y-perf-reviewer` y con personas.
//
// Las reglas de línea ignoran los comentarios: buscan *uso*, no menciones, para
// que documentar una prohibición no obligue a evitar la palabra prohibida.
//
// Para una excepción justificada, agrega en la misma línea:
//   // safety-ok: <razón>   (la razón es obligatoria)

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["app/src", "content"];
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const RULES = [
  {
    id: "I-identidad-de-nino",
    // Identificadores que implican identidad individual de un menor.
    pattern: /\b(student_?id|child_?id|alumno_?id|nino_?id|niño_?id|pupil_?id|studentName|childName|nombreAlumno|nombreNino)\b/i,
    message:
      "Identidad individual de un niño. El progreso es por aula (classroom), no por estudiante. Constitución I.",
  },
  {
    id: "I-identidad-seudonima",
    // Un UUID por niño sigue siendo identidad individual, aunque sea "anónimo".
    // El lookbehind deja fuera los `...LocId`, que son claves de localización
    // del contenido (`childLocId`), no identificadores de una persona.
    pattern:
      /\b(alumno|estudiante|nino|niño|child|student|pupil|learner|participant|kid)[A-Za-z]*(?<!Loc)(id|uuid|guid|hash|token|key|slug)\b/i,
    message:
      "Identificador seudónimo por niño. Un UUID por menor también es identidad individual. Constitución I.",
  },
  {
    id: "I-tabla-de-ninos",
    pattern:
      /\b(interface|type|class|table|collection)\s+\w*(Student|Child|Alumno|Nino|Niño|Pupil|Menor|Estudiante|Learner)\w*\b/i,
    message:
      "Entidad de niño individual. No debe existir ese modelo de datos. Constitución I.",
  },
  {
    id: "II-texto-libre-sobre-menor",
    pattern:
      /\b(relato|testimonio|incidentReport|reporteIncidente|whatTheChildSaid|loQueDijo|textoLibre|freeText|comentarioDocente)\b/i,
    message:
      "Campo que capturaría lo que un niño contó. La app no recibe revelaciones. Constitución II.",
  },
  {
    id: "II-sin-chat",
    pattern: /\b(chatRoom|ChatMessage|sendMessage|messageThread|salaDeChat)\b/,
    message: "Funcionalidad de chat. No existe chat en este producto. Constitución II.",
  },
  {
    id: "III-marcado-de-riesgo",
    // Sin `\b` final: `semaforoAula` y `enRiesgoX` también son marcado de riesgo.
    pattern:
      /\b(riskScore|riskLevel|nivelRiesgo|puntajeRiesgo|flagAtRisk|enRiesgo|atRisk|sem[aá]foro|alertaAula|aulaAlerta)/i,
    message:
      "Marcado de riesgo. No se diagnostica ni se etiqueta a un niño ni a un aula. Constitución III.",
  },
  {
    id: "III-ranking-de-aulas",
    pattern: /\b(aulas?|classrooms?)[A-Za-z]*(ordenad|ranking|top|peores|mejores|comparativ)/i,
    message:
      "Orden o comparación entre aulas. Un contador agregado no puede volverse un proxy de riesgo. Constitución III.",
  },
  {
    id: "V-castigo-y-puntaje",
    pattern:
      /\b(leaderboard|highScore|score|puntaje|puntuacion|puntuación|tablaDePosiciones|puntosTotales|streak|streakCount|racha|rachaDias)\b/i,
    message:
      "Puntaje competitivo o racha. Sin ranking, sin castigo, sin humillación. Constitución V.",
  },
  {
    id: "V-respuesta-incorrecta",
    pattern:
      /\b(respuestaIncorrecta|wrongAnswer|incorrectAnswer|isWrong|esIncorrecta|answerWrong|errorDeRespuesta)\b/i,
    message:
      "Estado de respuesta incorrecta. Reintentar siempre es posible y nunca cuesta nada. Constitución V.",
  },
  {
    id: "V-cuenta-regresiva",
    pattern:
      /\b(cuentaRegresiva|countdown|tiempoRestante|timeLeft|timerSeconds|segundosRestantes)\b/i,
    message:
      "Temporizador agresivo o cuenta regresiva. Constitución V.",
  },
];

// AC-9: el runtime no emite peticiones con datos del jugador y la demo corre sin
// Internet. Se prohíbe la red saliente en todo `app/src`, no solo en el motor.
// `fetch` relativo (mismo origen, p. ej. `/assets/...`) sigue permitido: es cómo
// se cargan el contenido y los GLB empaquetados.
const RED_PROHIBIDA =
  /\b(sendBeacon|XMLHttpRequest|WebSocket|EventSource|gtag|dataLayer|amplitude|mixpanel|posthog)\b/;
const URL_EXTERNA = /["'`]https?:\/\/(?!www\.w3\.org\/)/;

// AC-5: el almacenamiento del navegador solo puede tocarse en el adaptador que
// se inyecta al `ProgressStore`. En cualquier otro archivo de producción es un
// camino para persistir algo que la spec no permite. Los tests quedan fuera:
// afirmar que el almacenamiento está vacío es justamente lo que queremos.
const ALMACENAMIENTO = /\b(localStorage|sessionStorage|indexedDB)\b|document\s*\.\s*cookie/;
const ARCHIVOS_CON_ALMACENAMIENTO = ["app/src/shared/browser-storage.ts"];

// Único flag que SPEC-001 permite persistir (AC-5).
const FLAGS_PERSISTIBLES = ["ep01.completed"];

// Pureza del motor (AGENTS.md, PLAN-001): `app/src/engine` es TypeScript puro.
const ENGINE_DIR = join(ROOT, "app", "src", "engine");

const ENGINE_MODULES = [
  { pattern: /^react(-dom)?(\/|$)/, nombre: "React" },
  { pattern: /^three(\/|$)/, nombre: "Three" },
  { pattern: /^@react-three\//, nombre: "React Three Fiber" },
  { pattern: /^zustand(\/|$)/, nombre: "zustand" },
];

const ENGINE_GLOBALS =
  /\b(window|document|localStorage|sessionStorage|navigator|fetch|XMLHttpRequest|HTMLElement)\b/;

const IMPORT_SPECIFIER = /(?:from|import|require)\s*\(?\s*["']([^"']+)["']/g;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function readLines(file) {
  return readFileSync(file, "utf8").split(/\r?\n/);
}

// Descarta la parte comentada de la línea y las líneas de bloques JSDoc.
// El `[^:]` evita cortar en el `//` de una URL (`https://...`), que es
// precisamente lo que la regla de red saliente necesita ver.
// Limitación conocida: un `//` dentro de un string que no venga de un esquema
// (por ejemplo `"a//b"`) sigue cortando la línea.
function codigoSinComentarios(line) {
  const sinLinea = line.replace(/(^|[^:])\/\/.*$/, "$1");
  const recortada = sinLinea.trimStart();
  if (recortada.startsWith("*") || recortada.startsWith("/*")) return "";
  return sinLinea;
}

const EXCEPCION_CON_RAZON = /safety-ok:\s*\S+/;

function esArchivoDePruebas(rutaRelativa) {
  return /\.test\.[cm]?[jt]sx?$/.test(rutaRelativa);
}

function rutaPosix(rutaRelativa) {
  return rutaRelativa.split("\\").join("/");
}

const violations = [];
const advertencias = [];

function anotar(lista, file, line, rule, message, snippet) {
  lista.push({ file, line, rule, message, snippet });
}

// 1. Reglas de línea sobre el código fuente de la app y del contenido.
for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    if (!CODE_EXT.has(extname(file))) continue;
    const rutaRelativa = relative(ROOT, file);
    const ruta = rutaPosix(rutaRelativa);
    const esPrueba = esArchivoDePruebas(ruta);
    const permiteAlmacenamiento = esPrueba || ARCHIVOS_CON_ALMACENAMIENTO.includes(ruta);

    readLines(file).forEach((line, i) => {
      // Una excepción sin razón no es una excepción: es un agujero sin dueño.
      if (line.includes("safety-ok:") && !EXCEPCION_CON_RAZON.test(line)) {
        anotar(
          violations,
          rutaRelativa,
          i + 1,
          "excepcion-sin-razon",
          "La excepción `safety-ok:` debe ir seguida de la razón que la justifica.",
          line.trim().slice(0, 120),
        );
        return;
      }
      if (EXCEPCION_CON_RAZON.test(line)) return;

      const codigo = codigoSinComentarios(line);
      if (codigo.trim() === "") return;

      for (const rule of RULES) {
        if (rule.pattern.test(codigo)) {
          anotar(violations, rutaRelativa, i + 1, rule.id, rule.message, line.trim().slice(0, 120));
        }
      }

      if (ruta.startsWith("app/src/")) {
        if (RED_PROHIBIDA.test(codigo) || URL_EXTERNA.test(codigo)) {
          anotar(
            violations,
            rutaRelativa,
            i + 1,
            "AC-9-red-saliente",
            "Red saliente o telemetría. El runtime no emite peticiones con datos del jugador y la demo corre sin Internet. SPEC-001 AC-9.",
            line.trim().slice(0, 120),
          );
        }
        if (!permiteAlmacenamiento && ALMACENAMIENTO.test(codigo)) {
          anotar(
            violations,
            rutaRelativa,
            i + 1,
            "AC-5-almacenamiento-fuera-del-adaptador",
            `El almacenamiento del navegador solo puede tocarse en ${ARCHIVOS_CON_ALMACENAMIENTO.join(", ")}, que se inyecta al ProgressStore. SPEC-001 AC-5.`,
            line.trim().slice(0, 120),
          );
        }
      }
    });
  }
}

// 2. Reglas de privacidad sobre cada episodio de contenido.
const episodesDir = join(ROOT, "content", "episodes");
if (existsSync(episodesDir)) {
  for (const file of readdirSync(episodesDir).filter((f) => f.endsWith(".json"))) {
    const full = join(episodesDir, file);
    const rutaRelativa = relative(ROOT, full);
    let data;
    try {
      data = JSON.parse(readFileSync(full, "utf8"));
    } catch (err) {
      anotar(violations, rutaRelativa, 0, "contenido-json-invalido", `JSON inválido: ${err.message}`, "");
      continue;
    }

    const privacy = data.privacy ?? {};
    if (privacy.persistChoices !== false) {
      anotar(
        violations,
        rutaRelativa,
        0,
        "I-persistChoices",
        "privacy.persistChoices debe ser false. Solo persisten flags de progreso.",
        `persistChoices: ${JSON.stringify(privacy.persistChoices)}`,
      );
    }
    if (privacy.freeTextInput !== false) {
      anotar(
        violations,
        rutaRelativa,
        0,
        "II-freeTextInput",
        "privacy.freeTextInput debe ser false. La app no recibe revelaciones ni texto libre. Constitución II.",
        `freeTextInput: ${JSON.stringify(privacy.freeTextInput)}`,
      );
    }
    if (privacy.telemetry !== "none") {
      anotar(
        violations,
        rutaRelativa,
        0,
        "AC-9-telemetry",
        'privacy.telemetry debe ser "none". No se recolecta nada del jugador. SPEC-001 AC-9.',
        `telemetry: ${JSON.stringify(privacy.telemetry)}`,
      );
    }

    const idsDeSesion = new Set(
      (data.sessionVars ?? []).map((v) => v.id).filter((id) => typeof id === "string"),
    );

    for (const variable of data.sessionVars ?? []) {
      if (variable.persist === true) {
        anotar(
          violations,
          rutaRelativa,
          0,
          "I-sessionVar-persistida",
          `La variable de sesión "${variable.id}" pide persistir. Las elecciones viven solo en memoria. SPEC-001 AC-5.`,
          String(variable.id),
        );
      }
    }

    const persistentesFueraDeAllowlist = [];
    for (const flag of data.progressFlags ?? []) {
      if (typeof flag.id !== "string") continue;
      if (/nombre|name|relato|nino|niño/i.test(flag.id)) {
        anotar(
          violations,
          rutaRelativa,
          0,
          "I-flag-personal",
          `El flag "${flag.id}" sugiere dato personal. Los flags son de progreso del aula.`,
          flag.id,
        );
      }
      if (idsDeSesion.has(flag.id)) {
        anotar(
          violations,
          rutaRelativa,
          0,
          "I-flag-de-eleccion",
          `El flag "${flag.id}" tiene el mismo id que una variable de sesión: sería persistir una elección. SPEC-001 AC-5.`,
          flag.id,
        );
      }
      if (flag.persist === true && !FLAGS_PERSISTIBLES.includes(flag.id)) {
        persistentesFueraDeAllowlist.push(flag.id);
      }
    }

    // Contradicción conocida y documentada (PLAN-001, "Política de persistencia
    // contradictoria"): el contenido declara más flags persistentes de los que
    // SPEC-001 permite. El runtime los ignora por tipo. Se avisa, no se rompe.
    if (persistentesFueraDeAllowlist.length > 0) {
      anotar(
        advertencias,
        rutaRelativa,
        0,
        "AC-5-flags-ignorados",
        `El contenido declara persist:true en flags que el runtime NO persiste (allowlist: ${FLAGS_PERSISTIBLES.join(", ")}). Cambiar esto exige actualizar SPEC-001.`,
        persistentesFueraDeAllowlist.join(", "),
      );
    }
  }
}

// 3. Pureza del motor: sin React, DOM ni Three dentro de `app/src/engine`.
//    La regla también la sostienen `app/tsconfig.engine.json` (sin lib DOM) y el
//    bloque `src/engine/**` de `app/eslint.config.js`; esta es la verificación
//    independiente del toolchain.
for (const file of walk(ENGINE_DIR)) {
  if (!CODE_EXT.has(extname(file))) continue;
  const rutaRelativa = relative(ROOT, file);
  readLines(file).forEach((line, i) => {
    if (EXCEPCION_CON_RAZON.test(line)) return;

    for (const match of line.matchAll(IMPORT_SPECIFIER)) {
      const specifier = match[1];
      for (const mod of ENGINE_MODULES) {
        if (!mod.pattern.test(specifier)) continue;
        anotar(
          violations,
          rutaRelativa,
          i + 1,
          "engine-puro",
          `El motor importa ${mod.nombre}. app/src/engine es TypeScript puro: sin React, DOM ni Three.`,
          line.trim().slice(0, 120),
        );
      }
    }

    if (ENGINE_GLOBALS.test(codigoSinComentarios(line))) {
      anotar(
        violations,
        rutaRelativa,
        i + 1,
        "engine-sin-dom",
        "El motor usa una API del navegador. El almacenamiento entra por la interfaz ProgressStore y solo persiste ep01.completed.",
        line.trim().slice(0, 120),
      );
    }
  });
}

function imprimir(lista, encabezado, salida) {
  salida(encabezado);
  for (const v of lista) {
    const loc = v.line ? `${v.file}:${v.line}` : v.file;
    salida(`  [${v.rule}] ${loc}`);
    salida(`    ${v.message}`);
    if (v.snippet) salida(`    > ${v.snippet}`);
    salida("");
  }
}

if (advertencias.length > 0) {
  imprimir(
    advertencias,
    `check:safety — ${advertencias.length} advertencia(s), no bloquean:\n`,
    (t) => console.log(t),
  );
}

if (violations.length === 0) {
  console.log("check:safety — sin violaciones.");
  process.exit(0);
}

imprimir(violations, `check:safety — ${violations.length} violación(es):\n`, (t) => console.error(t));
console.error("Si es un falso positivo, agrega en esa línea: // safety-ok: <razón>");
process.exit(1);
