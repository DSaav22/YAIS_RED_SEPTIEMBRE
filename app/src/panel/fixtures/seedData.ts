export interface AulaSeed {
  id: string;
  etiqueta: string;
  grado: string;
  conteoIntegrantes: number;
  episodiosCompletados: string[];
  episodioActual: string;
  porcentajeAvance: number;
  ultimaSesionFecha: string;
}

export interface MaterialSeed {
  id: string;
  titulo: string;
  tipo: 'PDF' | 'ZIP' | 'DOCX';
  descripcion: string;
  categoria: 'Guía Docente' | 'Protocolo Imprimible' | 'Actividad de Refuerzo';
  tamano: string;
}

export interface ChecklistItemSeed {
  id: string;
  texto: string;
  completado: boolean;
  obligatorio: boolean;
}

export interface PasoProtocoloSeed {
  numero: number;
  titulo: string;
  descripcion: string;
  iconoNombre: string;
}

export const AULAS_SEMILLA: AulaSeed[] = [
  {
    id: "aula-3a",
    etiqueta: "Aula 3° A",
    grado: "3° Primaria",
    conteoIntegrantes: 26,
    episodiosCompletados: ["ep01-saludo"],
    episodioActual: "Episodio 2 — El acuerdo del grupo",
    porcentajeAvance: 65,
    ultimaSesionFecha: "15 de Septiembre, 2026",
  },
  {
    id: "aula-3b",
    etiqueta: "Aula 3° B",
    grado: "3° Primaria",
    conteoIntegrantes: 24,
    episodiosCompletados: ["ep01-saludo"],
    episodioActual: "Episodio 1 — Saludo que puedo elegir",
    porcentajeAvance: 100,
    ultimaSesionFecha: "16 de Septiembre, 2026",
  },
  {
    id: "aula-4a",
    etiqueta: "Aula 4° A",
    grado: "4° Primaria",
    conteoIntegrantes: 28,
    episodiosCompletados: [],
    episodioActual: "Episodio 1 — Saludo que puedo elegir",
    porcentajeAvance: 20,
    ultimaSesionFecha: "12 de Septiembre, 2026",
  },
];

export const MATERIALES_SEMILLA: MaterialSeed[] = [
  {
    id: "mat-guia",
    titulo: "Guía del Facilitador — La Isla de los Acuerdos",
    tipo: "PDF",
    descripcion: "Manual de acompañamiento docente para facilitar las sesiones y actividades de aula.",
    categoria: "Guía Docente",
    tamano: "2.4 MB",
  },
  {
    id: "mat-ep01-kit",
    titulo: "Kit de Refuerzo Episodio 1: Saludos y Elección",
    tipo: "ZIP",
    descripcion: "Tarjetas imprimibles de acuerdos de saludo para el aula.",
    categoria: "Actividad de Refuerzo",
    tamano: "5.1 MB",
  },
  {
    id: "mat-protocolo",
    titulo: "Protocolo Físico de Derivación Institucional",
    tipo: "PDF",
    descripcion: "Hoja resumen imprimible con los pasos de actuación y contactos de emergencia.",
    categoria: "Protocolo Imprimible",
    tamano: "850 KB",
  },
];

export const CHECKLIST_SEMILLA: ChecklistItemSeed[] = [
  {
    id: "chk-capacitacion",
    texto: "Revisar la Guía del Facilitador y el video introductorio de preparación",
    completado: true,
    obligatorio: true,
  },
  {
    id: "chk-protocolo-lectura",
    texto: "Confirmar lectura del Protocolo de Derivación ante revelaciones",
    completado: true,
    obligatorio: true,
  },
  {
    id: "chk-dna-contacto",
    texto: "Verificar el número telefónico y responsable de protección local o DNA",
    completado: true,
    obligatorio: true,
  },
  {
    id: "chk-privacidad",
    texto: "Revisar las pautas de privacidad y límites de no registro individual",
    completado: false,
    obligatorio: false,
  },
];

export const PASOS_PROTOCOLO_SEMILLA: PasoProtocoloSeed[] = [
  {
    numero: 1,
    titulo: "Escuchar con calma y contención",
    descripcion: "Escuchar atentamente al menor en un espacio tranquilo. Brindar calma sin expresar pánico ni prometer secretos absolutos imposibles.",
    iconoNombre: "ear",
  },
  {
    numero: 2,
    titulo: "No interrogar ni pedir detalles",
    descripcion: "Evitar hacer preguntas inductivas o solicitar relatos detallados. Preservar la entrevista única para profesionales y autoridades.",
    iconoNombre: "help-circle",
  },
  {
    numero: 3,
    titulo: "Notificar al responsable de protección",
    descripcion: "Informar de inmediato al encargado de protección de la institución o equipo directivo para activar la ruta oficial.",
    iconoNombre: "shield-alert",
  },
  {
    numero: 4,
    titulo: "Contactar a la Defensoría de la Niñez (DNA)",
    descripcion: "Realizar la derivación oficial mediante la línea gratuita 800-11-30-40 o acudir a la DNA de su municipio.",
    iconoNombre: "phone-call",
  },
];
