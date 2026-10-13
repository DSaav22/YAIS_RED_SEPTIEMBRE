// Controles táctiles en pantalla para caminar y girar la cámara, pensados
// para tablet y celular: un joystick virtual a la izquierda (como en un
// juego de plataformas 3D) y dos botones de giro a la derecha.
//
// El teclado sigue siendo la ruta accesible que manda (ver
// `control-del-jugador.ts` y `camara.ts`); esto es una capa de entrada más,
// no un reemplazo. Por eso los botones de girar son botones de verdad
// (`type="button"`, `aria-label`), y no una superficie de arrastre: un
// lector de pantalla los anuncia y se activan con teclado como cualquier
// otro botón de la interfaz.

import { useCallback, useRef, type JSX, type PointerEvent as ReactPointerEvent } from "react";

import { RADIO_DEL_JOYSTICK, direccionDeArrastre } from "./control-tactil";

import "../../shared/styles/controles-tactiles.css";

interface ControlesTactilesProps {
  readonly alCambiarDireccion: (direccion: { x: number; z: number } | null) => void;
  readonly alGirarCamara: (giro: -1 | 0 | 1) => void;
  /**
   * Gira un paso de golpe. Hace falta para el teclado: un botón pulsado con
   * Enter no se «mantiene», se activa, así que `pointerdown`/`pointerup` no
   * llegan nunca y el botón no hacía nada de lo que su `aria-label` promete.
   */
  readonly alGirarUnPaso: (sentido: -1 | 1) => void;
  readonly alSaltar: () => void;
}

export function ControlesTactiles({
  alCambiarDireccion,
  alGirarCamara,
  alGirarUnPaso,
  alSaltar,
}: ControlesTactilesProps): JSX.Element {
  /* `detail === 0` distingue el clic que genera el teclado del que genera un
     dedo o un ratón. Sin esa comprobación, cada toque giraría dos veces: una
     mientras se mantiene y otra por el `click` que llega al soltar. */
  const alActivarConTeclado = useCallback(
    (sentido: -1 | 1) => (evento: { readonly detail: number }) => {
      if (evento.detail !== 0) return;
      alGirarUnPaso(sentido);
    },
    [alGirarUnPaso],
  );
  // El centro del joystick se guarda en un ref, no en estado: cambia en cada
  // `pointermove` y un render por cuadro de arrastre es trabajo que la
  // interfaz no necesita hacer (la posición visual del pulgar la mueve CSS
  // por su cuenta si hiciera falta, y hoy ni eso: el círculo se queda fijo).
  const centroDelJoystick = useRef<{ x: number; y: number } | null>(null);
  const idDelPuntero = useRef<number | null>(null);
  /* El pulgar se mueve escribiendo dos variables CSS en el nodo, no por
     estado de React: arrastrar dispara un `pointermove` por cuadro y un
     render por cuadro es justo lo que la escena no puede permitirse. */
  const pulgar = useRef<HTMLDivElement>(null);

  const moverElPulgar = useCallback((dx: number, dy: number) => {
    const nodo = pulgar.current;
    if (!nodo) return;
    nodo.style.setProperty("--empuje-x", `${dx}px`);
    nodo.style.setProperty("--empuje-y", `${dy}px`);
  }, []);

  const soltarJoystick = useCallback(() => {
    centroDelJoystick.current = null;
    idDelPuntero.current = null;
    moverElPulgar(0, 0);
    alCambiarDireccion(null);
  }, [alCambiarDireccion, moverElPulgar]);

  const alBajarElDedo = useCallback((evento: ReactPointerEvent<HTMLDivElement>) => {
    const objetivo = evento.currentTarget;
    objetivo.setPointerCapture(evento.pointerId);
    idDelPuntero.current = evento.pointerId;
    centroDelJoystick.current = { x: evento.clientX, y: evento.clientY };
  }, []);

  const alMoverElDedo = useCallback(
    (evento: ReactPointerEvent<HTMLDivElement>) => {
      const centro = centroDelJoystick.current;
      if (!centro || idDelPuntero.current !== evento.pointerId) return;
      const direccion = direccionDeArrastre(
        centro,
        { x: evento.clientX, y: evento.clientY },
        RADIO_DEL_JOYSTICK,
      );
      alCambiarDireccion(direccion);
      // El pulgar se queda dentro del anillo aunque el dedo salga: enseña
      // cuánto se está pidiendo, que está topado en el radio.
      const dx = evento.clientX - centro.x;
      const dy = evento.clientY - centro.y;
      const largo = Math.hypot(dx, dy);
      const factor = largo > RADIO_DEL_JOYSTICK ? RADIO_DEL_JOYSTICK / largo : 1;
      moverElPulgar(dx * factor, dy * factor);
    },
    [alCambiarDireccion, moverElPulgar],
  );

  return (
    <div className="controles-tactiles" aria-hidden="false">
      {/* `touch-action: none` en CSS evita que arrastrar el pulgar haga scroll
          de la página: sin eso, el primer intento de caminar mueve la
          ventana en vez del personaje. */}
      <div
        className="controles-tactiles__joystick"
        role="presentation"
        onPointerDown={alBajarElDedo}
        onPointerMove={alMoverElDedo}
        onPointerUp={soltarJoystick}
        onPointerCancel={soltarJoystick}
        onLostPointerCapture={soltarJoystick}
      >
        <div className="controles-tactiles__joystick-base" ref={pulgar} />
      </div>

      <div className="controles-tactiles__camara">
        <button
          type="button"
          className="objetivo-tactil controles-tactiles__boton-camara controles-tactiles__boton-saltar"
          aria-label="Saltar"
          onClick={alSaltar}
        >
          ⤒
        </button>
        <button
          type="button"
          className="objetivo-tactil controles-tactiles__boton-camara"
          aria-label="Girar la cámara a la izquierda"
          onClick={alActivarConTeclado(-1)}
          onPointerDown={() => alGirarCamara(-1)}
          onPointerUp={() => alGirarCamara(0)}
          onPointerCancel={() => alGirarCamara(0)}
          onLostPointerCapture={() => alGirarCamara(0)}
        >
          ↺
        </button>
        <button
          type="button"
          className="objetivo-tactil controles-tactiles__boton-camara"
          aria-label="Girar la cámara a la derecha"
          onClick={alActivarConTeclado(1)}
          onPointerDown={() => alGirarCamara(1)}
          onPointerUp={() => alGirarCamara(0)}
          onPointerCancel={() => alGirarCamara(0)}
          onLostPointerCapture={() => alGirarCamara(0)}
        >
          ↻
        </button>
      </div>
    </div>
  );
}
