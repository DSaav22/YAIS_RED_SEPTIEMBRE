// Las tres puertas de la escena 3D, en un solo sitio.
//
// Este archivo NO importa Three ni React Three Fiber. Decide si la escena
// puede existir y, solo entonces, carga el lienzo con `import()`. Tres
// puertas, en orden:
//
// 1. ¿Hay WebGL? Si no, no se descarga nada del motor 3D (AC-8).
// 2. ¿Se pudo cargar el módulo? Si falla, la app sigue en 2D.
// 3. ¿Se rompió la escena en marcha? Hay dos formas distintas y cada una
//    necesita su mecanismo: un GLB corrupto lanza y lo atrapa el límite de
//    error; perder el contexto WebGL —una laptop vieja proyectando durante
//    horas— no lanza nada y llega por el evento `webglcontextlost`. Las dos
//    retiran la escena y dejan el 2D funcionando.
//
// Lo usan los dos sitios donde hay mundo: el episodio en curso
// (`EscenaDelEpisodio`) y la exploración libre (`EscenaLibre`). Están
// separados porque muestran cosas distintas, pero las puertas son las mismas
// y duplicarlas era la forma segura de que una se quedara atrás.

import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useMemo,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";

import type { EncuentroEnElMundo } from "./encuentros-del-mundo";
import type { EntradaTactil } from "./entrada-tactil";
import type { EstadoDeEscena } from "./estado-de-escena";
import type { SenalDelMundo } from "./GameCanvas";
import { soportaWebGL } from "./soporte-webgl";
import { useMenosMovimiento } from "./useMenosMovimiento";

const GameCanvas = lazy(() => import("./GameCanvas"));

interface LienzoDeEscenaProps {
  /** Lo que el guion pide representar, o `null` si se está explorando. */
  readonly escena: EstadoDeEscena | null;
  /**
   * Se llama si la escena 3D deja de estar disponible en marcha. Quien está
   * arriba lo necesita: si el personaje ya no se ve en 3D, algo tiene que
   * decir quién habla, y si no hay mundo, la exploración tiene que ofrecer su
   * ruta 2D.
   */
  readonly alRetirarse?: (() => void) | undefined;
  readonly alCambiarCercania?: ((episodioId: string | null) => void) | undefined;
  /** Carteles que flotan sobre los claros; solo los pone la exploración. */
  readonly senales?: readonly SenalDelMundo[] | undefined;
  readonly entradaTactil?: { readonly current: EntradaTactil } | undefined;
  readonly tactilActivo?: boolean | undefined;
  readonly alTenerGiroDeGolpe?: ((girar: (radianes: number) => void) => void) | undefined;
  readonly alTenerIrA?: ((irA: (x: number, z: number) => void) => void) | undefined;
  readonly alTenerSalto?: ((saltar: () => void) => void) | undefined;
  readonly encuentros?: readonly EncuentroEnElMundo[] | undefined;
  readonly alCambiarEncuentro?: ((encuentroId: string | null) => void) | undefined;
  /** Clase del envoltorio: el mundo libre ocupa la pantalla entera. */
  readonly className?: string | undefined;
}

export function LienzoDeEscena({
  escena,
  alRetirarse,
  alCambiarCercania,
  senales,
  entradaTactil,
  tactilActivo,
  alTenerGiroDeGolpe,
  alTenerIrA,
  alTenerSalto,
  encuentros,
  alCambiarEncuentro,
  className = "escena",
}: LienzoDeEscenaProps) {
  // WebGL se comprueba una vez: no aparece a mitad de sesión. La preferencia
  // de movimiento, en cambio, se escucha: puede cambiar durante una demo.
  const hayWebGL = useMemo(() => soportaWebGL(), []);
  const menosMovimiento = useMenosMovimiento();

  // Perder el contexto WebGL no lanza una excepción, así que el límite de
  // error no lo vería: se retira la escena desde aquí y no se vuelve a montar
  // en esta sesión.
  const [contextoPerdido, setContextoPerdido] = useState(false);
  const alPerderContexto = useCallback(() => {
    setContextoPerdido(true);
    alRetirarse?.();
    if (import.meta.env.DEV) {
      console.warn("[escena] se perdió el contexto WebGL; la sesión continúa en 2D.");
    }
  }, [alRetirarse]);

  if (!hayWebGL || contextoPerdido) return null;

  return (
    // El envoltorio lo pone esta capa y no `GameCanvas`: así el hueco de la
    // escena existe desde el primer render y la página no da un salto cuando
    // termina de llegar el lienzo. Si el límite de error lo retira, el
    // envoltorio se va con él y la interfaz 2D recupera su sitio sin dejar un
    // vacío (el estilo del diálogo se apoya en que `.escena` esté o no esté).
    <LimiteDeEscena alRomperse={alRetirarse}>
      <div className={className} aria-hidden="true">
        {/* Sin `fallback` visible: mientras el GLB baja, la interfaz 2D ya
            funciona y un cartel de carga solo robaría atención. */}
        <Suspense fallback={null}>
          <GameCanvas
            escena={escena}
            menosMovimiento={menosMovimiento}
            alPerderContexto={alPerderContexto}
            alCambiarCercania={alCambiarCercania}
            senales={senales}
            entradaTactil={entradaTactil}
            tactilActivo={tactilActivo}
            alTenerGiroDeGolpe={alTenerGiroDeGolpe}
            alTenerIrA={alTenerIrA}
            alTenerSalto={alTenerSalto}
            encuentros={encuentros}
            alCambiarEncuentro={alCambiarEncuentro}
          />
        </Suspense>
      </div>
    </LimiteDeEscena>
  );
}

interface LimiteDeEscenaProps {
  readonly children: ReactNode;
  readonly alRomperse?: (() => void) | undefined;
}

interface LimiteDeEscenaState {
  readonly rota: boolean;
}

/**
 * Límite de error de la escena. Si el 3D falla —WebGL perdido, GLB que no
 * carga, memoria—, se retira en silencio y la sesión continúa en 2D (AC-8).
 * El error se registra solo en desarrollo: nunca se muestra en pantalla ni
 * sale del dispositivo (AC-9).
 */
class LimiteDeEscena extends Component<LimiteDeEscenaProps, LimiteDeEscenaState> {
  override state: LimiteDeEscenaState = { rota: false };

  static getDerivedStateFromError(): LimiteDeEscenaState {
    return { rota: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.alRomperse?.();
    if (import.meta.env.DEV) {
      console.warn("[escena] la escena 3D falló y se continúa en 2D:", error, info.componentStack);
    }
  }

  override render(): ReactNode {
    if (this.state.rota) return null;
    return this.props.children;
  }
}
