// Iconos SVG accesibles del episodio (T-001-05, PLAN-001 "Decisión visual").
//
// Son formas dibujadas a mano en JSX, no recortes de concept art ni texto
// rasterizado. El color nunca es el único significado: cada icono se
// distingue por su silueta y funciona igual en escala de grises, por eso
// el trazo siempre usa `currentColor` y no hay relleno de color incrustado
// (salvo puntos sólidos decorativos, que también heredan `currentColor`).
//
// El nombre accesible de un icono lo decide quien lo usa, nunca este
// archivo: los textos que un niño lee vienen de `localization` en
// `content/episodes/ep01-saludo.json` (locIds como `GREET_WAVE`), no de
// una etiqueta en español hardcodeada aquí (Constitución IV). Por eso
// `IconProps` modela el nombre accesible como opcional-pero-nunca-vacío:
// o se pasa un texto real y el icono es `role="img"` con `<title>`, o no
// se pasa nada y el icono queda `aria-hidden`, puramente decorativo.

import type { ReactNode } from "react";

/**
 * Contrato de accesibilidad de todo icono del registro.
 *
 * La unión discriminada hace imposible pasar un nombre accesible vacío o
 * `undefined` a propósito: con `exactOptionalPropertyTypes` activo, la
 * única forma de satisfacer la segunda rama es omitir la prop por
 * completo. No hay combinación de props que produzca un icono
 * "significativo" (con `<title>`) sin un nombre accesible real.
 */
export type IconProps =
  | { readonly nombreAccesible: string }
  | { readonly nombreAccesible?: never };

const TAMANO_LIENZO = 24;
const GROSOR_TRAZO = 2;

interface IconBaseProps {
  readonly nombreAccesible: string | undefined;
  readonly children: ReactNode;
}

/**
 * Envoltorio común de todos los iconos: fija el lienzo, el trazo grueso
 * (se ve proyectado a varios metros) y decide accesibilidad según si
 * recibió un nombre accesible.
 */
function IconBase({ nombreAccesible, children }: IconBaseProps) {
  const decorativo = nombreAccesible === undefined;

  return (
    <svg
      viewBox={`0 0 ${TAMANO_LIENZO} ${TAMANO_LIENZO}`}
      width="1.5em"
      height="1.5em"
      fill="none"
      stroke="currentColor"
      strokeWidth={GROSOR_TRAZO}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      role={decorativo ? undefined : "img"}
      aria-hidden={decorativo ? true : undefined}
    >
      {decorativo ? null : <title>{nombreAccesible}</title>}
      {children}
    </svg>
  );
}

// Cada icono es un componente propio (no una tabla de paths) para que el
// registro `ICONOS` de más abajo sea una expresión de "componentes
// compuestos" válida para `eslint-plugin-react-refresh`: no se exportan
// individualmente porque nadie fuera de este archivo necesita importarlos
// por nombre, solo por el id de contenido a través de `ICONOS`.

function IconCallAdult(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <g transform="rotate(-45 12 12)">
        <circle cx="7" cy="12" r="3" />
        <circle cx="17" cy="12" r="3" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </g>
    </IconBase>
  );
}

function IconChange(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <path d="M4 12a8 8 0 0 1 13.7-5.7L20 8" />
      <path d="M20 4v4h-4" />
      <path d="M20 12a8 8 0 0 1-13.7 5.7L4 16" />
      <path d="M4 20v-4h4" />
    </IconBase>
  );
}

function IconCheck(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <path d="M5 13l4 4L19 7" />
    </IconBase>
  );
}

function IconCloud(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <path d="M7 17h10a4 4 0 0 0 .3-8 5.5 5.5 0 0 0-10.6-1.7A4 4 0 0 0 7 17Z" />
    </IconBase>
  );
}

function IconDropAlert(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <path d="M12 3c3.6 4.2 6 7.7 6 11a6 6 0 0 1-12 0c0-3.3 2.4-6.8 6-11Z" />
      <line x1="12" y1="10" x2="12" y2="14" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

function IconEye(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}

function IconGreetDistance(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <rect x="6" y="13" width="9" height="8" rx="3" />
      <line x1="8" y1="13" x2="7" y2="6" />
      <line x1="10.5" y1="13" x2="10.5" y2="4" />
      <line x1="13" y1="13" x2="14" y2="6" />
      <path d="M17 8a6 6 0 0 1 0 8" strokeDasharray="2 2" />
      <path d="M19.5 5a10 10 0 0 1 0 14" strokeDasharray="2 2" />
    </IconBase>
  );
}

function IconGreetFist(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <rect x="7" y="9" width="10" height="10" rx="4" />
      <line x1="9" y1="9" x2="9" y2="7" />
      <line x1="12" y1="9" x2="12" y2="6" />
      <line x1="15" y1="9" x2="15" y2="7" />
      <rect x="9" y="19" width="6" height="3" rx="1" />
    </IconBase>
  );
}

function IconGreetHighFive(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <rect x="6" y="13" width="12" height="8" rx="3" />
      <line x1="8" y1="13" x2="6" y2="6" />
      <line x1="10.5" y1="13" x2="9.5" y2="4" />
      <line x1="13" y1="13" x2="13" y2="3" />
      <line x1="15.5" y1="13" x2="16.5" y2="4" />
      <line x1="18" y1="13" x2="20" y2="6" />
    </IconBase>
  );
}

function IconGreetHug(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <path d="M5 5c-3 5-3 11 0 16" />
      <path d="M19 5c3 5 3 11 0 16" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}

function IconGreetNo(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <circle cx="12" cy="12" r="9" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </IconBase>
  );
}

function IconGreetWave(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <rect x="7" y="13" width="10" height="8" rx="3" />
      <line x1="9" y1="13" x2="9" y2="5" />
      <line x1="11.3" y1="13" x2="11" y2="4" />
      <line x1="13.6" y1="13" x2="14" y2="4" />
      <line x1="15.8" y1="13" x2="16.5" y2="5.5" />
      <path d="M18.5 6c1 .5 1.5 1.5 1.2 2.6" />
      <path d="M19.5 9.5c1 .3 1.6 1.3 1.2 2.4" />
    </IconBase>
  );
}

function IconQuestion(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <path d="M9 9a3 3 0 1 1 4.2 2.7c-.9.5-1.2 1-1.2 2.3" />
      <circle cx="12" cy="18" r="0.6" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

function IconSpeechQuestion(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <path d="M4 5h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-9l-4 4v-4H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="M10 9a2 2 0 1 1 2.8 1.8c-.6.3-.8.6-.8 1.4" />
      <circle cx="12" cy="14" r="0.6" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

function IconStar(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <polygon points="12,2 14.6,8.6 21.8,9.3 16.3,13.8 18,20.8 12,17 6,20.8 7.7,13.8 2.2,9.3 9.4,8.6" />
    </IconBase>
  );
}

function IconStopHand(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <rect x="7" y="12" width="10" height="9" rx="2" />
      <line x1="9" y1="12" x2="9" y2="4" />
      <line x1="11.3" y1="12" x2="11.3" y2="3" />
      <line x1="13.6" y1="12" x2="13.6" y2="3" />
      <line x1="15.8" y1="12" x2="15.8" y2="4" />
      <line x1="6" y1="21" x2="18" y2="21" />
    </IconBase>
  );
}

function IconSun(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="5.6" y1="5.6" x2="7.8" y2="7.8" />
      <line x1="16.2" y1="16.2" x2="18.4" y2="18.4" />
      <line x1="5.6" y1="18.4" x2="7.8" y2="16.2" />
      <line x1="16.2" y1="7.8" x2="18.4" y2="5.6" />
    </IconBase>
  );
}

function IconUnsure(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.6" fill="currentColor" stroke="none" />
      <polyline points="8,15 10,13.4 12,15 14,13.4 16,15" />
    </IconBase>
  );
}

function IconWalkAway(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <circle cx="9" cy="5" r="2" />
      <line x1="9" y1="7" x2="9" y2="14" />
      <line x1="9" y1="9" x2="5" y2="12" />
      <line x1="9" y1="9" x2="13" y2="7" />
      <line x1="9" y1="14" x2="5" y2="20" />
      <line x1="9" y1="14" x2="13" y2="19" />
      <line x1="16" y1="14" x2="21" y2="14" />
      <polyline points="18,11.5 21,14 18,16.5" />
    </IconBase>
  );
}


/* --- Episodio 2: confianza, lugares del círculo --- */

function IconHeart(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <path d="M12 20s-7-4.5-7-9.5A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.5C19 15.5 12 20 12 20Z" />
    </IconBase>
  );
}

function IconHouse(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <polyline points="4,11 12,4 20,11" />
      <path d="M6 11v8h12v-8" />
      <rect x="10" y="14" width="4" height="5" />
    </IconBase>
  );
}

function IconSchool(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4Z" />
      <path d="M20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6Z" />
    </IconBase>
  );
}

function IconCommunity(props: IconProps) {
  return (
    <IconBase nombreAccesible={props.nombreAccesible}>
      <circle cx="12" cy="8" r="4" />
      <line x1="12" y1="12" x2="12" y2="20" />
      <line x1="8" y1="20" x2="16" y2="20" />
    </IconBase>
  );
}

/**
 * Registro tipado: id de icono del contenido -> componente. `icons.test.tsx`
 * afirma que todo icono referenciado por `content/episodes/ep01-saludo.json`
 * existe aquí, así que un icono nuevo en el contenido rompe el test hasta
 * que se agregue a este registro.
 */
export const ICONOS = {
  icon_call_adult: IconCallAdult,
  icon_change: IconChange,
  icon_check: IconCheck,
  icon_cloud: IconCloud,
  icon_community: IconCommunity,
  icon_drop_alert: IconDropAlert,
  icon_eye: IconEye,
  icon_greet_distance: IconGreetDistance,
  icon_greet_fist: IconGreetFist,
  icon_greet_high_five: IconGreetHighFive,
  icon_greet_hug: IconGreetHug,
  icon_greet_no: IconGreetNo,
  icon_greet_wave: IconGreetWave,
  icon_heart: IconHeart,
  icon_house: IconHouse,
  icon_question: IconQuestion,
  icon_school: IconSchool,
  icon_speech_question: IconSpeechQuestion,
  icon_star: IconStar,
  icon_stop_hand: IconStopHand,
  icon_sun: IconSun,
  icon_unsure: IconUnsure,
  icon_walk_away: IconWalkAway,
} as const;

/** Id de icono derivado del registro: nunca un `string` suelto. */
export type IconId = keyof typeof ICONOS;
