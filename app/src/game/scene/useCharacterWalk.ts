/* Lo que se muta aquí es el `Group` de Three que representa al personaje
   (`position`, `rotation`), no estado de React. Moverlo por estado de React
   sería un render por cuadro, que es justamente lo que PLAN-001 prohíbe para
   T-001-06. Hubo aquí un `eslint-disable` de `react-hooks/immutability` que
   dejó de hacer falta al mover la colocación a una función. */

// Caminata de un personaje por la isla (T-001-06).
//
// Mueve el `Group` del personaje hacia su destino a velocidad constante y lo
// gira hacia donde camina. Cuando llega, lo devuelve a mirar a la cámara.
//
// El hook no re-renderiza por cuadro: avisa dos veces por trayecto —empieza y
// termina— mediante `alCambiarMovimiento`. Ese mismo aviso es el que mantiene
// encendido el bucle de render mientras hay movimiento y lo apaga al llegar,
// así que caminar no deja la GPU trabajando de más (Constitución VI).
//
// Con `prefers-reduced-motion` no hay caminata POR SU CUENTA: el personaje
// aparece ya colocado donde el guion lo quiere, sin entrada ni recorrido
// (AC-7). Lo que sí sigue moviéndose es el personaje que alguien está
// moviendo: andar porque se mantiene una tecla o se toca el suelo no es
// movimiento automático, es la respuesta a lo que se acaba de pedir.

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import type { Group } from "three";

import { dentroDelMundo, esCaminable, type ComandoDeJugador } from "./control-del-jugador";
import { ALTURA_DEL_SUELO, alturaDelSuelo } from "./mundo";
import type { Posicion } from "./posiciones";
import {
  ESTADO_DE_SALTO_INICIAL,
  alturaDelSalto,
  avanzarSalto,
  iniciarSalto,
  obtenerPuntoDeRecuperacion,
  recordarPuntoSeguro,
  seCayoDelMundo,
  seguirAlSuelo,
  VELOCIDAD_DE_SUBIDA,
  type EstadoDeSalto,
  type PuntoSeguro,
} from "./salto";

/** Unidades por segundo. La isla mide 6,3: cruzarla lleva unos 4 segundos. */
const VELOCIDAD = 1.6;

/** Radianes por segundo al girar. */
const VELOCIDAD_DE_GIRO = 6;

/**
 * Unidades por segundo con las que la `y` del personaje persigue al suelo
 * real cuando camina (no salta). Con relieve, `alturaDelSuelo` puede pegar un
 * salto de golpe al pisar el primer escalón de una escalera; sin suavizar,
 * el personaje "teletransportaba" verticalmente. Es más rápida que
 * `VELOCIDAD` a propósito: si fuera más lenta, se vería flotando sobre el
 * escalón mientras camina hacia adelante y eso se lee como un error, no
 * como una subida.
 *
 * La velocidad y la cuenta viven ahora en `salto.ts`, que es puro y está
 * probado: el fallo de quedarse flotando no se veía en ningún test porque
 * esto era una función suelta dentro de un hook de React.
 */

/** Distancia a partir de la cual se considera que ya llegó. */
const UMBRAL_DE_LLEGADA = 0.05;

/** Diferencia de ángulo que ya no vale la pena corregir. */
const UMBRAL_DE_GIRO = 0.02;

interface OpcionesDeCaminata {
  readonly grupo: RefObject<Group | null>;
  readonly destino: Posicion;
  /**
   * Lo que pide quien juega, si es el personaje que controla. Manda sobre el
   * destino del guion: en cuanto alguien toma el control en una escena, el
   * personaje deja de volver solo a su sitio —si no, caminar sería pelearse
   * con el juego—. Se suelta al cambiar de escena.
   */
  readonly comandoDelJugador?: RefObject<ComandoDeJugador | null> | undefined;
  /** Desde dónde entra al empezar una escena. */
  readonly entrada: Posicion;
  /** Cambia cuando empieza una escena nueva: dispara la entrada caminando. */
  readonly sceneId: string;
  readonly menosMovimiento: boolean;
  /**
   * Devuelve `true` una sola vez cuando se pidió saltar. Solo lo recibe el
   * personaje que controla quien juega: los demás no saltan.
   */
  readonly tomarSaltoPedido?: (() => boolean) | undefined;
  readonly alCambiarMovimiento: (enMovimiento: boolean) => void;
}

/** Acerca `actual` a `objetivo` por el camino corto del círculo. */
function girarHacia(actual: number, objetivo: number, maximo: number): number {
  let diferencia = (objetivo - actual) % (Math.PI * 2);
  if (diferencia > Math.PI) diferencia -= Math.PI * 2;
  if (diferencia < -Math.PI) diferencia += Math.PI * 2;
  if (Math.abs(diferencia) <= maximo) return objetivo;
  return actual + Math.sign(diferencia) * maximo;
}

/**
 * Ajusta la `y` del `Group` hacia el suelo real bajo su posición horizontal
 * actual, suavizado a `VELOCIDAD_DE_SUBIDA`. Solo se llama fuera del salto:
 * en el aire la altura la maneja por completo el bloque de salto.
 *
 * Si `alturaDelSuelo` da `null` (no debería pasar caminando, porque `x, z`
 * ya viene recortado a una zona caminable, pero una isla nueva sin terminar
 * de definir su relieve podría dar ese caso) se deja la `y` como está: mejor
 * quieto en su sitio que saltando a un valor inventado.
 */
/**
 * Acomoda al personaje a la altura del suelo. Devuelve `false` si todavía le
 * queda camino, y entonces quien llama DEBE seguir pidiendo cuadros.
 *
 * La interpolación vivía dentro del bloque de caminar, así que al soltar la
 * tecla el bucle de render —que va en modo `demand`— se apagaba a mitad de la
 * subida y el personaje se quedaba flotando en el aire. La cuenta está en
 * `salto.ts` y probada; aquí solo se aplica al `Group`.
 */
function seguirElSuelo(objeto: Group, delta: number): boolean {
  const suelo = alturaDelSuelo(objeto.position.x, objeto.position.z);
  const paso = seguirAlSuelo(objeto.position.y, suelo, VELOCIDAD_DE_SUBIDA * delta);
  objeto.position.y = paso.y;
  return paso.asentado;
}

export function useCharacterWalk({
  grupo,
  destino,
  entrada,
  sceneId,
  menosMovimiento,
  comandoDelJugador,
  tomarSaltoPedido,
  alCambiarMovimiento,
}: OpcionesDeCaminata): void {
  /* Estado del salto y memoria del último suelo firme. Viven en refs porque
     cambian cada cuadro; por estado de React serían sesenta renders por
     segundo, que es justo lo que PLAN-001 prohíbe para la escena. */
  const salto = useRef<EstadoDeSalto>(ESTADO_DE_SALTO_INICIAL);
  const puntoSeguro = useRef<PuntoSeguro | null>(null);
  /**
   * Suelo sobre el que se apoya el salto en curso. No es la altura de
   * despegue congelada: se actualiza cuadro a cuadro con el suelo bajo la
   * posición horizontal actual, así que saltar desde una isla alta hacia una
   * más baja aterriza en el suelo de destino, no en el de salida. Mientras
   * se vuela sobre el agua o un hueco entre islas (`alturaDelSuelo` da
   * `null`), se conserva el último suelo real conocido: no hay "suelo del
   * vacío" que inventar.
   */
  const baseDelSalto = useRef(ALTURA_DEL_SUELO);
  // El destino se lee cuadro a cuadro desde un ref para no re-suscribir el
  // bucle en cada render; se sincroniza en el efecto de más abajo, nunca
  // durante el render.
  const destinoRef = useRef(destino);
  const enMovimientoRef = useRef(false);
  /**
   * Si ya se colocó a este personaje en su sitio.
   *
   * El efecto de abajo corre al montar, pero el `Group` todavía no existe si
   * el GLB no ha terminado de bajar: se salía por el `if (!objeto) return` y
   * no volvía a intentarlo, porque sus dependencias son la escena y la
   * preferencia de movimiento, no el modelo. Resultado: los personajes cuyo
   * modelo llegaba tarde se quedaban en el origen del mundo, uno encima de
   * otro. Se veía a Luna dentro de Capi en la isla de partida.
   */
  const colocado = useRef(false);
  const jugadorTomoElControlRef = useRef(false);

  function marcar(enMovimiento: boolean): void {
    if (enMovimientoRef.current === enMovimiento) return;
    enMovimientoRef.current = enMovimiento;
    alCambiarMovimiento(enMovimiento);
  }

  // Empezar una escena: se entra caminando desde el sendero. Con menos
  // movimiento, se aparece ya colocado.
  useEffect(() => {
    const objeto = grupo.current;
    if (!objeto) return;
    colocar(objeto);
    // `sceneId` es la única dependencia real: se reposiciona al cambiar de
    // escena, no cada vez que cambia el destino dentro de la misma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId, menosMovimiento]);

  // Cambiar de escena vuelve a pedir colocación, aunque el `Group` no
  // estuviera listo cuando el efecto de arriba corrió.
  useEffect(() => {
    colocado.current = false;
  }, [sceneId]);

  // Cualquier destino nuevo dentro de la escena también pone a caminar.
  useEffect(() => {
    destinoRef.current = destino;
    if (menosMovimiento) return;
    marcar(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destino, menosMovimiento]);

  /** Deja al personaje en su sitio de salida y lo da por colocado. */
  function colocar(objeto: Group): void {
    const inicio = menosMovimiento ? destinoRef.current : entrada;
    // La `y` del guion queda de reserva por si el punto cae fuera de toda
    // zona caminable (no debería pasar, pero un `null` aquí no puede
    // convertirse en un personaje flotando en el vacío al entrar a la
    // escena).
    const altura = alturaDelSuelo(inicio[0], inicio[2]) ?? inicio[1];
    objeto.position.set(inicio[0], altura, inicio[2]);
    baseDelSalto.current = altura;
    objeto.rotation.y = 0;
    jugadorTomoElControlRef.current = false;
    colocado.current = true;
    if (!menosMovimiento) marcar(true);
  }

  useFrame((_, delta) => {
    const objeto = grupo.current;
    if (!objeto) return;

    // El modelo pudo llegar después del efecto de montaje: en cuanto exista
    // el `Group`, se coloca donde le toca antes de hacer nada más.
    if (!colocado.current) colocar(objeto);

    /* Salto. En el aire se puede pasar por encima del agua —es lo que permite
       cruzar las piedras de paso—, así que el recorte contra el suelo
       caminable se levanta mientras dura, y al aterrizar se comprueba dónde
       se cayó. Con menos movimiento no se salta: es movimiento, no control
       imprescindible, y andando se llega a todas partes por los puentes. */
    if (tomarSaltoPedido && !menosMovimiento) {
      if (tomarSaltoPedido()) {
        // Al despegar se fija el suelo de salida como base inicial: todavía
        // no se movió horizontalmente este cuadro.
        baseDelSalto.current = alturaDelSuelo(objeto.position.x, objeto.position.z) ?? baseDelSalto.current;
        salto.current = iniciarSalto(salto.current);
      }

      const antes = salto.current.fase;
      salto.current = avanzarSalto(salto.current, delta);

      // El suelo bajo el vuelo se sigue cuadro a cuadro: si ahora hay isla
      // debajo (se llegó sobre la de destino), la base salta a esa altura;
      // si se está sobre el agua o un hueco, se conserva la última conocida.
      const sueloBajoElAire = alturaDelSuelo(objeto.position.x, objeto.position.z);
      if (sueloBajoElAire !== null) baseDelSalto.current = sueloBajoElAire;
      objeto.position.y = baseDelSalto.current + alturaDelSalto(salto.current);

      if (salto.current.fase === "en-suelo") {
        if (antes === "en-suelo") {
          // En el suelo y quieto: se recuerda dónde se está pisando.
          puntoSeguro.current = recordarPuntoSeguro(
            puntoSeguro.current,
            objeto.position.x,
            objeto.position.z,
          );
        } else if (
          !esCaminable(objeto.position.x, objeto.position.z) ||
          seCayoDelMundo(objeto.position.y, sueloBajoElAire)
        ) {
          // Aterrizó en el agua o en un hueco sin suelo. No es un fracaso: no
          // hay mensaje, no hay contador y no se pierde nada. Reaparece de
          // pie en el último sitio firme, que nunca es el borde del que se
          // cayó.
          const [x, z] = obtenerPuntoDeRecuperacion(puntoSeguro.current);
          const alturaDeRecuperacion = alturaDelSuelo(x, z) ?? ALTURA_DEL_SUELO;
          objeto.position.set(x, alturaDeRecuperacion, z);
          baseDelSalto.current = alturaDeRecuperacion;
          salto.current = ESTADO_DE_SALTO_INICIAL;
        } else if (sueloBajoElAire !== null) {
          // Aterrizaje limpio: se ajusta a la altura exacta del suelo de
          // destino, sin arrastrar ningún redondeo del vuelo.
          //
          // El `!== null` no es una formalidad del tipo: en esta rama ya se
          // descartó la caída, pero `alturaDelSuelo` puede devolver `null` en
          // el borde exacto de una isla por el error de la coma flotante. Sin
          // esta comprobación, ahí se escribiría `null` en la posición y el
          // personaje desaparecería del mundo.
          objeto.position.y = sueloBajoElAire;
          baseDelSalto.current = sueloBajoElAire;
        }
      }
    }

    const enElAire = salto.current.fase !== "en-suelo";
    const orden = comandoDelJugador?.current ?? null;
    // Sin orden y con menos movimiento no pasa nada: ni entrada, ni vuelta al
    // sitio del guion, ni giro para mirar a la cámara.
    if (menosMovimiento && !orden) {
      marcar(false);
      return;
    }
    if (orden) jugadorTomoElControlRef.current = true;

    if (orden?.tipo === "direccion") {
      const paso = VELOCIDAD * delta;
      const siguienteX = objeto.position.x + orden.x * paso;
      const siguienteZ = objeto.position.z + orden.z * paso;
      // En el aire no se recorta: saltar por encima del agua es el sentido de
      // las piedras de paso.
      const sitio = enElAire
        ? { x: siguienteX, z: siguienteZ }
        : dentroDelMundo(siguienteX, siguienteZ);
      objeto.position.x = sitio.x;
      objeto.position.z = sitio.z;
      if (!enElAire) seguirElSuelo(objeto, delta);
      objeto.rotation.y = girarHacia(
        objeto.rotation.y,
        Math.atan2(orden.x, orden.z),
        VELOCIDAD_DE_GIRO * delta,
      );
      marcar(true);
      return;
    }

    // Un sitio señalado con el dedo o el ratón manda sobre el del guion; al
    // llegar se suelta para que el guion pueda volver a decidir.
    const senalado = orden?.tipo === "destino" ? orden.posicion : null;
    const objetivo = senalado ?? (jugadorTomoElControlRef.current ? null : destinoRef.current);

    if (!objetivo) {
      // Quien juega tiene el control y no está pidiendo nada: el personaje se
      // queda donde lo dejaron, mirando a la cámara. Pero si todavía le queda
      // altura por acomodar, hay que seguir pidiendo cuadros: si no, se queda
      // flotando a media subida, que es exactamente lo que se veía.
      const asentado = enElAire ? true : seguirElSuelo(objeto, delta);
      if (!asentado || Math.abs(objeto.rotation.y) > UMBRAL_DE_GIRO) {
        objeto.rotation.y = girarHacia(objeto.rotation.y, 0, VELOCIDAD_DE_GIRO * delta);
        marcar(true);
        return;
      }
      marcar(false);
      return;
    }
    const dx = objetivo[0] - objeto.position.x;
    const dz = objetivo[2] - objeto.position.z;
    const distancia = Math.hypot(dx, dz);

    if (distancia > UMBRAL_DE_LLEGADA) {
      const paso = Math.min(distancia, VELOCIDAD * delta);
      objeto.position.x += (dx / distancia) * paso;
      objeto.position.z += (dz / distancia) * paso;
      seguirElSuelo(objeto, delta);
      objeto.rotation.y = girarHacia(
        objeto.rotation.y,
        Math.atan2(dx, dz),
        VELOCIDAD_DE_GIRO * delta,
      );
      marcar(true);
      return;
    }

    // Ya llegó: se acomoda mirando a la cámara antes de declararse quieto.
    objeto.position.x = objetivo[0];
    objeto.position.z = objetivo[2];
    const asentadoAlLlegar = enElAire ? true : seguirElSuelo(objeto, delta);
    if (senalado && comandoDelJugador) comandoDelJugador.current = null;
    if (!asentadoAlLlegar || Math.abs(objeto.rotation.y) > UMBRAL_DE_GIRO) {
      objeto.rotation.y = girarHacia(objeto.rotation.y, 0, VELOCIDAD_DE_GIRO * delta);
      marcar(true);
      return;
    }
    objeto.rotation.y = 0;
    marcar(false);
  });
}
