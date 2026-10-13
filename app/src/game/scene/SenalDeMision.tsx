// Señal de misión (cartel flotante sobre un punto de encuentro).
//
// Quien juega ve el archipiélago desde lejos y necesita saber a dónde ir sin
// tener que caminar a ciegas. Este componente dibuja el cartel que marca
// ese destino, con más presencia cuando ya se está cerca del claro.
//
// Se usa `Html` de drei (DOM real superpuesto), nunca `Text`: `Text`
// descargaría una tipografía de un CDN, y este proyecto no puede pedir nada
// a la red (ver `Character.tsx` sobre Draco por la misma razón).

import { Html } from "@react-three/drei";
import { useRef, type ReactElement } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";

interface SenalDeMisionProps {
  /** Dónde va la señal, en coordenadas del mundo. */
  readonly posicion: readonly [number, number];
  /** Lo que dice el cartel. Viene del contenido, nunca escrito aquí. */
  readonly texto: string;
  /** `true` cuando el personaje ya está dentro del radio del claro. */
  readonly cerca: boolean;
  readonly menosMovimiento: boolean;
}

// Altura del cartel sobre el suelo. A 3,4 quedaba por encima de los árboles
// (el más alto del kit mide ~2,92) pero se salía por arriba de la pantalla en
// cuanto uno se acercaba, y en un celular vertical se comía el distintivo de
// borrador, que no puede quedar tapado por nada (AC-10). A 2,4 se ve entero
// desde lejos y desde cerca, que es lo que tiene que hacer una señal.
const ALTURA_DEL_CARTEL = 2.4;

// Recorrido y velocidad del flotar suave. Números pequeños a propósito: es
// un gesto decorativo, no debe distraer de la lectura del texto.
const AMPLITUD_DE_FLOTE = 0.12;
const VELOCIDAD_DE_FLOTE = 1.4;

export function SenalDeMision({ posicion, texto, cerca, menosMovimiento }: SenalDeMisionProps): ReactElement {
  const grupo = useRef<Group>(null);
  const tiempo = useRef(0);
  const invalidar = useThree((estado) => estado.invalidate);

  // Mutar `position.y` de un `Group` de Three dentro de `useFrame` es la
  // forma correcta de animar en R3F: el objeto no es estado de React, es el
  // grafo de escena.
  useFrame((_estado, delta) => {
    // AC-7 es un requisito duro: con "menos movimiento" la señal no se
    // toca, ni una vez. No solo se congela la animación: no se pide ni un
    // cuadro más, para no mantener la GPU encendida en modo `demand`.
    if (menosMovimiento) return;
    const nodo = grupo.current;
    if (!nodo) return;
    tiempo.current += delta;
    nodo.position.y = Math.sin(tiempo.current * VELOCIDAD_DE_FLOTE) * AMPLITUD_DE_FLOTE;
    // El bucle está en modo `frameloop="demand"`: sin pedir un cuadro más,
    // el flotar se detendría en el primer fotograma dibujado.
    invalidar();
  });

  return (
    <group position={[posicion[0], ALTURA_DEL_CARTEL, posicion[1]]}>
      <group ref={grupo}>
        {/* `distanceFactor` bajo: con 10 el cartel tapaba media pantalla al
            estar delante, y el mundo dejaba de verse. Con 6 se lee desde la
            isla de al lado sin comerse el encuadre. */}
        <Html center distanceFactor={6} occlude={false} zIndexRange={[0, 0]} transform={false}>
          {/* Decorativo: la escena 3D entera va `aria-hidden` porque la ruta
              accesible es la interfaz 2D (ver EscenaDelEpisodio.tsx). El
              cartel tampoco es clicable: es una señal visual, no un botón. */}
          <div
            aria-hidden="true"
            style={{
              pointerEvents: "none",
              userSelect: "none",
              padding: cerca ? "10px 18px" : "8px 14px",
              borderRadius: "14px",
              // Cerca vs. lejos no se distingue solo por color (Constitución
              // VII): también cambian el tamaño de letra, el grosor del
              // borde y la opacidad, así que se nota igual sin percibir
              // matices de tono.
              fontSize: cerca ? "17px" : "14px",
              fontWeight: cerca ? 800 : 600,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              color: "#0b1d33",
              background: cerca ? "#ffffff" : "rgba(255, 255, 255, 0.88)",
              border: cerca ? "3px solid #0b1d33" : "2px solid rgba(11, 29, 51, 0.55)",
              boxShadow: cerca
                ? "0 4px 14px rgba(0, 0, 0, 0.35)"
                : "0 2px 8px rgba(0, 0, 0, 0.22)",
              fontFamily: "system-ui, sans-serif",
              textAlign: "center",
            }}
          >
            {texto}
          </div>
        </Html>
      </group>
    </group>
  );
}
