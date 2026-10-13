// El lienzo 3D (T-001-06).
//
// Este módulo es el único que importa Three y React Three Fiber, y se carga
// con `import()` desde `EscenaDelEpisodio`: un equipo sin WebGL no descarga
// el motor 3D, y el fallback 2D no paga su peso (revisión de
// a11y-perf-reviewer, T-001-05).
//
// Bucle de render: `frameloop="demand"` mientras la escena está quieta, y
// `"always"` solo mientras algún personaje se mueve. Una laptop de aula no
// tiene que dibujar 60 veces por segundo un personaje que está esperando a
// que alguien pulse un botón (Constitución VI). Con `prefers-reduced-motion`
// el bucle no se enciende nunca.
//
// La escena es decorado: no recibe foco, no tiene controles y el envoltorio
// que la contiene va `aria-hidden` (lo pone `EscenaDelEpisodio`). Todo lo que
// hay que leer, elegir o escuchar vive en la interfaz 2D, que es la ruta
// accesible y la que sigue funcionando sola (AC-8).

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Group, WebGLRenderer } from "three";

import type { CharacterId } from "../../shared/assets";
import {
  ALTURA_DE_CAMARA,
  ALTURA_DE_MIRA,
  RADIO_DE_CAMARA,
  SUAVIDAD_DE_CAMARA,
  posicionDeCamara,
} from "./camara";
import { puntoDeEncuentroCercano } from "./cercania";
import { avanzarDeambular, crearEstadoDeDeambular } from "./deambular";
import { encuentroCercano, type EncuentroEnElMundo } from "./encuentros-del-mundo";
import { PropsDelMundo } from "./PropsDelMundo";
import type { EntradaTactil } from "./entrada-tactil";
import { Character } from "./Character";
import { SenalDeMision } from "./SenalDeMision";
import type { EstadoDeEscena } from "./estado-de-escena";
import { IslandScene } from "./IslandScene";
import { alturaDelSuelo, PUNTO_DE_PARTIDA } from "./mundo";
import { destinoDe } from "./posiciones";
import { useControlDelJugador } from "./useControlDelJugador";

interface GameCanvasProps {
  /**
   * Lo que el guion pide representar, o `null` cuando no hay episodio en
   * curso y el mundo es solo un sitio por el que andar. En exploracion no se
   * monta a nadie mas que a Capi: los demas personajes aparecen cuando su
   * escena los llama.
   */
  readonly escena: EstadoDeEscena | null;
  readonly menosMovimiento: boolean;
  /**
   * Se llama si el navegador pierde el contexto WebGL: una laptop vieja
   * sosteniendo un proyector varias horas puede llegar ahí. No es una
   * excepción de JavaScript, así que un límite de error no la atrapa; hay que
   * escuchar el evento (revisión de a11y-perf-reviewer).
   */
  readonly alPerderContexto: () => void;
  /**
   * Se llama al entrar o salir del claro de una isla con episodio, con su
   * `id` o con `null`. Quien esta arriba decide que ofrecer; aqui no se entra
   * a ningun sitio solo (ver `cercania.ts`).
   */
  readonly alCambiarCercania?: ((episodioId: string | null) => void) | undefined;
  /**
   * Los carteles que flotan sobre los claros. El texto llega ya resuelto
   * desde arriba: este módulo no lee `content/`, igual que no lee rutas de
   * arte (AGENTS.md).
   */
  readonly senales?: readonly SenalDelMundo[] | undefined;
  /** Lo que piden los controles en pantalla, si están montados. */
  readonly entradaTactil?: { readonly current: EntradaTactil } | undefined;
  /** `true` mientras un dedo está sobre ellos: mantiene vivo el bucle. */
  readonly tactilActivo?: boolean | undefined;
  /**
   * Se entrega hacia arriba para que los controles del DOM, que viven fuera
   * del lienzo, puedan girar la cámara de un paso con el teclado.
   */
  readonly alTenerGiroDeGolpe?: ((girar: (radianes: number) => void) => void) | undefined;
  /**
   * Entrega hacia arriba la orden de caminar a un punto del mundo. La usa la
   * lista de islas: elegir una isla manda al personaje a andar hasta ella, no
   * abre el episodio. Quien juega sigue viendo el camino.
   */
  readonly alTenerIrA?: ((irA: (x: number, z: number) => void) => void) | undefined;
  /** Entrega hacia arriba la orden de saltar, para el botón en pantalla. */
  readonly alTenerSalto?: ((saltar: () => void) => void) | undefined;
  /** Personajes que están en el mundo y con los que se puede hablar. */
  readonly encuentros?: readonly EncuentroEnElMundo[] | undefined;
  /** Se llama al llegar o irse de al lado de uno de ellos, con su `id`. */
  readonly alCambiarEncuentro?: ((encuentroId: string | null) => void) | undefined;
}

export interface SenalDelMundo {
  readonly clave: string;
  readonly episodioId: string;
  readonly posicion: readonly [number, number];
  readonly texto: string;
}

/**
 * Personaje que mueve quien juega. Es la mascota: acompaña al niño en todo el
 * episodio y está en el reparto de las siete escenas. Mover a Capi no dispara
 * ninguna línea ni cambia de escena —el guion no tiene coordenadas—, así que
 * el episodio se juega igual sin tocarlo (AC-8).
 */
const PERSONAJE_DEL_JUGADOR: CharacterId = "capi";

/**
 * Identidad de escena mientras se explora. Es constante a proposito: el
 * personaje solo se recoloca al empezar una escena del guion, y andar por el
 * mundo no es empezar ninguna.
 */
const SCENE_ID_DE_EXPLORACION = "mundo-libre";

/**
 * Dónde aparece Capi al abrir el juego. Lo decide `mundo.ts`, que lo pone
 * lejos de todos los claros para que lo primero no sea un cartel pidiendo
 * empezar un episodio.
 */
const POSICION_LIBRE = [PUNTO_DE_PARTIDA[0], 0, PUNTO_DE_PARTIDA[1]] as const;

/** Ni entorno del guion ni variables de sesion: en el mundo no hay episodio. */
const SIN_ENTORNO: Readonly<Record<string, never>> = {};

/**
 * Camara que sigue al personaje y gira alrededor de el cuando quien juega lo
 * pide con Q y E. Las distancias y la matematica viven en `camara.ts`, que es
 * puro y esta probado.
 *
 * Con `prefers-reduced-motion` no se interpola: la camara se coloca de una
 * vez donde toca, sin recorrido (AC-7).
 */
function CamaraQueSigue({
  objetivo,
  menosMovimiento,
  yaw,
  avanzarCuadro,
}: {
  readonly objetivo: React.RefObject<Group | null>;
  readonly menosMovimiento: boolean;
  readonly yaw: React.RefObject<number>;
  readonly avanzarCuadro: (delta: number) => void;
}) {
  // Con `frameloop="demand"` el bucle se apaga en cuanto el personaje se
  // para, y la cámara se quedaba congelada a mitad de su recorrido —mirando a
  // un árbol— porque le faltaban cuadros para terminar de acercarse. Pedir un
  // cuadro más mientras quede distancia lo resuelve sin dejar el bucle
  // encendido: cuando llega, deja de pedirlos (Constitución VI).
  const pedirOtroCuadro = useThree((estado) => estado.invalidate);

  /**
   * Suelo bajo el personaje, para la altura de la cámara — no la `y` real del
   * `Group`, que durante un salto sube y baja con él.
   *
   * Antes esta función usaba `seguido.position.y` directo, así que la cámara
   * perseguía el salto entero: subía casi al mismo ritmo que el personaje
   * (`SUAVIDAD_DE_CAMARA` la acerca un ~35% de lo que falta por cuadro a 60
   * fps, y el salto dura 1 s) y el salto se veía como casi nada, un pequeño
   * temblor en vez de un salto — el reporte de que "no se nota" o "no
   * funciona" tenía razón, y no era un problema de si el salto ocurría (si
   * ocurre: la física en `salto.ts` no distingue direcciones ni depende de
   * caminar) sino de que la cámara lo tapaba.
   *
   * Se guarda el último suelo real conocido para cuando el personaje está en
   * el aire sobre agua o un hueco entre islas, donde `alturaDelSuelo` no
   * tiene nada que devolver: la cámara no puede quedarse sin altura solo
   * porque está cruzando un vano saltando.
   */
  const ultimoSueloConocido = useRef(0);

  useFrame(({ camera }, delta) => {
    avanzarCuadro(delta);

    const seguido = objetivo.current;
    if (!seguido) return;

    const sueloAqui = alturaDelSuelo(seguido.position.x, seguido.position.z);
    if (sueloAqui !== null) ultimoSueloConocido.current = sueloAqui;

    // La altura del personaje entra en el cálculo: el mundo tiene islas a
    // distintos niveles y una cámara a altura fija acabaría a la altura de
    // los pies —o bajo el suelo— en cuanto se sube a una isla alta. Pero es
    // la altura del SUELO, no la del personaje en este instante: ver el
    // comentario de `ultimoSueloConocido` arriba.
    const [destinoX, destinoY, destinoZ] = posicionDeCamara(
      { x: seguido.position.x, z: seguido.position.z },
      yaw.current,
      ultimoSueloConocido.current,
    );

    if (menosMovimiento) {
      camera.position.set(destinoX, destinoY, destinoZ);
    } else {
      const avance = Math.min(1, SUAVIDAD_DE_CAMARA * delta);
      camera.position.x += (destinoX - camera.position.x) * avance;
      camera.position.y += (destinoY - camera.position.y) * avance;
      camera.position.z += (destinoZ - camera.position.z) * avance;
    }

    camera.lookAt(seguido.position.x, seguido.position.y + ALTURA_DE_MIRA, seguido.position.z);

    const pendiente = Math.hypot(
      destinoX - camera.position.x,
      destinoY - camera.position.y,
      destinoZ - camera.position.z,
    );
    if (pendiente > DISTANCIA_ASENTADA) pedirOtroCuadro();
  });

  return null;
}

/** Distancia por debajo de la cual la cámara ya está donde tenía que estar. */
const DISTANCIA_ASENTADA = 0.01;

/**
 * Vigila si el personaje ha llegado al claro de una isla con episodio y lo
 * avisa una sola vez, al entrar y al salir. Se mira por cuadro porque la
 * posicion vive en el `Group` de Three; lo que sale por React es el cambio,
 * que ocurre dos veces por visita y no sesenta por segundo.
 */
function VigilanteDeCercania({
  objetivo,
  alCambiarCercania,
}: {
  readonly objetivo: React.RefObject<Group | null>;
  readonly alCambiarCercania: (episodioId: string | null) => void;
}) {
  const ultimo = useRef<string | null>(null);

  useFrame(() => {
    const seguido = objetivo.current;
    if (!seguido) return;
    const punto = puntoDeEncuentroCercano(seguido.position.x, seguido.position.z);
    const episodioId = punto?.episodioId ?? null;
    if (episodioId === ultimo.current) return;
    ultimo.current = episodioId;
    alCambiarCercania(episodioId);
  });

  return null;
}

/**
 * Vigila a qué personaje del mundo se ha acercado quien juega, y lo avisa una
 * sola vez al llegar y otra al irse.
 */
function VigilanteDeEncuentros({
  objetivo,
  encuentros,
  alCambiarEncuentro,
}: {
  readonly objetivo: React.RefObject<Group | null>;
  readonly encuentros: readonly EncuentroEnElMundo[];
  readonly alCambiarEncuentro: (encuentroId: string | null) => void;
}) {
  const ultimo = useRef<string | null>(null);

  useFrame(() => {
    const seguido = objetivo.current;
    if (!seguido) return;
    const cerca = encuentroCercano(seguido.position.x, seguido.position.z, encuentros);
    const id = cerca?.id ?? null;
    if (id === ultimo.current) return;
    ultimo.current = id;
    alCambiarEncuentro(id);
  });

  return null;
}

/**
 * Distancia a partir de la cual un personaje del mundo deja de pasearse.
 *
 * Es una cuestión de consumo, no de realismo: un personaje en movimiento
 * mantiene vivo el bucle de render, y no tiene sentido pagarlo por alguien
 * que está tres islas más allá y no se ve. Al acercarse, vuelve a moverse.
 */
const DISTANCIA_PARA_QUE_SE_MUEVA = 12;

/**
 * Un personaje que vive en el mundo: se pasea alrededor de su sitio y vuelve
 * a él, para que la isla no parezca un decorado con figuras clavadas.
 *
 * El paseo lo decide `deambular.ts`, que es puro y está probado. Aquí solo se
 * empuja el destino a React cuando cambia de verdad —cada pocos segundos, no
 * cada cuadro—, y con `prefers-reduced-motion` no se pasea en absoluto
 * (AC-7).
 */
function PersonajeQuePasea({
  encuentro,
  jugador,
  menosMovimiento,
  alCambiarActividad,
}: {
  readonly encuentro: EncuentroEnElMundo;
  readonly jugador: React.RefObject<Group | null>;
  readonly menosMovimiento: boolean;
  readonly alCambiarActividad: (characterId: CharacterId, activo: boolean) => void;
}) {
  const sitio = encuentro.anclaje;
  const paseo = useRef(crearEstadoDeDeambular({ ancla: sitio }));
  const [destino, setDestino] = useState<readonly [number, number, number]>([
    sitio[0],
    0,
    sitio[1],
  ]);

  useFrame((_, delta) => {
    if (menosMovimiento) return;
    const quienJuega = jugador.current;
    if (!quienJuega) return;
    const lejos =
      Math.hypot(quienJuega.position.x - sitio[0], quienJuega.position.z - sitio[1]) >
      DISTANCIA_PARA_QUE_SE_MUEVA;
    if (lejos) return;

    const siguiente = avanzarDeambular(paseo.current, delta);
    paseo.current = siguiente;
    const [x, z] = siguiente.destino;
    setDestino((anterior) => (anterior[0] === x && anterior[2] === z ? anterior : [x, 0, z]));
  });

  return (
    <Character
      characterId={encuentro.characterId}
      destino={destino}
      entrada={[sitio[0], 0, sitio[1]]}
      sceneId={SCENE_ID_DE_EXPLORACION}
      gesto={{ tipo: "reposo" }}
      sessionVars={SIN_ENTORNO}
      menosMovimiento={menosMovimiento}
      alCambiarActividad={alCambiarActividad}
    />
  );
}

export default function GameCanvas({
  escena,
  menosMovimiento,
  alPerderContexto,
  alCambiarCercania,
  senales,
  entradaTactil,
  tactilActivo = false,
  alTenerGiroDeGolpe,
  alTenerIrA,
  alTenerSalto,
  encuentros,
  alCambiarEncuentro,
}: GameCanvasProps) {
  /* El cartel del claro en el que se está se dibuja distinto, así que la
     cercanía hace falta aquí dentro además de arriba. Es un cambio por
     visita, no por cuadro. */
  const [claroCercano, setClaroCercano] = useState<string | null>(null);
  const alEntrarOSalirDeUnClaro = useCallback(
    (episodioId: string | null) => {
      setClaroCercano(episodioId);
      alCambiarCercania?.(episodioId);
    },
    [alCambiarCercania],
  );
  const [enMovimiento, setEnMovimiento] = useState<readonly CharacterId[]>([]);
  /** El `Group` del personaje que se controla, para que la cámara lo siga. */
  const grupoDelJugador = useRef<Group | null>(null);
  const renderizador = useRef<WebGLRenderer | null>(null);

  // El aviso de contexto perdido se conecta en un efecto, no al crear el
  // lienzo, para poder desconectarlo al desmontar. React limpia los efectos
  // antes de quitar el nodo del DOM, así que el `webglcontextlost` que el
  // navegador dispara al destruir el lienzo ya no llega: sin esto, cualquier
  // desmontaje —o una recarga en caliente— retiraba la escena para siempre.
  useEffect(() => {
    const lienzo = renderizador.current?.domElement;
    if (!lienzo) return;

    function alPerder(evento: Event): void {
      // Sin `preventDefault` el navegador no intentaría restaurarlo; aquí no
      // se intenta restaurar nada, se retira la escena y la sesión continúa
      // en 2D, que es lo que protege AC-8.
      evento.preventDefault();
      alPerderContexto();
    }

    lienzo.addEventListener("webglcontextlost", alPerder);
    return () => {
      lienzo.removeEventListener("webglcontextlost", alPerder);
    };
  }, [alPerderContexto]);

  const alCambiarActividad = useCallback((characterId: CharacterId, activo: boolean) => {
    setEnMovimiento((previos) => {
      const estaba = previos.includes(characterId);
      if (activo === estaba) return previos;
      return activo ? [...previos, characterId] : previos.filter((id) => id !== characterId);
    });
  }, []);

  // Una orden nueva tiene que reencender el bucle: si la escena estaba
  // quieta, nadie estaría dibujando para ver el primer paso.
  const alRecibirOrden = useCallback(() => {
    alCambiarActividad(PERSONAJE_DEL_JUGADOR, true);
  }, [alCambiarActividad]);

  // Girar la camara sin caminar tambien mantiene vivo el bucle de render.
  const [girando, setGirando] = useState(false);
  const alCambiarGiro = useCallback((activo: boolean) => setGirando(activo), []);

  const {
    comando,
    irA,
    yaw,
    avanzarCuadro,
    girarDeGolpe,
    tomarSaltoPedido,
    pedirSalto,
    empezarArrastre,
    moverArrastre,
    terminarArrastre,
  } = useControlDelJugador({
    alRecibirOrden,
    alCambiarGiro,
    entradaTactil,
    menosMovimiento,
  });

  useEffect(() => {
    alTenerGiroDeGolpe?.(girarDeGolpe);
  }, [alTenerGiroDeGolpe, girarDeGolpe]);

  useEffect(() => {
    alTenerIrA?.(irA);
  }, [alTenerIrA, irA]);

  useEffect(() => {
    alTenerSalto?.(pedirSalto);
  }, [alTenerSalto, pedirSalto]);

  /* Tocar el suelo y arrastrar sobre él son el mismo gesto hasta que deja de
     serlo: mientras el puntero no se mueve lo suficiente sigue siendo un
     toque que manda a caminar, y en cuanto se mueve pasa a girar la cámara y
     ya no camina al soltar. Sin esto no había forma de mirar alrededor: todo
     clic mandaba al personaje a ese punto. */
  const alBajarElPuntero = useCallback(
    (evento: ThreeEvent<PointerEvent>) => {
      evento.stopPropagation();
      // Se captura el puntero para que arrastrar siga funcionando cuando el
      // cursor se sale del suelo, que es la mitad de la pantalla.
      (evento.target as Element | null)?.setPointerCapture?.(evento.pointerId);
      empezarArrastre(evento.clientX, evento.clientY);
    },
    [empezarArrastre],
  );

  const alMoverElPuntero = useCallback(
    (evento: ThreeEvent<PointerEvent>) => {
      moverArrastre(evento.clientX, evento.clientY);
    },
    [moverArrastre],
  );

  const alSoltarElPuntero = useCallback(
    (evento: ThreeEvent<PointerEvent>) => {
      evento.stopPropagation();
      if (terminarArrastre().esToque) irA(evento.point.x, evento.point.z);
    },
    [terminarArrastre, irA],
  );

  /* Ya no se apaga con `menosMovimiento`: si el bucle no corriera, caminar
     no se vería. Lo que esa preferencia apaga es lo que se mueve solo, y eso
     lo deciden la cámara (que se coloca de golpe), el cartel (que se queda
     quieto) y la caminata del guion (que no ocurre). */
  const hayMovimiento = enMovimiento.length > 0 || girando || tactilActivo;

  // En exploracion solo esta Capi: nadie mas tiene por que estar en una isla
  // en la que no pasa nada.
  const personajes = useMemo(
    () =>
      (escena ? escena.personajes : [PERSONAJE_DEL_JUGADOR]).map((characterId) => {
        if (!escena) {
          return {
            characterId,
            gesto: { tipo: "reposo" } as const,
            destino: POSICION_LIBRE,
          };
        }
        // Solo actúa quien tiene el turno; el resto acompaña en reposo.
        const esProtagonista = characterId === escena.protagonista;
        const gesto = esProtagonista ? escena.gesto : ({ tipo: "reposo" } as const);
        return {
          characterId,
          gesto,
          destino: destinoDe(characterId, gesto, esProtagonista),
        };
      }),
    [escena],
  );

  const sceneId = escena?.sceneId ?? SCENE_ID_DE_EXPLORACION;

  return (
    <Canvas
      frameloop={hayMovimiento ? "always" : "demand"}
      camera={{ position: [0, ALTURA_DE_CAMARA, RADIO_DE_CAMARA], fov: 42, far: 120 }}
      onCreated={({ gl }) => {
        renderizador.current = gl;
      }}
      // `powerPreference: "low-power"` y sin antialias: el objetivo es una
      // laptop de aula, no una estación gráfica. Se medirá antes de subir.
      gl={{ antialias: false, powerPreference: "low-power" }}
      dpr={[1, 1.5]}
    >
      <hemisphereLight intensity={1.1} groundColor="#c8b89a" />
      <directionalLight position={[3, 5, 2]} intensity={1.4} />

      <CamaraQueSigue
        objetivo={grupoDelJugador}
        menosMovimiento={menosMovimiento}
        yaw={yaw}
        avanzarCuadro={avanzarCuadro}
      />

      {alCambiarEncuentro && encuentros && encuentros.length > 0 ? (
        <VigilanteDeEncuentros
          objetivo={grupoDelJugador}
          encuentros={encuentros}
          alCambiarEncuentro={alCambiarEncuentro}
        />
      ) : null}

      {alCambiarCercania ? (
        <VigilanteDeCercania
          objetivo={grupoDelJugador}
          alCambiarCercania={alEntrarOSalirDeUnClaro}
        />
      ) : null}

      <Suspense fallback={null}>
        <IslandScene environment={escena?.environment ?? SIN_ENTORNO} />

        {/* Suelo invisible para señalar a dónde caminar con un toque o un
            clic: es lo que permite mover al personaje con un solo puntero,
            sin depender del teclado (AC-6).

            Es mucho más grande que la isla a propósito. Quien toca el agua no
            se queda sin respuesta: `irA` acerca el punto al sitio alcanzable
            más cercano, así que el control nunca parece roto. */}
        {/* Se dibuja siempre, también con menos movimiento: tocar el suelo es
            un control, no un adorno, y es la única forma de caminar con un
            solo puntero (AC-6). */}
        {(
          <mesh
            rotation-x={-Math.PI / 2}
            position={[0, 0.02, 0]}
            onPointerDown={alBajarElPuntero}
            onPointerMove={alMoverElPuntero}
            onPointerUp={alSoltarElPuntero}
          >
            <circleGeometry args={[40, 48]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        )}

        {/* Los carteles marcan a dónde se puede ir. Solo mientras se explora:
            durante un episodio la escena ya tiene su propio foco y un cartel
            flotando sería ruido. */}
        {senales?.map((senal) => (
          <SenalDeMision
            key={senal.clave}
            posicion={senal.posicion}
            texto={senal.texto}
            cerca={claroCercano === senal.episodioId}
            menosMovimiento={menosMovimiento}
          />
        ))}

        {/* Los objetos del mundo que no son decorado del terreno: la brújula
            en la isla del episodio que la enseña, y un bocadillo sobre quien
            tiene algo que contar. Solo mientras se explora: dentro de una
            escena del guion, la atención ya la manda el diálogo. */}
        {escena ? null : (
          <PropsDelMundo
            mostrarBrujula
            personajesConBurbuja={encuentros?.map((encuentro) => ({
              id: encuentro.id,
              anclaje: encuentro.anclaje,
            }))}
            menosMovimiento={menosMovimiento}
          />
        )}

        {/* Los personajes que viven en el mundo. Solo se pasean cuando hay
            alguien cerca: un NPC andando en una isla que nadie está mirando
            mantendría encendido el bucle de render a cambio de nada
            (Constitución VI). */}
        {encuentros?.map((encuentro) => (
          <PersonajeQuePasea
            key={encuentro.id}
            encuentro={encuentro}
            jugador={grupoDelJugador}
            menosMovimiento={menosMovimiento}
            alCambiarActividad={alCambiarActividad}
          />
        ))}

        {personajes.map(({ characterId, destino, gesto }) => (
          <Character
            key={characterId}
            characterId={characterId}
            destino={destino}
            sceneId={sceneId}
            gesto={gesto}
            sessionVars={escena?.sessionVars ?? SIN_ENTORNO}
            menosMovimiento={menosMovimiento}
            comandoDelJugador={characterId === PERSONAJE_DEL_JUGADOR ? comando : undefined}
            tomarSaltoPedido={characterId === PERSONAJE_DEL_JUGADOR ? tomarSaltoPedido : undefined}
            grupoCompartido={characterId === PERSONAJE_DEL_JUGADOR ? grupoDelJugador : undefined}
            alCambiarActividad={alCambiarActividad}
          />
        ))}
      </Suspense>
    </Canvas>
  );
}

