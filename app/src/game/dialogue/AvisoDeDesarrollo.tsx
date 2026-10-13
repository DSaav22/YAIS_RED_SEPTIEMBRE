// Avisos de desarrollo (T-001-05, AC-1).
//
// Dos casos, ninguno de los cuales es contenido para un niño:
//
// 1. Un nodo validado que este slice todavía no sabe presentar (`minigame`,
//    `branch`, `reward`). No se disfraza de minijuego terminado.
// 2. Una navegación rota o un contenido que no valida. En vez de una
//    pantalla en blanco, el diagnóstico legible con su ruta dentro del JSON.
//
// Qué se ve depende de dónde corre (revisión de content-guardian): el
// `message` de un diagnóstico está escrito para quien programa —cita ids del
// contenido y rutas del JSON—, así que solo se muestra con
// `import.meta.env.DEV`, igual que el botón para cruzar el nodo, que es una
// herramienta de desarrollo y no una forma de saltarse el guion delante de un
// grupo. El título sí se muestra siempre: es un aviso técnico, y sustituirlo
// fuera de desarrollo por una frase del mundo del juego sería escribir
// contenido infantil en código (Constitución IV).

import type { RuntimeDiagnostic } from "../../engine";
import { TEXTOS_UI } from "../ui/textos-ui";

interface AvisoDeDesarrolloProps {
  readonly titulo: string;
  readonly diagnosticos: readonly RuntimeDiagnostic[];
  /** Acción de desarrollo para seguir el recorrido, si el nodo la permite. */
  readonly alSaltar?: (() => void) | undefined;
}

export function AvisoDeDesarrollo({ titulo, diagnosticos, alSaltar }: AvisoDeDesarrolloProps) {
  const enDesarrollo = import.meta.env.DEV;

  return (
    <section className="aviso-desarrollo" aria-labelledby="aviso-desarrollo-titulo" role="note">
      {/* La etiqueta describe las herramientas de alrededor, que fuera de
          desarrollo no existen: proyectarla en un aula sería jerga interna
          en pantalla (revisión de a11y-perf-reviewer). El título sí se queda:
          es un aviso técnico y decir en su lugar una frase del mundo del
          juego sería contenido infantil escrito en código. */}
      {enDesarrollo ? (
        <p className="aviso-desarrollo__etiqueta">{TEXTOS_UI.desarrollo.etiqueta}</p>
      ) : null}

      <h2 className="aviso-desarrollo__titulo" id="aviso-desarrollo-titulo">
        {titulo}
      </h2>

      {enDesarrollo ? (
        <ul className="aviso-desarrollo__lista">
          {diagnosticos.map((diagnostico) => (
            <li key={`${diagnostico.code}:${diagnostico.path}`}>
              <code>{diagnostico.path}</code> — {diagnostico.message}
            </li>
          ))}
        </ul>
      ) : null}

      {enDesarrollo && alSaltar ? (
        <button
          type="button"
          className="objetivo-tactil boton boton--secundario"
          data-principal="true"
          onClick={alSaltar}
        >
          {TEXTOS_UI.desarrollo.continuarSaltando}
        </button>
      ) : null}
    </section>
  );
}
