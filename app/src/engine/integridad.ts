// Integridad referencial del episodio (T-001-03).
//
// Lo que Zod no puede comprobar por sí solo: que los ids sean únicos, que
// cada `next`/`scene` apunte a algo que existe, que los `locId`, `speaker`,
// `prop` y `environment` estén declarados, y que ningún modo de edad deje una
// decisión sin opciones.
//
// Vive aparte del esquema de formas porque crece con cada episodio y con cada
// tipo de nodo nuevo, y porque se lee distinto: aquí no hay declaraciones de
// forma, hay recorridos.

import { ageModesOrDefault, isVisibleForAgeMode, PERSISTENCE_ALLOWLIST } from "./reglas";
import type {
  EpisodeContent,
  PersistenceDiagnostics,
  ValidationIssue,
  ValidationWarning,
} from "./types";

/**
 * Recorre el episodio ya validado por forma (`episodeContentSchema`) y
 * comprueba las referencias cruzadas que Zod no puede expresar por sí solo:
 * IDs únicos, destinos de `next`/`scene` existentes, `locId`/`speaker`/
 * `icon` (sin registro, ver nota abajo)/`prop`/`environment` declarados, y
 * que ningún modo de edad deje una decisión sin opciones.
 *
 * Nota: el contenido no declara un registro de `icon` (solo `props` y
 * `environment`), así que los íconos se tipan pero no se validan por
 * referencia; ver el hallazgo documentado en el reporte de la tarea.
 */
export function checkReferentialIntegrity(episode: EpisodeContent): {
  readonly issues: readonly ValidationIssue[];
  readonly warnings: readonly ValidationWarning[];
} {
  const issues: ValidationIssue[] = [];
  const warnings: ValidationWarning[] = [];

  const sceneIds = new Set(episode.scenes.map((scene) => scene.id));
  const castIds = new Set(Object.keys(episode.cast));
  const propIds = new Set(episode.props);
  const environmentIds = new Set(episode.environment);
  const sessionVarIds = new Set(episode.sessionVars.map((sessionVar) => sessionVar.id));
  const defaultLocaleTable = episode.localization[episode.defaultLocale] ?? {};
  const locIds = new Set(Object.keys(defaultLocaleTable));
  const usedLocIds = new Set<string>();

  function checkLocId(path: string, locId: string): void {
    usedLocIds.add(locId);
    if (!locIds.has(locId)) {
      issues.push({
        path,
        message: `El locId "${locId}" no existe en localization["${episode.defaultLocale}"].`,
      });
    }
  }

  if (sceneIds.size !== episode.scenes.length) {
    issues.push({ path: "scenes", message: "Hay identificadores de escena repetidos." });
  }

  // Unicidad global de nodos, además de la unicidad por escena de más abajo:
  // en el contenido real cada id de nodo ya lleva el prefijo de su escena
  // (`s01_n001`), pero nada en el esquema lo obliga; lo comprobamos aquí para
  // que dos escenas nunca puedan compartir un id por accidente de copiado.
  const globalNodeIdCounts = new Map<string, number>();
  for (const scene of episode.scenes) {
    for (const node of scene.nodes) {
      globalNodeIdCounts.set(node.id, (globalNodeIdCounts.get(node.id) ?? 0) + 1);
    }
  }
  for (const [nodeId, count] of globalNodeIdCounts) {
    if (count > 1) {
      issues.push({
        path: "scenes",
        message: `El id de nodo "${nodeId}" se repite en ${count} escenas o nodos del episodio.`,
      });
    }
  }

  if (!sceneIds.has(episode.entryScene)) {
    issues.push({
      path: "entryScene",
      message: `entryScene apunta a una escena que no existe: "${episode.entryScene}".`,
    });
  }

  checkLocId("titleLocId", episode.titleLocId);
  for (const [castId, entry] of Object.entries(episode.cast)) {
    checkLocId(`cast.${castId}.displayNameLocId`, entry.displayNameLocId);
  }
  checkLocId("globalUi.pause.promptLocId", episode.globalUi.pause.promptLocId);
  for (const option of episode.globalUi.pause.options) {
    checkLocId(`globalUi.pause.options.${option.id}.locId`, option.locId);
  }

  for (const scene of episode.scenes) {
    const scenePath = `scenes.${scene.id}`;
    const nodeIds = new Set(scene.nodes.map((node) => node.id));

    if (nodeIds.size !== scene.nodes.length) {
      issues.push({
        path: `${scenePath}.nodes`,
        message: "Hay identificadores de nodo repetidos en esta escena.",
      });
    }
    if (!nodeIds.has(scene.entryNode)) {
      issues.push({
        path: `${scenePath}.entryNode`,
        message: `entryNode apunta a un nodo que no existe en la escena: "${scene.entryNode}".`,
      });
    }
    for (const castId of scene.cast) {
      if (!castIds.has(castId)) {
        issues.push({ path: `${scenePath}.cast`, message: `"${castId}" no está declarado en cast.` });
      }
    }
    for (const environmentId of Object.keys(scene.environment)) {
      if (!environmentIds.has(environmentId)) {
        issues.push({
          path: `${scenePath}.environment`,
          message: `"${environmentId}" no está declarado en la lista environment del episodio.`,
        });
      }
    }

    function checkNodeRef(path: string, targetNodeId: string): void {
      if (!nodeIds.has(targetNodeId)) {
        issues.push({
          path,
          message: `Apunta a un nodo que no existe en esta escena: "${targetNodeId}".`,
        });
      }
    }

    for (const node of scene.nodes) {
      const nodePath = `${scenePath}.nodes.${node.id}`;

      switch (node.type) {
        case "line": {
          checkLocId(`${nodePath}.locId`, node.locId);
          if (!castIds.has(node.speaker)) {
            issues.push({
              path: `${nodePath}.speaker`,
              message: `"${node.speaker}" no está declarado en cast.`,
            });
          }
          checkNodeRef(`${nodePath}.next`, node.next);
          break;
        }
        case "choice": {
          for (const age of ageModesOrDefault(node.ageModes)) {
            const visible = node.options.filter((option) => isVisibleForAgeMode(option.ageModes, age));
            if (visible.length === 0) {
              issues.push({
                path: `${nodePath}.options`,
                message: `Esta decisión no deja ninguna opción visible para el modo de edad "${age}".`,
              });
            }
          }
          for (const option of node.options) {
            const optionPath = `${nodePath}.options.${option.id}`;
            checkLocId(`${optionPath}.locId`, option.locId);
            checkNodeRef(`${optionPath}.next`, option.next);
            if (option.setSession) {
              for (const sessionVarId of Object.keys(option.setSession)) {
                if (!sessionVarIds.has(sessionVarId)) {
                  issues.push({
                    path: `${optionPath}.setSession`,
                    message: `"${sessionVarId}" no está declarado en sessionVars.`,
                  });
                }
              }
            }
          }
          break;
        }
        case "sceneChange": {
          if (!sceneIds.has(node.scene)) {
            issues.push({
              path: `${nodePath}.scene`,
              message: `sceneChange apunta a una escena que no existe: "${node.scene}".`,
            });
          }
          break;
        }
        case "end": {
          if (node.debriefScreen) {
            const debrief = node.debriefScreen;
            checkLocId(`${nodePath}.debriefScreen.titleLocId`, debrief.titleLocId);
            checkLocId(`${nodePath}.debriefScreen.childLocId`, debrief.childLocId);
            checkLocId(`${nodePath}.debriefScreen.activityLocId`, debrief.activityLocId);
            for (const locId of debrief.adultQuestionsLocIds) {
              checkLocId(`${nodePath}.debriefScreen.adultQuestionsLocIds`, locId);
            }
            for (const locId of debrief.familyLocIds) {
              checkLocId(`${nodePath}.debriefScreen.familyLocIds`, locId);
            }
            if (debrief.adultQuestionsAgeModes) {
              for (const locId of Object.keys(debrief.adultQuestionsAgeModes)) {
                checkLocId(`${nodePath}.debriefScreen.adultQuestionsAgeModes`, locId);
                if (!debrief.adultQuestionsLocIds.includes(locId)) {
                  issues.push({
                    path: `${nodePath}.debriefScreen.adultQuestionsAgeModes`,
                    message: `"${locId}" no está en adultQuestionsLocIds.`,
                  });
                }
              }
            }
          }
          break;
        }
        case "minigame": {
          checkNodeRef(`${nodePath}.next`, node.next);
          if (node.minigameId === "body_compass_practice") {
            for (const card of node.config.cards) {
              checkLocId(`${nodePath}.config.cards`, card.locId);
            }
            for (const answer of node.config.answers) {
              checkLocId(`${nodePath}.config.answers`, answer.locId);
            }
            const feedback = node.config.feedbackAfterEachCard;
            checkLocId(`${nodePath}.config.feedbackAfterEachCard.locId`, feedback.locId);
            if (!castIds.has(feedback.speaker)) {
              issues.push({
                path: `${nodePath}.config.feedbackAfterEachCard.speaker`,
                message: `"${feedback.speaker}" no está declarado en cast.`,
              });
            }
            const variant = node.config.feedbackVariantAfterCard;
            checkLocId(`${nodePath}.config.feedbackVariantAfterCard.locId`, variant.locId);
            if (!castIds.has(variant.speaker)) {
              issues.push({
                path: `${nodePath}.config.feedbackVariantAfterCard.speaker`,
                message: `"${variant.speaker}" no está declarado en cast.`,
              });
            }
          }
          if (node.minigameId === "bridge_planks") {
            for (const card of node.config.cards) {
              checkLocId(`${nodePath}.config.cards`, card.locId);
              if (!propIds.has(card.prop)) {
                issues.push({
                  path: `${nodePath}.config.cards`,
                  message: `"${card.prop}" no está declarado en props.`,
                });
              }
            }
          }
          if (node.minigameId === "high_five_rhythm") {
            checkLocId(`${nodePath}.config.stopButton.locId`, node.config.stopButton.locId);
            checkNodeRef(`${nodePath}.config.stopButton.onPress`, node.config.stopButton.onPress);
            checkNodeRef(`${nodePath}.config.questionNode`, node.config.questionNode);
          }
          break;
        }
        case "branch": {
          for (const rule of node.conditions) {
            checkNodeRef(`${nodePath}.conditions`, rule.next);
          }
          checkNodeRef(`${nodePath}.else`, node.else);
          break;
        }
        case "reward": {
          checkNodeRef(`${nodePath}.next`, node.next);
          for (const environmentId of node.restore) {
            if (!environmentIds.has(environmentId)) {
              issues.push({
                path: `${nodePath}.restore`,
                message: `"${environmentId}" no está declarado en la lista environment del episodio.`,
              });
            }
          }
          for (const castId of node.celebration.cast) {
            if (!castIds.has(castId)) {
              issues.push({
                path: `${nodePath}.celebration.cast`,
                message: `"${castId}" no está declarado en cast.`,
              });
            }
          }
          break;
        }
      }
    }
  }

  for (const locId of locIds) {
    if (!usedLocIds.has(locId)) {
      warnings.push({
        path: `localization.${episode.defaultLocale}.${locId}`,
        message: "Este locId está definido pero ningún nodo lo referencia todavía.",
      });
    }
  }

  return { issues, warnings };
}

/**
 * Diagnóstico de desarrollo sobre `progressFlags` (T-001-03, punto 3 de la
 * tarea): compara los flags con `persist: true` del contenido contra
 * `PERSISTENCE_ALLOWLIST` y enumera los que el runtime va a ignorar. Nunca
 * bloquea la carga: es información para quien desarrolla, no un error.
 */
export function buildPersistenceDiagnostics(episode: EpisodeContent): PersistenceDiagnostics {
  const ignoredFlags = episode.progressFlags
    .filter((flag) => flag.persist && !PERSISTENCE_ALLOWLIST.includes(flag.id))
    .map((flag) => flag.id);

  return { allowlist: PERSISTENCE_ALLOWLIST, ignoredFlags };
}
