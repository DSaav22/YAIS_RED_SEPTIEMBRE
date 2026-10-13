// Entrada de quien juega (T-001-06, prototipo).
//
// Escucha el teclado y guarda lo que se pide en un ref: ni un render por
// pulsación, ni un render por cuadro. `useCharacterWalk` lo lee dentro del
// bucle y lo aplica al `Group` del personaje.
//
// `prefers-reduced-motion` NO apaga estos controles. Lo apagaba hasta ahora, y
// el resultado era que con esa preferencia del sistema el mundo no se podía
// recorrer de ninguna manera: ni con teclado, ni con el joystick, ni tocando
// el suelo. Eso no es reducir el movimiento, es quitar la función.
//
// Lo que AC-7 pide apagar es lo que se mueve sin que nadie lo pida: la cámara
// que se desliza sola, el cartel que flota, la entrada caminando al empezar
// una escena. Un personaje que anda porque alguien está manteniendo una tecla
// es la respuesta a una acción deliberada, y quitarla deja fuera justo a quien
// la preferencia intentaba proteger.

import { useCallback, useEffect, useRef, type RefObject } from "react";

import {
  VELOCIDAD_DE_ORBITA,
  VELOCIDAD_DE_SEGUIMIENTO_DE_MARCHA,
  direccionRelativaALaCamara,
  giroDeTeclas,
  girarYawHacia,
  normalizarAngulo,
  yawDetrasDeLaMarcha,
} from "./camara";
import { dentroDelMundo, direccionDeTeclas, type ComandoDeJugador } from "./control-del-jugador";
import type { EntradaTactil } from "./entrada-tactil";
import { empezarGesto, moverGesto, terminarGesto, type GestoDePuntero } from "./orbita-con-puntero";

interface ControlDelJugador {
  /** `true` durante el cuadro en que se pidió saltar; se consume al leerlo. */
  readonly tomarSaltoPedido: () => boolean;
  /** Pedir un salto desde un botón en pantalla. */
  readonly pedirSalto: () => void;
  /** Lo que se está pidiendo ahora mismo, o `null` si nadie toca nada. */
  readonly comando: RefObject<ComandoDeJugador | null>;
  /** Señalar un sitio de la isla al que caminar (toque o clic). */
  readonly irA: (x: number, z: number) => void;
  /** Hacia dónde mira la cámara ahora mismo, en radianes. */
  readonly yaw: RefObject<number>;
  /**
   * Adelanta un cuadro: gira la cámara si se está pidiendo y vuelve a
   * proyectar la dirección de las teclas sobre el nuevo ángulo.
   *
   * Lo llama el bucle de render. Vive aquí, y no en el componente de la
   * cámara, porque el giro y la dirección de caminar son la misma decisión:
   * si se actualizaran por separado, «adelante» iría un cuadro por detrás de
   * hacia dónde se mira.
   */
  readonly avanzarCuadro: (delta: number) => void;
  /** Gira la cámara de golpe, para un botón activado con teclado. */
  readonly girarDeGolpe: (radianes: number) => void;
  /**
   * Arrastrar sobre el mundo. Empieza siempre como candidato a toque: solo
   * cuando el puntero se mueve lo bastante se convierte en un giro de cámara,
   * y entonces `terminarArrastre` devuelve `esToque: false` para que soltar
   * no mande además a caminar (`orbita-con-puntero.ts`).
   */
  readonly empezarArrastre: (x: number, y: number) => void;
  readonly moverArrastre: (x: number, y: number) => void;
  readonly terminarArrastre: () => { readonly esToque: boolean };
}

interface OpcionesDeControl {
  /** Se llama cuando entra una orden nueva, para reencender el bucle. */
  readonly alRecibirOrden: () => void;
  /**
   * Se llama al empezar y al terminar de girar la cámara. Girar sin caminar
   * también tiene que mantener encendido el bucle de render; sin esto, la
   * cámara se movía un cuadro y se quedaba parada.
   */
  readonly alCambiarGiro?: ((girando: boolean) => void) | undefined;
  /**
   * Lo que piden los controles en pantalla, si los hay. Se lee por cuadro
   * desde el bucle, nunca por render: ver `entrada-tactil.ts`.
   */
  readonly entradaTactil?: { readonly current: EntradaTactil } | undefined;
  /**
   * Con esta preferencia activa, la cámara no se reacomoda sola detrás de
   * quien camina: solo gira si alguien lo pide con Q/E, un botón o un
   * arrastre (AC-7; ver `VELOCIDAD_DE_SEGUIMIENTO_DE_MARCHA` en `camara.ts`).
   */
  readonly menosMovimiento?: boolean | undefined;
}

export function useControlDelJugador({
  alRecibirOrden,
  alCambiarGiro,
  entradaTactil,
  menosMovimiento = false,
}: OpcionesDeControl): ControlDelJugador {
  const comando = useRef<ComandoDeJugador | null>(null);
  const yaw = useRef(0);
  /** Lo que piden las teclas, sin girar todavía por la cámara. */
  const direccionCruda = useRef<{ x: number; z: number } | null>(null);
  /** -1, 0 o 1: hacia dónde se está pidiendo girar la cámara. */
  const giro = useRef(0);

  /** Gesto de arrastre en curso sobre el mundo, si lo hay. */
  const gesto = useRef<GestoDePuntero | null>(null);

  /* El salto se guarda como una petición pendiente y la consume el bucle en
     el cuadro siguiente. Si se llamara directamente desde el manejador de
     teclado, mantener la barra pulsada saltaría sesenta veces por segundo. */
  const saltoPedido = useRef(false);

  const pedirSalto = useCallback(() => {
    saltoPedido.current = true;
    alRecibirOrden();
  }, [alRecibirOrden]);

  const tomarSaltoPedido = useCallback(() => {
    if (!saltoPedido.current) return false;
    saltoPedido.current = false;
    return true;
  }, []);

  /* La caja de los controles en pantalla se guarda en un ref propio y se
     sincroniza en un efecto, nunca durante el render: leer `.current` de una
     prop dentro de una función memorizada rompe la memorización que el
     compilador de React ya había hecho, y el bucle de cuadro no puede
     recrearse cada vez que cambie una prop. */
  const cajaTactil = useRef(entradaTactil);
  useEffect(() => {
    cajaTactil.current = entradaTactil;
  }, [entradaTactil]);

  const girarDeGolpe = useCallback((radianes: number) => {
    yaw.current = normalizarAngulo(yaw.current + radianes);
  }, []);

  const empezarArrastre = useCallback((x: number, y: number) => {
    gesto.current = empezarGesto(x, y);
  }, []);

  const moverArrastre = useCallback((x: number, y: number) => {
    const enCurso = gesto.current;
    if (!enCurso) return;
    const { gesto: siguiente, giro: avance } = moverGesto(enCurso, x, y);
    gesto.current = siguiente;
    if (avance !== 0) yaw.current = normalizarAngulo(yaw.current + avance);
  }, []);

  const terminarArrastre = useCallback(() => {
    const enCurso = gesto.current;
    gesto.current = null;
    // Sin gesto en curso no hubo toque: soltar fuera del mundo no camina.
    return enCurso ? terminarGesto(enCurso) : { esToque: false };
  }, []);

  const avanzarCuadro = useCallback(
    (delta: number) => {
      const tactil = cajaTactil.current?.current;

      const giroPedido = giro.current + (tactil?.giro ?? 0);
      if (giroPedido !== 0) {
        yaw.current = normalizarAngulo(
          yaw.current + Math.sign(giroPedido) * VELOCIDAD_DE_ORBITA * delta,
        );
      }

      // El teclado manda sobre el joystick: si alguien tiene una tecla
      // pulsada, no se le contradice desde la pantalla.
      const cruda = direccionCruda.current ?? tactil?.direccion ?? null;
      if (!cruda) {
        // Soltar tiene que parar. Solo se limpia una orden de dirección: un
        // destino señalado con el dedo sigue vivo hasta que se llega.
        if (comando.current?.tipo === "direccion") comando.current = null;
        return;
      }
      // Un destino señalado no se reproyecta: es un sitio del mundo, no una
      // dirección, y girar la cámara no lo mueve.
      const { x, z } = direccionRelativaALaCamara(cruda, yaw.current);
      comando.current = { tipo: "direccion", x, z };

      /* La cámara se acomoda sola detrás de hacia dónde se está caminando
         (`yawDetrasDeLaMarcha`, el mismo ángulo al que gira el personaje en
         `useCharacterWalk.ts`), pero solo cuando nadie la está girando a
         propósito: ni este mismo cuadro con Q/E o un botón (`giroPedido`),
         ni con un arrastre en curso (`gesto.current`). Sin esa comprobación,
         el ajuste automático pelearía contra el giro que alguien acaba de
         pedir. Con `menosMovimiento` no se ajusta nunca: es un giro de
         cámara por su cuenta, justo lo que AC-7 vigila más de cerca. */
      if (giroPedido === 0 && !gesto.current && !menosMovimiento) {
        const anguloDeMarcha = Math.atan2(x, z);
        yaw.current = girarYawHacia(
          yaw.current,
          yawDetrasDeLaMarcha(anguloDeMarcha),
          VELOCIDAD_DE_SEGUIMIENTO_DE_MARCHA * delta,
        );
      }
    },
    [menosMovimiento],
  );

  const irA = useCallback(
    (x: number, z: number) => {
      // Se acepta cualquier punto y se acerca al sitio alcanzable más
      // próximo: pedirle a un niño de seis años que acierte al suelo exacto
      // convierte el control en algo que "a veces no funciona".
      const sitio = dentroDelMundo(x, z);
      comando.current = { tipo: "destino", posicion: [sitio.x, 0, sitio.z] };
      alRecibirOrden();
    },
    [alRecibirOrden],
  );

  useEffect(() => {
    const teclasPulsadas = new Set<string>();

    function recalcular(): void {
      const direccion = direccionDeTeclas(teclasPulsadas);
      direccionCruda.current = direccion;
      if (direccion) {
        const girada = direccionRelativaALaCamara(direccion, yaw.current);
        comando.current = { tipo: "direccion", x: girada.x, z: girada.z };
        alRecibirOrden();
      } else {
        comando.current = null;
      }

      const giroPedido = giroDeTeclas(teclasPulsadas);
      if (giroPedido !== giro.current) {
        giro.current = giroPedido;
        alCambiarGiro?.(giroPedido !== 0);
      }
    }

    function esTeclaDelMundo(code: string): boolean {
      return direccionDeTeclas([code]) !== null || giroDeTeclas([code]) !== 0;
    }

    function alPulsar(evento: KeyboardEvent): void {
      // Con un modificador pulsado esto es un atajo del navegador o del
      // sistema, no una orden de caminar.
      if (evento.ctrlKey || evento.altKey || evento.metaKey) return;

      /* La barra salta, pero solo si no hay ningún control con el foco: es
         también con lo que el navegador activa un botón, y robársela dejaría
         sin poder pulsar a quien juega con teclado (el mismo problema que ya
         apareció en el minijuego de chocar las manos). */
      if (evento.code === "Space") {
        const enfocado = document.activeElement;
        const esControl =
          enfocado instanceof HTMLButtonElement ||
          enfocado instanceof HTMLInputElement ||
          enfocado instanceof HTMLSelectElement ||
          enfocado instanceof HTMLAnchorElement ||
          enfocado instanceof HTMLDetailsElement;
        if (esControl) return;
        evento.preventDefault();
        if (!evento.repeat) pedirSalto();
        return;
      }
      if (!esTeclaDelMundo(evento.code)) return;
      teclasPulsadas.add(evento.code);
      recalcular();
    }

    function alSoltar(evento: KeyboardEvent): void {
      if (!teclasPulsadas.delete(evento.code)) return;
      recalcular();
    }

    /** Si la ventana pierde el foco, nadie sigue apretando nada. */
    function alPerderFoco(): void {
      teclasPulsadas.clear();
      recalcular();
    }

    window.addEventListener("keydown", alPulsar);
    window.addEventListener("keyup", alSoltar);
    window.addEventListener("blur", alPerderFoco);
    return () => {
      window.removeEventListener("keydown", alPulsar);
      window.removeEventListener("keyup", alSoltar);
      window.removeEventListener("blur", alPerderFoco);
      comando.current = null;
      direccionCruda.current = null;
      giro.current = 0;
    };
  }, [alRecibirOrden, alCambiarGiro, pedirSalto]);

  return {
    tomarSaltoPedido,
    pedirSalto,
    comando,
    irA,
    yaw,
    avanzarCuadro,
    girarDeGolpe,
    empezarArrastre,
    moverArrastre,
    terminarArrastre,
  };
}
