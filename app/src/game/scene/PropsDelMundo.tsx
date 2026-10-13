// Props decorativos del mundo abierto (T-001-06+).
//
// Este archivo decide QUÉ props existen hoy en la isla, no todo el catálogo
// de `PROP_ASSETS`. La lista completa incluye piezas que hoy no pintan nada
// aquí; la razón de cada una está en el comentario de arriba de
// `props-del-mundo.ts` y en el reporte de esta tarea, no repetida en código.
//
// Nada de lo que hay aquí es un control: ni la brújula ni las burbujas se
// pulsan, ni abren el minijuego, ni sustituyen a la interfaz 2D (AC-6, AC-8).
// Si algún día un prop necesitara texto, ese texto entra por props desde
// arriba y sale de `content/`, igual que hace `SenalDeMision`.

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, type ReactElement } from "react";
import type { Group, Object3D } from "three";

import { PROP_ASSETS } from "../../shared/assets";
import { POSICION_DE_BRUJULA, posicionesDeBurbujas, type Punto } from "./props-del-mundo";

/**
 * Amplitud y velocidad del respirar de la brújula. Números pequeños a
 * propósito, igual que en `SenalDeMision`: es un gesto decorativo que marca
 * "esto es un objeto vivo del mundo", no una animación que compita por la
 * atención con el guion.
 */
const AMPLITUD_DE_RESPIRO = 0.05;
const VELOCIDAD_DE_RESPIRO = 1.1;

interface PropsDelMundoProps {
  /**
   * `true` solo en la isla de los acuerdos (episodio 1): la brújula es un
   * recordatorio físico de ESE episodio, no decorado genérico para todo el
   * archipiélago.
   */
  readonly mostrarBrujula: boolean;
  /**
   * Personajes del mundo abierto sobre los que poner un bocadillo. Se pasa
   * ya resuelto (id + ancla): este componente no lee `content/` ni decide
   * quién vive en el mundo, igual que `IslandScene` no decide qué isla
   * existe.
   */
  readonly personajesConBurbuja?: readonly { readonly id: string; readonly anclaje: Punto }[] | undefined;
  readonly menosMovimiento: boolean;
}

/** Clona el GLB de un prop: el mismo `Object3D` no puede repetirse en el grafo. */
function useCopiaDelProp(id: keyof typeof PROP_ASSETS): Object3D {
  const { scene } = useGLTF(PROP_ASSETS[id].modelUrl, false);
  return useMemo(() => scene.clone(true), [scene]);
}

function Brujula({ menosMovimiento }: { readonly menosMovimiento: boolean }): ReactElement {
  const modelo = useCopiaDelProp("compass");
  const grupo = useRef<Group>(null);
  const tiempo = useRef(0);
  const invalidar = useThree((estado) => estado.invalidate);

  useFrame((_estado, delta) => {
    // AC-7: con "menos movimiento" no se pide ni un cuadro más.
    if (menosMovimiento) return;
    const nodo = grupo.current;
    if (!nodo) return;
    tiempo.current += delta;
    nodo.position.y = Math.sin(tiempo.current * VELOCIDAD_DE_RESPIRO) * AMPLITUD_DE_RESPIRO;
    invalidar();
  });

  return (
    <group position={[...POSICION_DE_BRUJULA.position]}>
      <group ref={grupo}>
        <primitive object={modelo} dispose={null} />
      </group>
    </group>
  );
}

function Burbuja({ position }: { readonly position: readonly [number, number, number] }): ReactElement {
  // Sin animación propia a propósito: una burbuja por cada persona del mundo
  // respirando a la vez sería ruido visual, y lo que importa es que esté,
  // no que se mueva. El presupuesto de movimiento de la escena ya lo gasta
  // la brújula y los carteles de misión.
  const modelo = useCopiaDelProp("speech_bubble");
  return <primitive object={modelo} position={[...position]} dispose={null} />;
}

/**
 * Monta los props decorativos que hoy tienen un sitio real en el mundo.
 *
 * Se cuelga dentro del mismo `<Suspense>` que `IslandScene` en `GameCanvas`:
 * cada prop carga su propio GLB bajo demanda, así que no añade nada al
 * primer cuadro si `mostrarBrujula` es `false` y no hay personajes con
 * burbuja.
 */
export function PropsDelMundo({
  mostrarBrujula,
  personajesConBurbuja = [],
  menosMovimiento,
}: PropsDelMundoProps): ReactElement | null {
  const burbujas = useMemo(
    () => posicionesDeBurbujas(personajesConBurbuja),
    [personajesConBurbuja],
  );

  if (!mostrarBrujula && burbujas.length === 0) return null;

  return (
    <group>
      {mostrarBrujula ? <Brujula menosMovimiento={menosMovimiento} /> : null}
      {burbujas.map((burbuja) => (
        <Burbuja key={burbuja.clave} position={burbuja.position} />
      ))}
    </group>
  );
}
