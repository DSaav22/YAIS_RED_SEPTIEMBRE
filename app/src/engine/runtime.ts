// Runtime de navegación del episodio (T-001-04, mitad "motor puro").
//
// Reglas de este directorio (AGENTS.md y PLAN-001):
// - TypeScript puro: sin React, sin DOM y sin Three. Lo sostienen
//   `tsconfig.engine.json`, el bloque `src/engine/**` de `eslint.config.js`
//   y `scripts/check-safety.mjs`.
// - Nunca lanza. Un contenido roto, una llamada fuera de lugar o un tipo de
//   nodo todavía sin interfaz producen un diagnóstico legible, no una
//   excepción ni una pantalla en blanco (AC-1).
// - Las elecciones del niño viven solo en memoria, en `sessionVars`
//   (Constitución I, SPEC-001 AC-5). Al `ProgressStore` únicamente puede
//   llegar `ep01.completed`; cualquier otro flag que el contenido declare se
//   reporta como ignorado.
//
// Alcance: este runtime presenta `line`, `choice`, `sceneChange` y `end`
// (PLAN-001, `SupportedNodeType`). El episodio versionado también declara
// `minigame`, `branch` y `reward`, que el esquema valida con el mismo rigor
// pero que aquí todavía no tienen interfaz: al alcanzarlos se presenta una
// vista `unimplemented` con su diagnóstico. Nunca se disfrazan de contenido
// jugable terminado (spec.md, «Aclaración de implementación, 2026-09-17»).
//
// Reintento (Constitución V, AC-4): no existe contador de intentos, no hay
// estado de acierto ni de error y ninguna transición se bloquea por haber
// pasado antes por ella. Volver a una decisión es una transición más.

import { evaluarCondicion } from "./condiciones";
import { esFlagDePersistencia } from "./progress";
import type {
  ErrorView,
  LineView,
  Runtime,
  RuntimeDiagnostic,
  RuntimeDiagnosticCode,
  RuntimeOptions,
  RuntimeState,
  RuntimeView,
} from "./runtime-contratos";
import { isVisibleForAgeMode } from "./reglas";

export type * from "./runtime-contratos";
import type {
  BranchNode,
  CastId,
  ChoiceNode,
  EndNode,
  EpisodeContent,
  EpisodeNode,
  FlagId,
  LineNode,
  LocId,
  MinigameNode,
  NodeId,
  RewardNode,
  Scene,
  SceneId,
  SessionVarId,
} from "./types";

/* ------------------------------------------------------------------------ */
/* Contratos públicos                                                        */
/* ------------------------------------------------------------------------ */

/* ------------------------------------------------------------------------ */
/* Implementación                                                            */
/* ------------------------------------------------------------------------ */

/**
 * Tope de saltos encadenados (`sceneChange` y nodos fuera del modo de edad)
 * en una sola transición. El contenido válido no se acerca: el recorrido más
 * largo encadena una escena. Existe para que un ciclo introducido por
 * contenido futuro produzca un diagnóstico y no cuelgue el navegador.
 */
const MAX_SALTOS_POR_TRANSICION = 100;

function esNodoNoImplementado(node: EpisodeNode): node is MinigameNode | BranchNode | RewardNode {
  return node.type === "minigame" || node.type === "branch" || node.type === "reward";
}

/** Continuación declarada de un nodo sin interfaz: `next`, o `else` en `branch`. */
function continuacionDe(node: MinigameNode | BranchNode | RewardNode): NodeId {
  return node.type === "branch" ? node.else : node.next;
}

export function crearRuntime(episode: EpisodeContent, options: RuntimeOptions): Runtime {
  const { ageMode, progress, onDiagnostic } = options;
  const permitirContenidoPendiente = options.permitirContenidoPendiente ?? false;

  const escenasPorId = new Map<SceneId, Scene>(episode.scenes.map((scene) => [scene.id, scene]));
  const nodosPorEscena = new Map<SceneId, Map<NodeId, EpisodeNode>>(
    episode.scenes.map((scene) => [scene.id, new Map(scene.nodes.map((node) => [node.id, node]))]),
  );
  const textos: Readonly<Record<LocId, string>> = episode.localization[episode.defaultLocale] ?? {};

  // El esquema ya comprobó que `entryScene` existe (T-001-03). `startSceneId`
  // viene del selector de desarrollo, así que puede no existir: si no existe,
  // se avisa y se empieza por la escena de entrada del episodio.
  const escenaInicial = resolverEscenaInicial();

  let escenaActual: Scene = escenaInicial;
  let idNodoActual: NodeId = escenaInicial.entryNode;
  let completado = false;
  let ultimaLineaDeLaEscena: LineView | null = null;
  const variablesDeSesion = new Map<SessionVarId, string | boolean>();
  const escuchas = new Set<() => void>();

  function resolverEscenaInicial(): Scene {
    const porDefecto = escenasPorId.get(episode.entryScene);
    const pedida = options.startSceneId ? escenasPorId.get(options.startSceneId) : undefined;
    if (options.startSceneId && !pedida) {
      diagnosticar({
        code: "navegacion-rota",
        path: "startSceneId",
        message: `La escena inicial "${options.startSceneId}" no existe en el episodio; se empieza por "${episode.entryScene}".`,
      });
    }
    // `porDefecto` solo faltaría con un episodio no validado; el fallback
    // evita que el motor quede sin escena en ese caso.
    const primera = episode.scenes[0];
    return pedida ?? porDefecto ?? primera ?? crearEscenaVacia();
  }

  function crearEscenaVacia(): Scene {
    diagnosticar({
      code: "navegacion-rota",
      path: "scenes",
      message: "El episodio no declara ninguna escena. Se ejecutó un contenido sin validar.",
    });
    return {
      id: "(sin escena)",
      environment: {},
      camera: "",
      cast: [],
      onEnter: {},
      entryNode: "(sin nodo)",
      nodes: [],
    };
  }

  function diagnosticar(diagnostic: RuntimeDiagnostic): RuntimeDiagnostic {
    onDiagnostic?.(diagnostic);
    return diagnostic;
  }

  /**
   * `true` si el nodo, o la línea a la que lleva encadenado, está marcado
   * `review: "VALIDAR"`. Mira un salto más allá porque en el guion la
   * insistencia empieza en una línea y sigue en la decisión siguiente.
   */
  function esperaValidacion(scene: Scene, nodeId: NodeId): boolean {
    const nodo = buscarNodo(scene, nodeId);
    if (!nodo) return false;
    if (nodo.type === "line" && nodo.review === "VALIDAR") return true;
    return false;
  }

  function rutaDeNodo(sceneId: SceneId, nodeId: NodeId): string {
    return `scenes.${sceneId}.nodes.${nodeId}`;
  }

  function buscarNodo(scene: Scene, nodeId: NodeId): EpisodeNode | undefined {
    return nodosPorEscena.get(scene.id)?.get(nodeId);
  }

  function texto(locId: LocId): string {
    const valor = textos[locId];
    if (valor === undefined) {
      diagnosticar({
        code: "texto-faltante",
        path: `localization.${episode.defaultLocale}.${locId}`,
        message: `No hay texto para "${locId}" en el idioma por defecto; se muestra el identificador.`,
      });
      return locId;
    }
    return valor;
  }

  function nombreDe(castId: CastId): string {
    const entrada = episode.cast[castId];
    return entrada ? texto(entrada.displayNameLocId) : castId;
  }

  /**
   * Único punto por el que un flag del contenido puede llegar al
   * almacenamiento. Fuera de la allowlist de AC-5 no se escribe nada: se
   * anota como ignorado y la sesión sigue.
   */
  function aplicarFlags(flags: readonly FlagId[], path: string): void {
    for (const flag of flags) {
      if (esFlagDePersistencia(flag)) {
        progress.writeFlag(flag, true);
        continue;
      }
      diagnosticar({
        code: "flag-ignorado",
        path,
        message: `El contenido pide persistir "${flag}", que no está en la allowlist de SPEC-001 AC-5; se ignora.`,
      });
    }
  }

  function entrarAEscena(scene: Scene): void {
    escenaActual = scene;
    ultimaLineaDeLaEscena = null;
    const path = `scenes.${scene.id}.onEnter`;
    aplicarFlags(scene.onEnter.setFlags ?? [], `${path}.setFlags`);
    for (const clave of Object.keys(scene.onEnter.setProgress ?? {})) {
      // `setProgress` guarda valores (p. ej. la última escena vista), no
      // booleanos de la allowlist: este slice no lo persiste en absoluto.
      diagnosticar({
        code: "progreso-ignorado",
        path: `${path}.setProgress`,
        message: `El contenido pide guardar progreso en "${clave}"; SPEC-001 AC-5 solo permite ep01.completed, así que se ignora.`,
      });
    }
  }

  function terminarEpisodio(node: EndNode, scene: Scene): void {
    aplicarFlags(node.setFlags, `${rutaDeNodo(scene.id, node.id)}.setFlags`);
    if (node.clearSessionVars) variablesDeSesion.clear();
    completado = true;
  }

  function instantaneaDeSesion(): Readonly<Record<SessionVarId, string | boolean>> {
    return Object.freeze(Object.fromEntries(variablesDeSesion));
  }

  function construirVistaDeLinea(scene: Scene, node: LineNode): LineView {
    return {
      kind: "line",
      scene,
      node,
      speaker: node.speaker,
      speakerName: nombreDe(node.speaker),
      text: texto(node.locId),
    };
  }

  /**
   * La pregunta que acompaña a una decisión.
   *
   * Normalmente es la última línea mostrada, que es lo que el niño acaba de
   * leer. Pero al volver a una decisión por un camino de reintento —«cambiar
   * de saludo» devuelve a `s03_c001` desde `s03_c002`— esa última línea es la
   * de la otra decisión y no viene a cuento. En ese caso se usa la línea que
   * el guion pone delante de esta decisión, que es la pregunta que su autora
   * escribió para ella.
   */
  function preguntaDeLaDecision(scene: Scene, node: ChoiceNode): LineView | null {
    if (ultimaLineaDeLaEscena && ultimaLineaDeLaEscena.node.next === node.id) {
      return ultimaLineaDeLaEscena;
    }
    const delGuion = scene.nodes.find(
      (candidato): candidato is LineNode => candidato.type === "line" && candidato.next === node.id,
    );
    return delGuion ? construirVistaDeLinea(scene, delGuion) : null;
  }

  function vistaDeNodo(scene: Scene, node: EpisodeNode): RuntimeView {
    switch (node.type) {
      case "line": {
        const vista = construirVistaDeLinea(scene, node);
        ultimaLineaDeLaEscena = vista;
        return vista;
      }
      case "choice": {
        const visibles = node.options
          .filter((option) => isVisibleForAgeMode(option.ageModes, ageMode))
          .map((option) => ({ option, text: texto(option.locId) }));
        if (visibles.length === 0) {
          // El esquema comprueba que cada decisión deja al menos una opción
          // por modo de edad, así que llegar aquí significa contenido sin
          // validar: se avisa en vez de mostrar una decisión vacía.
          return {
            kind: "error",
            scene,
            diagnostic: diagnosticar({
              code: "navegacion-rota",
              path: `${rutaDeNodo(scene.id, node.id)}.options`,
              message: `Esta decisión no deja ninguna opción visible en el modo de edad "${ageMode}".`,
            }),
          };
        }
        return {
          kind: "choice",
          scene,
          node,
          options: visibles,
          precedingLine: preguntaDeLaDecision(scene, node),
        };
      }
      case "end":
        return { kind: "end", scene, node };
      case "minigame":
        return { kind: "minigame", scene, node };
      case "reward":
        // Los flags de la recompensa pasan por la misma puerta que los demás:
        // ninguno está en la allowlist, así que se ignoran con diagnóstico.
        aplicarFlags(node.setFlags, `${rutaDeNodo(scene.id, node.id)}.setFlags`);
        return { kind: "reward", scene, node };
      default: {
        if (!esNodoNoImplementado(node)) {
          // Solo queda `sceneChange`, que `situarEn` cruza antes de llegar
          // aquí. Si alguna vez llega, es un fallo de navegación, no un
          // tipo de nodo pendiente de interfaz.
          return {
            kind: "error",
            scene,
            diagnostic: diagnosticar({
              code: "navegacion-rota",
              path: rutaDeNodo(scene.id, node.id),
              message: `El nodo "${node.id}" es de tipo "${node.type}" y no se presenta: se resuelve durante la navegación.`,
            }),
          };
        }
        return {
          kind: "unimplemented",
          scene,
          node,
          nodeType: node.type,
          diagnostic: diagnosticar({
            code: "nodo-no-implementado",
            path: rutaDeNodo(scene.id, node.id),
            message: `El nodo de tipo "${node.type}" está validado pero todavía no tiene interfaz en este vertical slice.`,
          }),
          puedeSaltarse: buscarNodo(scene, continuacionDe(node)) !== undefined,
        };
      }
    }
  }

  function vistaDeNodoFaltante(scene: Scene, nodeId: NodeId): ErrorView {
    return {
      kind: "error",
      scene,
      diagnostic: diagnosticar({
        code: "navegacion-rota",
        path: rutaDeNodo(scene.id, nodeId),
        message: `El nodo "${nodeId}" no existe en la escena "${scene.id}".`,
      }),
    };
  }

  /**
   * Coloca el runtime en un nodo, cruzando por el camino lo que no se
   * presenta: los `sceneChange` (que además ejecutan el `onEnter` de la
   * escena destino) y los nodos que el modo de edad activo no muestra.
   */
  function situarEn(scene: Scene, nodeId: NodeId): RuntimeView {
    let sceneEnCurso = scene;
    let idEnCurso = nodeId;

    for (let salto = 0; salto < MAX_SALTOS_POR_TRANSICION; salto += 1) {
      const node = buscarNodo(sceneEnCurso, idEnCurso);
      if (!node) {
        escenaActual = sceneEnCurso;
        idNodoActual = idEnCurso;
        return vistaDeNodoFaltante(sceneEnCurso, idEnCurso);
      }

      if (node.type === "sceneChange") {
        const destino = escenasPorId.get(node.scene);
        if (!destino) {
          escenaActual = sceneEnCurso;
          idNodoActual = node.id;
          return {
            kind: "error",
            scene: sceneEnCurso,
            diagnostic: diagnosticar({
              code: "navegacion-rota",
              path: `${rutaDeNodo(sceneEnCurso.id, node.id)}.scene`,
              message: `El cambio de escena apunta a "${node.scene}", que no existe.`,
            }),
          };
        }
        entrarAEscena(destino);
        sceneEnCurso = destino;
        idEnCurso = destino.entryNode;
        continue;
      }

      if (node.type === "branch") {
        // Las ramas no se presentan: se resuelven. El guion las usa para que
        // una escena continúe de otra manera según lo que ya pasó, y eso es
        // navegación, no una pantalla.
        const contexto = { ageMode, sessionVars: instantaneaDeSesion() };
        const acertada = node.conditions.find((regla) => evaluarCondicion(regla.if, contexto));
        let destino = acertada?.next ?? node.else;

        // El contenido manda: si declara que lo pendiente no sale a
        // producción, una rama no puede ser la puerta por la que entre.
        if (
          acertada &&
          !permitirContenidoPendiente &&
          episode.reviewPolicy.blockProductionIfPending &&
          esperaValidacion(sceneEnCurso, destino)
        ) {
          diagnosticar({
            code: "rama-pendiente-de-validar",
            path: rutaDeNodo(sceneEnCurso.id, node.id),
            message: `La rama llevaría a "${destino}", que todavía espera aprobación; se continúa por el camino por defecto, "${node.else}".`,
          });
          destino = node.else;
        } else {
          diagnosticar({
            code: "rama-resuelta",
            path: rutaDeNodo(sceneEnCurso.id, node.id),
            message: acertada
              ? `Se cumplió una condición de la rama; se continúa en "${destino}".`
              : `Ninguna condición de la rama se cumplió; se continúa por el camino por defecto, "${destino}".`,
          });
        }
        idEnCurso = destino;
        continue;
      }

      if (node.type === "line" && !isVisibleForAgeMode(node.ageModes, ageMode)) {
        diagnosticar({
          code: "nodo-omitido-por-edad",
          path: rutaDeNodo(sceneEnCurso.id, node.id),
          message: `La línea no se muestra en el modo de edad "${ageMode}"; se continúa en "${node.next}".`,
        });
        idEnCurso = node.next;
        continue;
      }

      if (node.type === "end") terminarEpisodio(node, sceneEnCurso);

      escenaActual = sceneEnCurso;
      idNodoActual = node.id;
      return vistaDeNodo(sceneEnCurso, node);
    }

    escenaActual = sceneEnCurso;
    idNodoActual = idEnCurso;
    return {
      kind: "error",
      scene: sceneEnCurso,
      diagnostic: diagnosticar({
        code: "navegacion-rota",
        path: rutaDeNodo(sceneEnCurso.id, idEnCurso),
        message: `La navegación encadenó más de ${MAX_SALTOS_POR_TRANSICION} saltos sin llegar a un nodo presentable: el contenido tiene un ciclo.`,
      }),
    };
  }

  function crearEstado(): RuntimeState {
    return {
      episodeId: episode.episodeId,
      sceneId: escenaActual.id,
      nodeId: idNodoActual,
      ageMode,
      sessionVars: instantaneaDeSesion(),
      completed: completado,
    };
  }

  function notificar(): void {
    for (const escucha of escuchas) escucha();
  }

  function transicionar(scene: Scene, nodeId: NodeId): void {
    vistaActual = situarEn(scene, nodeId);
    estadoActual = crearEstado();
    notificar();
  }

  function rechazar(code: RuntimeDiagnosticCode, message: string): false {
    diagnosticar({ code, path: rutaDeNodo(escenaActual.id, idNodoActual), message });
    return false;
  }

  /** Arranque y reintento comparten camino: sesión vacía y escena inicial. */
  function comenzar(scene: Scene): RuntimeView {
    completado = false;
    variablesDeSesion.clear();
    entrarAEscena(scene);
    return situarEn(scene, scene.entryNode);
  }

  // Estado inicial: el `onEnter` de la primera escena se aplica al arrancar,
  // igual que el de cualquier escena a la que se entre después.
  let vistaActual: RuntimeView = comenzar(escenaInicial);
  let estadoActual: RuntimeState = crearEstado();

  return {
    episode,

    estado() {
      return estadoActual;
    },

    vista() {
      return vistaActual;
    },

    avanzar() {
      if (vistaActual.kind !== "line") {
        return rechazar(
          "accion-fuera-de-lugar",
          `Se pidió avanzar, pero la vista actual es "${vistaActual.kind}".`,
        );
      }
      transicionar(escenaActual, vistaActual.node.next);
      return true;
    },

    elegir(optionId) {
      if (vistaActual.kind !== "choice") {
        return rechazar(
          "accion-fuera-de-lugar",
          `Se eligió "${optionId}", pero la vista actual es "${vistaActual.kind}".`,
        );
      }
      const elegida = vistaActual.options.find((entrada) => entrada.option.id === optionId);
      if (!elegida) {
        return rechazar(
          "opcion-invalida",
          `La opción "${optionId}" no existe o no es visible en el modo de edad "${ageMode}".`,
        );
      }

      // Las elecciones se quedan aquí, en memoria, y desaparecen al recargar
      // (Constitución I, AC-5). Nada de esto toca `ProgressStore`.
      for (const [clave, valor] of Object.entries(elegida.option.setSession ?? {})) {
        variablesDeSesion.set(clave, valor);
      }
      transicionar(escenaActual, elegida.option.next);
      return true;
    },

    terminarMinijuego(nodeId) {
      if (vistaActual.kind !== "minigame") {
        return rechazar(
          "accion-fuera-de-lugar",
          `Se dio por terminado un minijuego, pero la vista actual es "${vistaActual.kind}".`,
        );
      }
      const destino = nodeId ?? vistaActual.node.next;
      if (!buscarNodo(escenaActual, destino)) {
        return rechazar(
          "navegacion-rota",
          `El minijuego "${vistaActual.node.id}" quiso continuar en "${destino}", que no existe en la escena.`,
        );
      }
      transicionar(escenaActual, destino);
      return true;
    },

    terminarRecompensa() {
      if (vistaActual.kind !== "reward") {
        return rechazar(
          "accion-fuera-de-lugar",
          `Se dio por vista una recompensa, pero la vista actual es "${vistaActual.kind}".`,
        );
      }
      transicionar(escenaActual, vistaActual.node.next);
      return true;
    },

    saltarNodoNoImplementado() {
      if (vistaActual.kind !== "unimplemented") {
        return rechazar(
          "accion-fuera-de-lugar",
          `Se pidió saltar un nodo sin interfaz, pero la vista actual es "${vistaActual.kind}".`,
        );
      }
      if (!vistaActual.puedeSaltarse) {
        return rechazar(
          "navegacion-rota",
          `El nodo "${vistaActual.node.id}" no declara una continuación alcanzable.`,
        );
      }
      transicionar(escenaActual, continuacionDe(vistaActual.node));
      return true;
    },

    irAEscena(sceneId) {
      const destino = escenasPorId.get(sceneId);
      if (!destino) {
        return rechazar(
          "navegacion-rota",
          `Se pidió ir a la escena "${sceneId}", que no existe en el episodio.`,
        );
      }
      entrarAEscena(destino);
      transicionar(destino, destino.entryNode);
      return true;
    },

    reiniciar() {
      vistaActual = comenzar(escenaInicial);
      estadoActual = crearEstado();
      notificar();
    },

    texto,

    suscribir(listener) {
      escuchas.add(listener);
      return () => {
        escuchas.delete(listener);
      };
    },
  };
}
