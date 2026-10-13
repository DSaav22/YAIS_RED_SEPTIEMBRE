// Un personaje en la escena (T-001-06).
//
// Carga su GLB bajo demanda (solo se monta cuando su escena lo tiene en el
// reparto) y reproduce el clip que le corresponde. La ruta del modelo sale
// siempre de `shared/assets.ts`: aquí no hay ninguna ruta literal (AGENTS.md).
//
// El modelo se clona por instancia con `SkeletonUtils.clone`: dos personajes
// del mismo GLB no pueden compartir esqueleto, y `useGLTF` devuelve siempre
// la misma escena cacheada. Tampoco se copia el archivo por escena: el GLB se
// descarga una vez y se reutiliza (PLAN-001: "no copies el modelo por
// escena").
//
// Caminar manda sobre gesticular: mientras se desplaza reproduce su clip de
// locomoción (`Walk`, o `Roll` en el caso de Luna) y solo al llegar retoma el
// gesto que pide el guion. Un personaje que camina haciendo `Wave` se vería
// como un error, no como un saludo.

import { useAnimations, useGLTF } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type { Group } from "three";
// Viene de `three`, que es dependencia directa; `three-stdlib` solo llega
// aquí de rebote a través de drei y no se importa a propósito.
import { clone as clonarConEsqueleto } from "three/examples/jsm/utils/SkeletonUtils.js";

import { resolveAnimationClip } from "../../shared/animation-intents";
import { CHARACTERS, type CharacterId, type RuntimeClip } from "../../shared/assets";
import type { ComandoDeJugador } from "./control-del-jugador";
import type { GestoDeEscena } from "./estado-de-escena";
import { ENTRADA, type Posicion } from "./posiciones";
import { useCharacterAnimation } from "./useCharacterAnimation";
import { useCharacterWalk } from "./useCharacterWalk";

interface CharacterProps {
  readonly characterId: CharacterId;
  /** A dónde debe ir. Cambiarlo lo pone a caminar. */
  readonly destino: Posicion;
  /** Escena actual: al cambiar, el personaje entra caminando de nuevo. */
  readonly sceneId: string;
  readonly gesto: GestoDeEscena;
  /**
   * Desde dónde aparece al empezar. Por defecto el extremo del sendero, que
   * es de dónde entran los personajes de una escena del guion. Quien ya vive
   * en su isla pasa aquí su propio sitio: si no, entraría caminando desde el
   * otro extremo del archipiélago cada vez que se monta.
   */
  readonly entrada?: Posicion | undefined;
  readonly sessionVars: Readonly<Record<string, string | boolean>>;
  readonly menosMovimiento: boolean;
  /** Solo el personaje que controla quien juega lo recibe. */
  readonly comandoDelJugador?: RefObject<ComandoDeJugador | null> | undefined;
  /** Solo lo recibe el personaje que controla quien juega. */
  readonly tomarSaltoPedido?: (() => boolean) | undefined;
  /**
   * Ref que la cámara usa para seguirlo. Se comparte en vez de exponer la
   * posición por estado: seguir a alguien es cosa de cada cuadro y hacerlo
   * por render sería un re-render por cuadro (PLAN-001).
   */
  readonly grupoCompartido?: RefObject<Group | null> | undefined;
  readonly alCambiarActividad: (characterId: CharacterId, enMovimiento: boolean) => void;
}

/**
 * Traduce el gesto de la escena al clip real del personaje.
 *
 * `intencion` pasa por el mapa de `shared/animation-intents.ts`, que nunca
 * adivina por nombre y avisa en desarrollo cuando cae en un fallback.
 * `escuchar` es una decisión de presentación, no del guion, y por eso se
 * resuelve aquí de forma explícita: `Listen` si el personaje lo tiene.
 */
function clipDelGesto(
  gesto: GestoDeEscena,
  characterId: CharacterId,
  sessionVars: Readonly<Record<string, string | boolean>>,
): RuntimeClip {
  if (gesto.tipo === "intencion") {
    return resolveAnimationClip(gesto.intent, characterId, sessionVars);
  }
  if (gesto.tipo === "escuchar") {
    return CHARACTERS[characterId].availableClips.includes("Listen") ? "Listen" : "Idle";
  }
  return "Idle";
}

export function Character({
  characterId,
  destino,
  sceneId,
  gesto,
  entrada = ENTRADA,
  sessionVars,
  menosMovimiento,
  comandoDelJugador,
  tomarSaltoPedido,
  grupoCompartido,
  alCambiarActividad,
}: CharacterProps) {
  const grupoPropio = useRef<Group>(null);
  const grupo = grupoCompartido ?? grupoPropio;
  // El segundo argumento desactiva el decodificador Draco de drei, que por
  // omisión lo pediría a un CDN de Google. Los GLB de hoy no usan Draco, pero
  // si alguien los comprime antes de la demo, el aula sin Internet se
  // quedaría sin personajes (revisión de content-guardian).
  const { scene, animations } = useGLTF(CHARACTERS[characterId].modelUrl, false);

  const modelo = useMemo(() => clonarConEsqueleto(scene), [scene]);
  const { actions, mixer } = useAnimations(animations, grupo);

  const [caminando, setCaminando] = useState(false);

  // Dos fuentes de movimiento —caminar y animar— para un solo interruptor del
  // bucle de render. Se guardan en un ref y se informa el resultado combinado:
  // si el personaje camina, da igual que su animación ya se haya asentado.
  const movimiento = useRef({ caminata: false, animacion: false });
  const informar = useCallback(() => {
    alCambiarActividad(characterId, movimiento.current.caminata || movimiento.current.animacion);
  }, [alCambiarActividad, characterId]);

  const alCambiarCaminata = useCallback(
    (activo: boolean) => {
      movimiento.current.caminata = activo;
      setCaminando(activo);
      informar();
    },
    [informar],
  );

  const alCambiarAnimacion = useCallback(
    (activo: boolean) => {
      movimiento.current.animacion = activo;
      informar();
    },
    [informar],
  );

  useCharacterWalk({
    grupo,
    destino,
    entrada,
    sceneId,
    menosMovimiento,
    comandoDelJugador,
    tomarSaltoPedido,
    alCambiarMovimiento: alCambiarCaminata,
  });

  const clip = caminando
    ? CHARACTERS[characterId].locomotion
    : clipDelGesto(gesto, characterId, sessionVars);

  useCharacterAnimation({
    acciones: actions,
    mixer,
    clip,
    menosMovimiento,
    alCambiarActividad: alCambiarAnimacion,
  });

  // Al desmontarse, el personaje deja de contar como movimiento: si no, el
  // canvas seguiría dibujando por alguien que ya no está en escena.
  useEffect(() => {
    return () => {
      alCambiarActividad(characterId, false);
    };
  }, [alCambiarActividad, characterId]);

  return (
    <group ref={grupo} dispose={null}>
      <primitive object={modelo} />
    </group>
  );
}
