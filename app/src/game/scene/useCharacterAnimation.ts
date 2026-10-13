// Transiciones de clip de un personaje (T-001-06).
//
// Cada personaje tiene exactamente cinco clips y todos vienen marcados
// `loop: true` en el GLB. Aquí se decide cómo se reproducen:
//
// - Un gesto puntual (`Wave`, `TalkGesture`) suena una vez, se congela en su
//   último cuadro y devuelve al personaje a `Idle`.
// - Un estado sostenido (`Idle`, `Listen`, locomoción) se mantiene en bucle
//   mientras dure la situación.
// - Las transiciones son cruzadas (`crossFadeFrom`), nunca cortes secos.
//
// Con `prefers-reduced-motion` se congela todo lo AMBIENTAL —el bucle de
// reposo, los gestos decorativos, `Listen`— en el primer cuadro de `Idle`
// (AC-7). Lo que NO se congela es la locomoción que pide quien juega: desde
// que `useControlDelJugador.ts` dejó de bloquear el movimiento con esta
// preferencia activa, el `Group` del personaje sí se desplaza cuadro a
// cuadro (`useCharacterWalk.ts`), y si aquí se seguía forzando `Idle`
// congelado el resultado era un personaje deslizándose sobre el suelo sin
// mover las patas —el reporte original de este archivo: "el capibara no
// tiene activado su efecto de caminar"—. AC-7 pide apagar lo que se mueve
// SOLO, no la respuesta a una acción deliberada; un personaje que se desliza
// es un error más visible que uno que camina, así que la locomoción
// (`Walk`/`Roll`) se anima igual con o sin la preferencia. `useCharacterWalk`
// ya garantiza que esto no reintroduce movimiento ambiental: un personaje sin
// `comandoDelJugador` nunca recibe una orden con la preferencia activa, así
// que nunca llega aquí pidiendo locomoción sin que alguien la haya pedido de
// verdad.
//
// El hook avisa hacia arriba cuándo hay movimiento (`alCambiarActividad`)
// para que `GameCanvas` pueda apagar el bucle de render cuando la escena
// está quieta, que es la mitad del presupuesto de CPU en una laptop vieja
// (Constitución VI).
//
// Qué cuenta como "quieta": después de un gesto, cuando el personaje ya
// volvió a `Idle`. Un estado sostenido —`Listen` mientras el niño decide— NO
// cuenta como quieto y mantiene el bucle: el personaje está esperando una
// respuesta y quedarse congelado ahí se lee como que el juego se colgó. Si en
// el aula real resulta que el reposo congelado parece un error, la decisión a
// revisar es esta, y está aquí en un solo lugar.

/* eslint-disable react-hooks/immutability --
   La regla protege valores de React de mutarse después del render. Aquí los
   objetos mutados son `AnimationAction` y `AnimationMixer` de Three, cuya API
   entera es mutación (`play`, `fadeIn`, `paused`, `setLoop`): no son estado de
   React, no participan en el render y su ciclo de vida lo maneja
   `useAnimations`. Es justamente lo que pide PLAN-001 para T-001-06 —"no
   mutaciones Three mediante estado React por frame"—: el mixer se conduce de
   forma imperativa y React solo decide qué clip toca. */

import { useEffect, useRef } from "react";
import type { AnimationAction, AnimationMixer } from "three";
import { LoopOnce, LoopRepeat } from "three";

import { esGestoPuntual } from "../../shared/animation-intents";
import type { RuntimeClip } from "../../shared/assets";

/** Duración de la mezcla entre dos clips, en segundos. */
const SEGUNDOS_DE_MEZCLA = 0.25;

/**
 * Margen, en milisegundos, entre el final de un gesto y declarar quieta la
 * escena. Es la mezcla de vuelta a `Idle` más un respiro: si se declarara
 * quieta en el mismo instante, el canvas dejaría de dibujar a mitad de la
 * mezcla y el personaje se quedaría en una pose a medio camino. Medido en el
 * navegador: sin este margen, cero cuadros dibujados justo cuando hacían
 * falta seis.
 */
const MS_DE_ASENTAMIENTO = SEGUNDOS_DE_MEZCLA * 1000 + 100;

const CLIP_DE_REPOSO: RuntimeClip = "Idle";

/**
 * Clips sostenidos que sí justifican seguir dibujando. `Listen` porque el
 * personaje espera una respuesta y congelarlo ahí se lee como que el juego se
 * colgó; la locomoción porque el personaje se está desplazando de verdad.
 *
 * Todo lo demás —el reposo de quien solo acompaña, y las quince intenciones
 * del guion que resuelven directo a `Idle` o a un clip neutro— deja de
 * mantener viva la escena en cuanto termina la mezcla. Sin esta lista, el
 * `frameloop` se quedaba en "always" para siempre en cuanto había dos
 * personajes en escena, que es el caso común, y la optimización entera no
 * servía de nada (revisión de a11y-perf-reviewer).
 */
const CLIPS_QUE_MANTIENEN_VIVA_LA_ESCENA: readonly RuntimeClip[] = ["Listen", "Walk", "Roll"];

/**
 * Clips de locomoción real. Es la única excepción al congelamiento de
 * `prefers-reduced-motion`: representan un desplazamiento que ya está
 * ocurriendo en el `Group` del personaje (`useCharacterWalk.ts`), nunca un
 * gesto decorativo ni un bucle de reposo. Ver el comentario de cabecera.
 */
const CLIPS_DE_LOCOMOCION: readonly RuntimeClip[] = ["Walk", "Roll"];

type AccionesPorNombre = Partial<Record<string, AnimationAction | null>>;

interface OpcionesDeAnimacion {
  readonly acciones: AccionesPorNombre;
  readonly mixer: AnimationMixer;
  /** Clip que debe estar sonando ahora. */
  readonly clip: RuntimeClip;
  readonly menosMovimiento: boolean;
  readonly alCambiarActividad: (enMovimiento: boolean) => void;
}

/**
 * Mantiene al personaje en el clip pedido. Devolver a `Idle` tras un gesto
 * no se hace con un temporizador, sino escuchando el evento `finished` del
 * mixer: así la vuelta ocurre cuando el gesto termina de verdad, dure lo que
 * dure el clip.
 */
export function useCharacterAnimation({
  acciones,
  mixer,
  clip,
  menosMovimiento,
  alCambiarActividad,
}: OpcionesDeAnimacion): void {
  const clipActivoRef = useRef<RuntimeClip | null>(null);

  useEffect(() => {
    const reposo = acciones[CLIP_DE_REPOSO];
    const esLocomocionReal = CLIPS_DE_LOCOMOCION.includes(clip);

    if (menosMovimiento && !esLocomocionReal) {
      // Quieto en la pose de reposo. `reset()` deja el primer cuadro y
      // `paused` evita que el mixer avance aunque algo pida un render.
      mixer.stopAllAction();
      if (reposo) {
        reposo.reset().play();
        reposo.paused = true;
      }
      clipActivoRef.current = null;
      alCambiarActividad(false);
      return;
    }

    // `menosMovimiento && esLocomocionReal`: quien juega está caminando de
    // verdad (ver comentario de cabecera). Se sigue el camino normal de abajo
    // sin ninguna rama especial: el clip de locomoción se anima en bucle
    // igual que sin la preferencia activa, y al soltar la tecla
    // `useCharacterWalk` deja de pedir este clip, así que el próximo efecto
    // vuelve a congelar en `Idle`.

    const destino = acciones[clip] ?? reposo;
    if (!destino) return;

    const anterior = clipActivoRef.current ? acciones[clipActivoRef.current] : null;
    const puntual = esGestoPuntual(clip);

    destino.reset();
    destino.setLoop(puntual ? LoopOnce : LoopRepeat, puntual ? 1 : Infinity);
    destino.clampWhenFinished = puntual;
    destino.enabled = true;
    destino.paused = false;

    if (anterior && anterior !== destino) {
      destino.crossFadeFrom(anterior, SEGUNDOS_DE_MEZCLA, false).play();
    } else {
      destino.fadeIn(SEGUNDOS_DE_MEZCLA).play();
    }

    clipActivoRef.current = clip;
    alCambiarActividad(true);

    let asentamiento: ReturnType<typeof setTimeout> | null = null;

    if (!puntual) {
      if (CLIPS_QUE_MANTIENEN_VIVA_LA_ESCENA.includes(clip)) return;
      // Reposo: se deja terminar la mezcla y la escena se declara quieta.
      asentamiento = setTimeout(() => alCambiarActividad(false), MS_DE_ASENTAMIENTO);
      return () => {
        if (asentamiento !== null) clearTimeout(asentamiento);
      };
    }

    function alTerminar(evento: { action: AnimationAction }): void {
      if (evento.action !== destino) return;
      const vuelta = acciones[CLIP_DE_REPOSO];
      if (vuelta) {
        vuelta.reset();
        vuelta.setLoop(LoopRepeat, Infinity);
        vuelta.enabled = true;
        vuelta.paused = false;
        vuelta.crossFadeFrom(destino, SEGUNDOS_DE_MEZCLA, false).play();
        clipActivoRef.current = CLIP_DE_REPOSO;
      }
      // El reposo es un bucle, pero la escena ya no tiene nada que contar:
      // se declara quieta para que el canvas pueda dejar de dibujar. Primero
      // se le da tiempo a la mezcla de terminar; si no, el personaje se
      // congela a medio camino entre el gesto y el reposo.
      asentamiento = setTimeout(() => alCambiarActividad(false), MS_DE_ASENTAMIENTO);
    }

    mixer.addEventListener("finished", alTerminar);
    return () => {
      mixer.removeEventListener("finished", alTerminar);
      if (asentamiento !== null) clearTimeout(asentamiento);
    };
  }, [acciones, mixer, clip, menosMovimiento, alCambiarActividad]);
}
