// Tests de las transiciones de clip (T-001-06).
//
// No hace falta WebGL para probar esto: lo que se decide aquí es qué acción
// se reproduce, cómo se reproduce y cuándo se vuelve a `Idle`. Las acciones y
// el mixer se reemplazan por dobles que registran lo que reciben, así que el
// test comprueba el comportamiento real del hook y no una imitación de Three.

import { renderHook } from "@testing-library/react";
import { LoopOnce, LoopRepeat, type AnimationAction, type AnimationMixer } from "three";
import { describe, expect, it, vi } from "vitest";

import type { RuntimeClip } from "../../shared/assets";
import { useCharacterAnimation } from "./useCharacterAnimation";

interface AccionFalsa {
  readonly nombre: string;
  readonly llamadas: string[];
  paused: boolean;
  enabled: boolean;
  clampWhenFinished: boolean;
  loop: number | null;
  repeticiones: number | null;
  mezcladaDesde: string | null;
}

function crearAccion(nombre: string): AccionFalsa & AnimationAction {
  const accion = {
    nombre,
    llamadas: [] as string[],
    paused: false,
    enabled: false,
    clampWhenFinished: false,
    loop: null as number | null,
    repeticiones: null as number | null,
    mezcladaDesde: null as string | null,
    reset() {
      accion.llamadas.push("reset");
      return accion;
    },
    play() {
      accion.llamadas.push("play");
      return accion;
    },
    fadeIn() {
      accion.llamadas.push("fadeIn");
      return accion;
    },
    setLoop(modo: number, repeticiones: number) {
      accion.loop = modo;
      accion.repeticiones = repeticiones;
      return accion;
    },
    crossFadeFrom(anterior: AccionFalsa) {
      accion.mezcladaDesde = anterior.nombre;
      accion.llamadas.push("crossFadeFrom");
      return accion;
    },
  };
  return accion as unknown as AccionFalsa & AnimationAction;
}

interface MixerFalso {
  readonly mixer: AnimationMixer;
  readonly detuvoTodo: () => boolean;
  readonly terminar: (accion: AnimationAction) => void;
}

function crearMixer(): MixerFalso {
  const escuchas: ((evento: { action: AnimationAction }) => void)[] = [];
  let detuvoTodo = false;

  const mixer = {
    stopAllAction() {
      detuvoTodo = true;
    },
    addEventListener(_tipo: string, escucha: (evento: { action: AnimationAction }) => void) {
      escuchas.push(escucha);
    },
    removeEventListener(_tipo: string, escucha: (evento: { action: AnimationAction }) => void) {
      const indice = escuchas.indexOf(escucha);
      if (indice >= 0) escuchas.splice(indice, 1);
    },
  };

  return {
    mixer: mixer as unknown as AnimationMixer,
    detuvoTodo: () => detuvoTodo,
    terminar: (accion) => {
      for (const escucha of [...escuchas]) escucha({ action: accion });
    },
  };
}

function montar(clip: RuntimeClip, menosMovimiento = false) {
  const idle = crearAccion("Idle");
  const wave = crearAccion("Wave");
  const listen = crearAccion("Listen");
  const walk = crearAccion("Walk");
  const acciones = { Idle: idle, Wave: wave, Listen: listen, Walk: walk };
  const { mixer, detuvoTodo, terminar } = crearMixer();
  const alCambiarActividad = vi.fn();

  const vista = renderHook(
    (props: { clip: RuntimeClip; menosMovimiento: boolean }) =>
      useCharacterAnimation({
        acciones,
        mixer,
        clip: props.clip,
        menosMovimiento: props.menosMovimiento,
        alCambiarActividad,
      }),
    { initialProps: { clip, menosMovimiento } },
  );

  return { idle, wave, listen, walk, alCambiarActividad, detuvoTodo, terminar, vista };
}

describe("useCharacterAnimation", () => {
  it("un gesto puntual suena una sola vez y se congela en su último cuadro", () => {
    const { wave, alCambiarActividad } = montar("Wave");

    expect(wave.loop).toBe(LoopOnce);
    expect(wave.repeticiones).toBe(1);
    expect(wave.clampWhenFinished).toBe(true);
    expect(wave.llamadas).toContain("play");
    expect(alCambiarActividad).toHaveBeenCalledWith(true);
  });

  it("al terminar el gesto vuelve a Idle sin cortar la mezcla", () => {
    vi.useFakeTimers();
    try {
      const { wave, idle, alCambiarActividad, terminar } = montar("Wave");
      alCambiarActividad.mockClear();

      terminar(wave as unknown as AnimationAction);

      expect(idle.mezcladaDesde).toBe("Wave");
      expect(idle.loop).toBe(LoopRepeat);
      expect(idle.llamadas).toContain("play");
      // Todavía no: si el canvas dejara de dibujar aquí, el personaje se
      // quedaría a medio camino entre el gesto y el reposo.
      expect(alCambiarActividad).not.toHaveBeenCalledWith(false);

      vi.advanceTimersByTime(400);
      expect(alCambiarActividad).toHaveBeenLastCalledWith(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("un estado sostenido se mantiene en bucle", () => {
    const { listen } = montar("Listen");

    expect(listen.loop).toBe(LoopRepeat);
    expect(listen.repeticiones).toBe(Infinity);
    expect(listen.clampWhenFinished).toBe(false);
  });

  it("escuchar mantiene viva la escena mientras el niño decide", () => {
    vi.useFakeTimers();
    try {
      const { alCambiarActividad } = montar("Listen");

      vi.advanceTimersByTime(2000);

      // Congelar a quien espera una respuesta se lee como que el juego se
      // colgó: aquí el bucle se queda encendido a propósito.
      expect(alCambiarActividad).toHaveBeenLastCalledWith(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("el reposo de quien solo acompaña deja de mantener viva la escena", () => {
    vi.useFakeTimers();
    try {
      const { alCambiarActividad } = montar("Idle");

      // Antes esto no ocurría nunca: `Idle` encendía el bucle y nada lo
      // apagaba, así que bastaba un segundo personaje en escena para que el
      // canvas dibujara para siempre (revisión de a11y-perf-reviewer).
      expect(alCambiarActividad).toHaveBeenLastCalledWith(true);
      vi.advanceTimersByTime(400);
      expect(alCambiarActividad).toHaveBeenLastCalledWith(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("cambiar de clip mezcla desde el anterior, sin cortes secos", () => {
    const { listen, vista } = montar("Wave");

    vista.rerender({ clip: "Listen", menosMovimiento: false });

    expect(listen.mezcladaDesde).toBe("Wave");
  });

  it("con menos movimiento no reproduce nada y deja la pose de reposo quieta", () => {
    const { idle, wave, alCambiarActividad, detuvoTodo } = montar("Wave", true);

    expect(detuvoTodo()).toBe(true);
    expect(idle.paused).toBe(true);
    expect(wave.llamadas).not.toContain("play");
    expect(alCambiarActividad).toHaveBeenCalledWith(false);
  });

  it("con menos movimiento SÍ anima la locomoción que pide quien juega", () => {
    // Confirma el reporte de campo: "el capibara no tiene activado su efecto
    // de caminar". `useCharacterWalk` ya solo pide este clip cuando hay una
    // orden real de quien juega (nunca para un NPC ni para la entrada de
    // escena), así que congelarlo aquí producía un personaje deslizándose
    // sin mover las patas.
    const { walk, idle, alCambiarActividad, detuvoTodo } = montar("Walk", true);

    expect(detuvoTodo()).toBe(false);
    expect(idle.paused).toBe(false);
    expect(walk.llamadas).toContain("play");
    expect(walk.loop).toBe(LoopRepeat);
    expect(walk.repeticiones).toBe(Infinity);
    expect(alCambiarActividad).toHaveBeenCalledWith(true);
  });

  it("con menos movimiento el resto de clips sigue congelado, incluida Listen", () => {
    // Solo la locomoción real es la excepción (AC-7): un bucle de escucha
    // ambiental no es una acción que alguien haya pedido con el cuerpo.
    const { listen, alCambiarActividad, detuvoTodo } = montar("Listen", true);

    expect(detuvoTodo()).toBe(true);
    expect(listen.llamadas).not.toContain("play");
    expect(alCambiarActividad).toHaveBeenCalledWith(false);
  });

  it("un clip que el personaje no tiene cae en el reposo, no rompe", () => {
    const { idle } = montar("Roll");

    expect(idle.llamadas).toContain("play");
  });
});
