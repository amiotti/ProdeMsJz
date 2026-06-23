import officialFixtureRaw from '@/lib/official-fixture-2026.json';
import type { Group, Match } from '@/lib/types';

export type TeamInfo = {
  id: string;
  name: string;
  slug: string;
  flag: string;
  confederation: string;
  fifaStrength: number;
  shortDescription: string;
  notes?: string;
  isPlaceholder?: boolean;
};

function fixMojibakeText(value: string): string {
  if (!value || !/[ÃƒÃ‚Ã¯]/.test(value)) return value;
  try {
    const bytes = Uint8Array.from([...value].map((ch) => ch.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder('utf-8').decode(bytes);
    return /ï¿½/.test(decoded) ? value : decoded;
  } catch {
    return value;
  }
}

function applySpanishAccents(value: string): string {
  let text = value;
  const replacements: Array<[RegExp, string]> = [
    [/\bSeleccion\b/g, 'Selección'],
    [/\bseleccion\b/g, 'selección'],
    [/\bAnfitrion\b/g, 'Anfitrión'],
    [/\banfitrion\b/g, 'anfitrión'],
    [/\bhistorica\b/g, 'histórica'],
    [/\bhistorico\b/g, 'histórico'],
    [/\basiatica\b/g, 'asiática'],
    [/\bafricana\b/g, 'africana'],
    [/\beuropea\b/g, 'europea'],
    [/\btactico\b/g, 'táctico'],
    [/\btecnica\b/g, 'técnica'],
    [/\btecnicamente\b/g, 'técnicamente'],
    [/\bpresion\b/g, 'presión'],
    [/\bdefensiva\b/g, 'defensiva'],
    [/\bfisico\b/g, 'físico'],
    [/\bfisica\b/g, 'física'],
    [/\boceanico\b/g, 'oceánico'],
    [/\brapidas\b/g, 'rápidas'],
    [/\brapida\b/g, 'rápida'],
    [/\bMundial\b/g, 'Mundial'],
    [/\blocalia\b/g, 'localía'],
    [/\bclasificacion\b/g, 'clasificación'],
    [/\bultima\b/g, 'última'],
    [/\bvariabilidad\b/g, 'variabilidad'],
    [/\bindice\b/g, 'índice'],
    [/\btitulo\b/g, 'título'],
    [/\bdefinicion\b/g, 'definición'],
    [/\bTodavia\b/g, 'Todavía'],
    [/\btodavia\b/g, 'todavía'],
    [/\bJapon\b/g, 'Japón'],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }
  return text;
}
function normalizeSpanishDisplayText(value: string): string {
  return applySpanishAccents(fixMojibakeText(value));
}

const TEAM_DISPLAY_OVERRIDES: Record<string, string> = {
  Mexico: 'México',
  Canada: 'Canadá',
  Japon: 'Japón',
  Tunez: 'Túnez',
  Belgica: 'Bélgica',
  Espana: 'España',
  'Paises Bajos': 'Países Bajos',
  Sudafrica: 'Sudáfrica',
  Turquia: 'Turquía',
  Haiti: 'Haití',
  Iran: 'Irán',
  Panama: 'Panamá',
};

export function getTeamDisplayName(teamName: string): string {
  const canonical = ARTICLE_TEAM_TO_CANONICAL[teamName] ?? teamName;
  const base = TEAM_DISPLAY_OVERRIDES[canonical] ?? TEAM_DISPLAY_OVERRIDES[teamName] ?? canonical;
  return normalizeSpanishDisplayText(base);
}

const TEAM_WIKIPEDIA_TITLE_OVERRIDES: Record<string, string> = {
  'Arabia Saudita': 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Arabia_Saudita',
  Argelia: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Argelia',
  Argentina: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Argentina',
  Australia: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Australia',
  Austria: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Austria',
  Belgica: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_BÃƒÂ©lgica',
  Brasil: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Brasil',
  Canada: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_CanadÃƒÂ¡',
  'Cabo Verde': 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Cabo_Verde',
  Colombia: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Colombia',
  'Corea del Sur': 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Corea_del_Sur',
  'Costa de Marfil': 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Costa_de_Marfil',
  Croacia: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Croacia',
  Curazao: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Curazao',
  Ecuador: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Ecuador',
  Egipto: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Egipto',
  Inglaterra: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Inglaterra',
  Espana: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_EspaÃƒÂ±a',
  'Estados Unidos': 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_los_Estados_Unidos',
  Escocia: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Escocia',
  Francia: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Francia',
  Ghana: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Ghana',
  Haiti: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_HaitÃƒÂ­',
  Iran: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_IrÃƒÂ¡n',
  Japon: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_JapÃƒÂ³n',
  Jordania: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Jordania',
  Marruecos: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Marruecos',
  Mexico: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_MÃƒÂ©xico',
  'Nueva Zelanda': 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Nueva_Zelanda',
  Noruega: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Noruega',
  Panama: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_PanamÃƒÂ¡',
  Paraguay: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Paraguay',
  'Paises Bajos': 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_los_PaÃƒÂ­ses_Bajos',
  Portugal: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Portugal',
  Qatar: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Catar',
  Senegal: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Senegal',
  Sudafrica: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_SudÃƒÂ¡frica',
  Suiza: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Suiza',
  Tunez: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_TÃƒÂºnez',
  Uruguay: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_Uruguay',
  Uzbekistan: 'SelecciÃƒÂ³n_de_fÃƒÂºtbol_de_UzbekistÃƒÂ¡n',
};

type CalendarEvent = {
  id: string;
  stage: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  venue?: string;
};

type OfficialFixtureRow = {
  stage: 'group' | 'knockout';
  dateHeading: string;
  matchLabel: string;
  localTime: string;
  gmtInfo: string;
  venue: string;
  kickoffArgentina?: string;
  homeTeam?: string;
  awayTeam?: string;
};

const VENUE_UTC_OFFSET_BY_PREFIX: Array<{ prefix: string; offsetHours: number }> = [
  { prefix: 'Mexico City Stadium', offsetHours: -6 },
  { prefix: 'Estadio Guadalajara', offsetHours: -6 },
  { prefix: 'Estadio Monterrey', offsetHours: -6 },
  { prefix: 'BC Place', offsetHours: -7 },
  { prefix: 'Los Angeles Stadium', offsetHours: -7 },
  { prefix: 'San Francisco Bay Area Stadium', offsetHours: -7 },
  { prefix: 'Seattle Stadium', offsetHours: -7 },
  { prefix: 'Dallas Stadium', offsetHours: -5 },
  { prefix: 'Houston Stadium', offsetHours: -5 },
  { prefix: 'Kansas City Stadium', offsetHours: -5 },
  { prefix: 'Atlanta Stadium', offsetHours: -4 },
  { prefix: 'Boston Stadium', offsetHours: -4 },
  { prefix: 'Miami Stadium', offsetHours: -4 },
  { prefix: 'New York New Jersey Stadium', offsetHours: -4 },
  { prefix: 'Philadelphia Stadium', offsetHours: -4 },
  { prefix: 'Toronto Stadium', offsetHours: -4 },
];

const TEAM_CATALOG: TeamInfo[] = [
  {
    id: 'mexico',
    name: 'Mexico',
    slug: 'mexico',
    flag: 'MX',
    confederation: 'Concacaf',
    fifaStrength: 1840,
    shortDescription: 'Anfitrion. Seleccion historica de Concacaf con localia fuerte.',
  },
  {
    id: 'corea-del-sur',
    name: 'Corea del Sur',
    slug: 'corea-del-sur',
    flag: 'KR',
    confederation: 'AFC',
    fifaStrength: 1760,
    shortDescription: 'Seleccion competitiva de Asia con ritmo alto y buena presion.',
  },
  {
    id: 'sudafrica',
    name: 'Sudafrica',
    slug: 'sudafrica',
    flag: 'ZA',
    confederation: 'CAF',
    fifaStrength: 1640,
    shortDescription: 'Seleccion africana con experiencia en torneos y juego fisico.',
  },
  {
    id: 'chequia',
    name: 'Chequia',
    slug: 'chequia',
    flag: 'CZ',
    confederation: 'UEFA',
    fifaStrength: 1790,
    shortDescription: 'Clasificada via repechaje UEFA (ruta D). Equipo competitivo y ordenado.',
    notes: 'Clasificacion confirmada el 31/03/2026 en el repechaje UEFA.',
  },
  {
    id: 'canada',
    name: 'Canada',
    slug: 'canada',
    flag: 'CA',
    confederation: 'Concacaf',
    fifaStrength: 1780,
    shortDescription: 'Anfitrion. Equipo vertical con transiciones rapidas.',
  },
  {
    id: 'suiza',
    name: 'Suiza',
    slug: 'suiza',
    flag: 'CH',
    confederation: 'UEFA',
    fifaStrength: 1825,
    shortDescription: 'Seleccion europea ordenada, solida y con buena estructura defensiva.',
  },
  {
    id: 'qatar',
    name: 'Qatar',
    slug: 'qatar',
    flag: 'QA',
    confederation: 'AFC',
    fifaStrength: 1660,
    shortDescription: 'Seleccion asiatica con experiencia reciente en Mundial.',
  },
  {
    id: 'bosnia-y-herzegovina',
    name: 'Bosnia y Herzegovina',
    slug: 'bosnia-y-herzegovina',
    flag: 'BA',
    confederation: 'UEFA',
    fifaStrength: 1750,
    shortDescription: 'Clasificada via repechaje UEFA (ruta A).',
    notes: 'Clasificacion confirmada el 31/03/2026 tras vencer a Italia por penales.',
  },
  {
    id: 'brasil',
    name: 'Brasil',
    slug: 'brasil',
    flag: 'BR',
    confederation: 'CONMEBOL',
    fifaStrength: 1945,
    shortDescription: 'Potencia historica, candidata natural al titulo.',
  },
  {
    id: 'marruecos',
    name: 'Marruecos',
    slug: 'marruecos',
    flag: 'MA',
    confederation: 'CAF',
    fifaStrength: 1865,
    shortDescription: 'Seleccion africana de alto nivel, muy competitiva en torneos recientes.',
  },
  {
    id: 'escocia',
    name: 'Escocia',
    slug: 'escocia',
    flag: 'GB-SCT',
    confederation: 'UEFA',
    fifaStrength: 1775,
    shortDescription: 'Equipo europeo intenso y agresivo en la recuperacion.',
  },
  {
    id: 'haiti',
    name: 'Haiti',
    slug: 'haiti',
    flag: 'HT',
    confederation: 'Concacaf',
    fifaStrength: 1560,
    shortDescription: 'Seleccion de Concacaf en crecimiento competitivo.',
  },
  {
    id: 'estados-unidos',
    name: 'Estados Unidos',
    slug: 'estados-unidos',
    flag: 'US',
    confederation: 'Concacaf',
    fifaStrength: 1845,
    shortDescription: 'Anfitrion. Plantel joven y atletico con profundidad.',
  },
  {
    id: 'australia',
    name: 'Australia',
    slug: 'australia',
    flag: 'AU',
    confederation: 'AFC',
    fifaStrength: 1735,
    shortDescription: 'Seleccion fisica y competitiva, fuerte en duelos.',
  },
  {
    id: 'paraguay',
    name: 'Paraguay',
    slug: 'paraguay',
    flag: 'PY',
    confederation: 'CONMEBOL',
    fifaStrength: 1745,
    shortDescription: 'Equipo sudamericano compacto y de juego directo.',
  },
  {
    id: 'turquia',
    name: 'Turquia',
    slug: 'turquia',
    flag: 'TR',
    confederation: 'UEFA',
    fifaStrength: 1785,
    shortDescription: 'Clasificada via repechaje UEFA (ruta C).',
    notes: 'Clasificacion confirmada el 31/03/2026.',
  },
  {
    id: 'alemania',
    name: 'Alemania',
    slug: 'alemania',
    flag: 'DE',
    confederation: 'UEFA',
    fifaStrength: 1880,
    shortDescription: 'Seleccion historica con gran profundidad y ritmo alto.',
  },
  {
    id: 'ecuador',
    name: 'Ecuador',
    slug: 'ecuador',
    flag: 'EC',
    confederation: 'CONMEBOL',
    fifaStrength: 1800,
    shortDescription: 'Equipo intenso, rapido y fuerte en transiciones.',
  },
  {
    id: 'costa-de-marfil',
    name: 'Costa de Marfil',
    slug: 'costa-de-marfil',
    flag: 'CI',
    confederation: 'CAF',
    fifaStrength: 1770,
    shortDescription: 'Seleccion africana potente fisicamente y con talento ofensivo.',
  },
  {
    id: 'curazao',
    name: 'Curazao',
    slug: 'curazao',
    flag: 'CW',
    confederation: 'Concacaf',
    fifaStrength: 1605,
    shortDescription: 'Seleccion de Concacaf con crecimiento sostenido.',
  },
  {
    id: 'paises-bajos',
    name: 'Paises Bajos',
    slug: 'paises-bajos',
    flag: 'NL',
    confederation: 'UEFA',
    fifaStrength: 1900,
    shortDescription: 'SelecciÃ³n europea de posesiÃ³n, tÃ©cnica y alta intensidad.',
  },
  {
    id: 'japon',
    name: 'Japon',
    slug: 'japon',
    flag: 'JP',
    confederation: 'AFC',
    fifaStrength: 1815,
    shortDescription: 'Equipo muy organizado, veloz y tacticamente riguroso.',
  },
  {
    id: 'tunez',
    name: 'Tunez',
    slug: 'tunez',
    flag: 'TN',
    confederation: 'CAF',
    fifaStrength: 1685,
    shortDescription: 'Seleccion africana ordenada y competitiva.',
  },
  {
    id: 'suecia',
    name: 'Suecia',
    slug: 'suecia',
    flag: 'SE',
    confederation: 'UEFA',
    fifaStrength: 1800,
    shortDescription: 'Clasificada via repechaje UEFA (ruta B).',
    notes: 'Clasificacion confirmada el 31/03/2026.',
  },
  {
    id: 'belgica',
    name: 'Belgica',
    slug: 'belgica',
    flag: 'BE',
    confederation: 'UEFA',
    fifaStrength: 1860,
    shortDescription: 'Seleccion europea de jerarquia y talento individual.',
  },
  {
    id: 'iran',
    name: 'Iran',
    slug: 'iran',
    flag: 'IR',
    confederation: 'AFC',
    fifaStrength: 1740,
    shortDescription: 'Equipo disciplinado, compacto y peligroso al contragolpe.',
  },
  {
    id: 'egipto',
    name: 'Egipto',
    slug: 'egipto',
    flag: 'EG',
    confederation: 'CAF',
    fifaStrength: 1730,
    shortDescription: 'Seleccion africana con experiencia y buen bloque medio.',
  },
  {
    id: 'nueva-zelanda',
    name: 'Nueva Zelanda',
    slug: 'nueva-zelanda',
    flag: 'NZ',
    confederation: 'OFC',
    fifaStrength: 1635,
    shortDescription: 'Representante oceanico con juego fisico y orden tactico.',
  },
  {
    id: 'espana',
    name: 'Espana',
    slug: 'espana',
    flag: 'ES',
    confederation: 'UEFA',
    fifaStrength: 1920,
    shortDescription: 'PosesiÃ³n y presiÃ³n alta, siempre candidata.',
  },
  {
    id: 'uruguay',
    name: 'Uruguay',
    slug: 'uruguay',
    flag: 'UY',
    confederation: 'CONMEBOL',
    fifaStrength: 1885,
    shortDescription: 'Seleccion historica con gran competitividad y oficio.',
  },
  {
    id: 'arabia-saudita',
    name: 'Arabia Saudita',
    slug: 'arabia-saudita',
    flag: 'SA',
    confederation: 'AFC',
    fifaStrength: 1690,
    shortDescription: 'Seleccion asiatica intensa y disciplinada.',
  },
  {
    id: 'cabo-verde',
    name: 'Cabo Verde',
    slug: 'cabo-verde',
    flag: 'CV',
    confederation: 'CAF',
    fifaStrength: 1715,
    shortDescription: 'Seleccion africana competitiva con buen despliegue fisico.',
  },
  {
    id: 'francia',
    name: 'Francia',
    slug: 'francia',
    flag: 'FR',
    confederation: 'UEFA',
    fifaStrength: 1950,
    shortDescription: 'Plantel elite con profundidad y talento diferencial.',
  },
  {
    id: 'senegal',
    name: 'Senegal',
    slug: 'senegal',
    flag: 'SN',
    confederation: 'CAF',
    fifaStrength: 1805,
    shortDescription: 'Seleccion africana con potencia fisica y estructura competitiva.',
  },
  {
    id: 'noruega',
    name: 'Noruega',
    slug: 'noruega',
    flag: 'NO',
    confederation: 'UEFA',
    fifaStrength: 1785,
    shortDescription: 'Seleccion europea en ascenso, fuerte en ataque directo.',
  },
  {
    id: 'irak',
    name: 'Irak',
    slug: 'irak',
    flag: 'IQ',
    confederation: 'AFC',
    fifaStrength: 1690,
    shortDescription: 'Clasificada via repechaje intercontinental.',
    notes: 'Clasificacion confirmada el 31/03/2026 tras vencer 2-1 a Bolivia.',
  },
  {
    id: 'argentina',
    name: 'Argentina',
    slug: 'argentina',
    flag: 'AR',
    confederation: 'CONMEBOL',
    fifaStrength: 1975,
    shortDescription: 'Campeona vigente y favorita por talento y funcionamiento.',
  },
  {
    id: 'austria',
    name: 'Austria',
    slug: 'austria',
    flag: 'AT',
    confederation: 'UEFA',
    fifaStrength: 1795,
    shortDescription: 'Seleccion europea intensa con pressing alto y buena organizacion.',
  },
  {
    id: 'argelia',
    name: 'Argelia',
    slug: 'argelia',
    flag: 'DZ',
    confederation: 'CAF',
    fifaStrength: 1755,
    shortDescription: 'Seleccion africana tecnica y competitiva.',
  },
  {
    id: 'jordania',
    name: 'Jordania',
    slug: 'jordania',
    flag: 'JO',
    confederation: 'AFC',
    fifaStrength: 1600,
    shortDescription: 'Seleccion asiatica de crecimiento reciente.',
  },
  {
    id: 'portugal',
    name: 'Portugal',
    slug: 'portugal',
    flag: 'PT',
    confederation: 'UEFA',
    fifaStrength: 1910,
    shortDescription: 'Seleccion europea con gran talento individual y profundidad.',
  },
  {
    id: 'colombia',
    name: 'Colombia',
    slug: 'colombia',
    flag: 'CO',
    confederation: 'CONMEBOL',
    fifaStrength: 1835,
    shortDescription: 'Seleccion sudamericana intensa, tecnica y competitiva.',
  },
  {
    id: 'uzbekistan',
    name: 'Uzbekistan',
    slug: 'uzbekistan',
    flag: 'UZ',
    confederation: 'AFC',
    fifaStrength: 1655,
    shortDescription: 'Seleccion asiatica con crecimiento sostenido.',
  },
  {
    id: 'rd-congo',
    name: 'RD Congo',
    slug: 'rd-congo',
    flag: 'CD',
    confederation: 'CAF',
    fifaStrength: 1710,
    shortDescription: 'Clasificada via repechaje intercontinental.',
    notes: 'Clasificacion confirmada el 31/03/2026 tras vencer a Jamaica en tiempo extra.',
  },
  {
    id: 'inglaterra',
    name: 'Inglaterra',
    slug: 'inglaterra',
    flag: 'GB',
    confederation: 'UEFA',
    fifaStrength: 1930,
    shortDescription: 'Seleccion con talento en todas las lineas y alto volumen ofensivo.',
  },
  {
    id: 'croacia',
    name: 'Croacia',
    slug: 'croacia',
    flag: 'HR',
    confederation: 'UEFA',
    fifaStrength: 1820,
    shortDescription: 'Seleccion de gran oficio y mediocampo competitivo.',
  },
  {
    id: 'panama',
    name: 'Panama',
    slug: 'panama',
    flag: 'PA',
    confederation: 'Concacaf',
    fifaStrength: 1660,
    shortDescription: 'Seleccion de Concacaf ordenada y competitiva.',
  },
  {
    id: 'ghana',
    name: 'Ghana',
    slug: 'ghana',
    flag: 'GH',
    confederation: 'CAF',
    fifaStrength: 1710,
    shortDescription: 'Seleccion africana de intensidad alta y transicion rapida.',
  },
];

export const WORLD_CUP_2026_GROUPS: Group[] = [
  { id: 'A', name: 'Grupo A', teams: ['Mexico', 'Corea del Sur', 'Sudafrica', 'Chequia'] },
  { id: 'B', name: 'Grupo B', teams: ['Canada', 'Suiza', 'Qatar', 'Bosnia y Herzegovina'] },
  { id: 'C', name: 'Grupo C', teams: ['Brasil', 'Marruecos', 'Escocia', 'Haiti'] },
  { id: 'D', name: 'Grupo D', teams: ['Estados Unidos', 'Australia', 'Paraguay', 'Turquia'] },
  { id: 'E', name: 'Grupo E', teams: ['Alemania', 'Ecuador', 'Costa de Marfil', 'Curazao'] },
  { id: 'F', name: 'Grupo F', teams: ['Paises Bajos', 'Japon', 'Tunez', 'Suecia'] },
  { id: 'G', name: 'Grupo G', teams: ['Belgica', 'Iran', 'Egipto', 'Nueva Zelanda'] },
  { id: 'H', name: 'Grupo H', teams: ['Espana', 'Uruguay', 'Arabia Saudita', 'Cabo Verde'] },
  {
    id: 'I',
    name: 'Grupo I',
    teams: ['Francia', 'Senegal', 'Noruega', 'Irak'],
  },
  { id: 'J', name: 'Grupo J', teams: ['Argentina', 'Austria', 'Argelia', 'Jordania'] },
  {
    id: 'K',
    name: 'Grupo K',
    teams: ['Portugal', 'Colombia', 'Uzbekistan', 'RD Congo'],
  },
  { id: 'L', name: 'Grupo L', teams: ['Inglaterra', 'Croacia', 'Panama', 'Ghana'] },
];

const ARTICLE_TEAM_TO_CANONICAL: Record<string, string> = {
  Algeria: 'Argelia',
  Argentina: 'Argentina',
  Australia: 'Australia',
  Austria: 'Austria',
  Belgium: 'Belgica',
  Brazil: 'Brasil',
  Canada: 'Canada',
  'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
  Bosnia: 'Bosnia y Herzegovina',
  'Cape Verde': 'Cabo Verde',
  Colombia: 'Colombia',
  Czechia: 'Chequia',
  'Czech Republic': 'Chequia',
  Croatia: 'Croacia',
  Curacao: 'Curazao',
  Ecuador: 'Ecuador',
  Egypt: 'Egipto',
  England: 'Inglaterra',
  France: 'Francia',
  Germany: 'Alemania',
  Ghana: 'Ghana',
  Haiti: 'Haiti',
  Iran: 'Iran',
  Iraq: 'Irak',
  'Ivory Coast': 'Costa de Marfil',
  Japan: 'Japon',
  Jordan: 'Jordania',
  Mexico: 'Mexico',
  Morocco: 'Marruecos',
  Netherlands: 'Paises Bajos',
  'New Zealand': 'Nueva Zelanda',
  Norway: 'Noruega',
  Panama: 'Panama',
  Paraguay: 'Paraguay',
  Portugal: 'Portugal',
  Qatar: 'Qatar',
  'DR Congo': 'RD Congo',
  'Congo DR': 'RD Congo',
  Sweden: 'Suecia',
  'Saudi Arabia': 'Arabia Saudita',
  Scotland: 'Escocia',
  Senegal: 'Senegal',
  'South Africa': 'Sudafrica',
  'South Korea': 'Corea del Sur',
  Spain: 'Espana',
  Switzerland: 'Suiza',
  Turkey: 'Turquia',
  Tunisia: 'Tunez',
  Uruguay: 'Uruguay',
  USA: 'Estados Unidos',
  Uzbekistan: 'Uzbekistan',
  TBD: 'TBD',
  TDB: 'TBD',
};

const CANONICAL_GROUP_BY_TEAM = new Map<string, string>(
  WORLD_CUP_2026_GROUPS.flatMap((group) => group.teams.map((team) => [team, group.id] as const)),
);

const OFFICIAL_FIXTURE_ROWS = (officialFixtureRaw.fixtures as OfficialFixtureRow[]).slice();

function buildTbdFallbackByGroup(rows: OfficialFixtureRow[]) {
  const knownTeamsByGroup = new Map<string, Set<string>>();

  for (const row of rows) {
    if (row.stage !== 'group') continue;
    const groupId = inferGroupFromArticleFixture(row);
    if (!groupId) continue;

    const home = row.homeTeam ? ARTICLE_TEAM_TO_CANONICAL[row.homeTeam] ?? row.homeTeam : null;
    const away = row.awayTeam ? ARTICLE_TEAM_TO_CANONICAL[row.awayTeam] ?? row.awayTeam : null;
    const set = knownTeamsByGroup.get(groupId) ?? new Set<string>();
    if (home && home !== 'TBD') set.add(home);
    if (away && away !== 'TBD') set.add(away);
    knownTeamsByGroup.set(groupId, set);
  }

  const fallback = new Map<string, string>();
  for (const group of WORLD_CUP_2026_GROUPS) {
    const known = knownTeamsByGroup.get(group.id) ?? new Set<string>();
    const missing = group.teams.filter((team) => !known.has(team));
    if (missing.length === 1) {
      fallback.set(group.id, missing[0]);
    }
  }

  return fallback;
}

const TBD_FALLBACK_BY_GROUP = buildTbdFallbackByGroup(OFFICIAL_FIXTURE_ROWS);

const TEAM_INFO_BY_NAME = new Map(TEAM_CATALOG.map((team) => [team.name, team]));

const FIFA_WORLD_CUP_2026_TEAM_NEWS_BASE =
  'https://www.fifa.com/es/tournaments/mens/worldcup/canadamexicousa2026/teams';

const FIFA_TEAM_NEWS_SLUG_BY_TEAM: Record<string, string> = {
  Alemania: 'germany',
  'Arabia Saudita': 'saudi-arabia',
  Argelia: 'algeria',
  Argentina: 'argentina',
  Australia: 'australia',
  Austria: 'austria',
  Belgica: 'belgium',
  Brasil: 'brazil',
  'Cabo Verde': 'cabo-verde',
  Canada: 'canada',
  Colombia: 'colombia',
  'Corea del Sur': 'korea-republic',
  'Costa de Marfil': 'cote-divoire',
  Croacia: 'croatia',
  Curazao: 'curacao',
  Chequia: 'czechia',
  Ecuador: 'ecuador',
  Egipto: 'egypt',
  Espana: 'spain',
  'Estados Unidos': 'usa',
  Escocia: 'scotland',
  Francia: 'france',
  Ghana: 'ghana',
  'Bosnia y Herzegovina': 'bosnia-and-herzegovina',
  Haiti: 'haiti',
  Iran: 'ir-iran',
  Irak: 'iraq',
  Inglaterra: 'england',
  Japon: 'japan',
  Jordania: 'jordan',
  Marruecos: 'morocco',
  Mexico: 'mexico',
  'Nueva Zelanda': 'new-zealand',
  Noruega: 'norway',
  Panama: 'panama',
  Paraguay: 'paraguay',
  'Paises Bajos': 'netherlands',
  Portugal: 'portugal',
  Qatar: 'qatar',
  'RD Congo': 'dr-congo',
  Suecia: 'sweden',
  Senegal: 'senegal',
  Sudafrica: 'south-africa',
  Suiza: 'switzerland',
  Turquia: 'turkey',
  Tunez: 'tunisia',
  Uruguay: 'uruguay',
  Uzbekistan: 'uzbekistan',
};

function ensureCompleteOfficialFixtureRows(rows: OfficialFixtureRow[]): OfficialFixtureRow[] {
  const hasTunisiaNetherlands = rows.some(
    (row) =>
      row.stage === 'group' &&
      row.matchLabel.toLowerCase().includes('tunisia vs netherlands'),
  );

  if (hasTunisiaNetherlands) return rows;

  return [
    ...rows,
    {
      stage: 'group',
      dateHeading: 'Thursday, June 25',
      matchLabel: 'Tunisia vs Netherlands',
      localTime: '7pm',
      gmtInfo: '01:00 GMT on Friday',
      venue: 'Kansas City Stadium, Kansas City, US',
      homeTeam: 'Tunisia',
      awayTeam: 'Netherlands',
    },
  ];
}

function parseDateHeadingToUtcDate(dateHeading: string): { year: number; month: number; day: number } {
  const match = dateHeading.match(/(June|July)\s+(\d{1,2})|(\d{1,2})\s+(June|July)/i);
  if (!match) {
    return { year: 2026, month: 6, day: 11 };
  }

  const monthName = (match[1] || match[4] || '').toLowerCase();
  const dayValue = Number(match[2] || match[3]);
  const month = monthName.startsWith('june') ? 6 : 7;

  return { year: 2026, month, day: dayValue };
}

function parseGmtInfoToIso(dateHeading: string, gmtInfo: string): string {
  const date = parseDateHeadingToUtcDate(dateHeading);
  const timeMatch = gmtInfo.match(/(\d{2}):(\d{2})\s*GMT/i);
  const hour = timeMatch ? Number(timeMatch[1]) : 0;
  const minute = timeMatch ? Number(timeMatch[2]) : 0;

  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day, hour, minute, 0));
  const weekdayMatch = gmtInfo.match(/on\s+(Friday|Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday)/i);
  if (weekdayMatch) {
    const weekdayMap: Record<string, number> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };
    const targetWeekday = weekdayMap[weekdayMatch[1][0].toUpperCase() + weekdayMatch[1].slice(1).toLowerCase()];
    if (Number.isInteger(targetWeekday) && utc.getUTCDay() !== targetWeekday) {
      utc.setUTCDate(utc.getUTCDate() + 1);
    }
  }
  return utc.toISOString();
}

function parseLocalTimeToParts(localTime: string): { hour: number; minute: number; addDay: number } | null {
  const normalized = localTime.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'midnight') {
    // In this fixture source, "midnight" is listed at the end of the day block (00:00 of next local day).
    return { hour: 0, minute: 0, addDay: 1 };
  }

  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? '0');
  const meridiem = match[3].toLowerCase();

  if (meridiem === 'am') {
    if (hour === 12) hour = 0;
  } else if (hour !== 12) {
    hour += 12;
  }

  return { hour, minute, addDay: 0 };
}

function getVenueUtcOffsetHours(venue?: string): number | null {
  if (!venue) return null;
  const hit = VENUE_UTC_OFFSET_BY_PREFIX.find((entry) => venue.startsWith(entry.prefix));
  return hit ? hit.offsetHours : null;
}

function parseOfficialFixtureLocalKickoffToIso(row: OfficialFixtureRow): string | null {
  const date = parseDateHeadingToUtcDate(row.dateHeading);
  const time = parseLocalTimeToParts(row.localTime);
  const venueOffset = getVenueUtcOffsetHours(row.venue);
  if (!time || venueOffset === null) return null;

  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day, time.hour - venueOffset, time.minute, 0));
  if (time.addDay) {
    utc.setUTCDate(utc.getUTCDate() + time.addDay);
  }

  return utc.toISOString();
}

function parseKickoffArgentinaIso(row: OfficialFixtureRow): string | null {
  const raw = String(row.kickoffArgentina ?? '').trim();
  if (!raw) return null;

  const direct = Date.parse(raw);
  if (Number.isFinite(direct)) {
    return new Date(direct).toISOString();
  }

  // Backward-compatible fallback if JSON uses local datetime without explicit zone.
  const withArgentinaOffset = Date.parse(`${raw}-03:00`);
  if (Number.isFinite(withArgentinaOffset)) {
    return new Date(withArgentinaOffset).toISOString();
  }

  return null;
}

function parseOfficialFixtureEtKickoffToIso(row: OfficialFixtureRow): string | null {
  const date = parseDateHeadingToUtcDate(row.dateHeading);
  const time = parseLocalTimeToParts(row.localTime);
  if (!time) return null;

  // The source fixture uses Eastern Time (ET) for kickoff labels.
  // During June/July 2026 ET is UTC-4 (EDT).
  const easternOffset = -4;
  const utc = new Date(Date.UTC(date.year, date.month - 1, date.day, time.hour - easternOffset, time.minute, 0));
  if (time.addDay) {
    utc.setUTCDate(utc.getUTCDate() + time.addDay);
  }
  return utc.toISOString();
}

function getOfficialRowKickoffIso(row: OfficialFixtureRow): string {
  // Priority:
  // 1) explicit AR kickoff from JSON (source of truth)
  // 2) explicit overrides
  // 3) fallback parsers for legacy rows without kickoffArgentina
  return (
    parseKickoffArgentinaIso(row) ??
    getManualKickoffOverrideIso(row) ??
    parseOfficialFixtureEtKickoffToIso(row) ??
    parseGmtInfoToIso(row.dateHeading, row.gmtInfo) ??
    parseOfficialFixtureLocalKickoffToIso(row)
  );
}

function getManualKickoffOverrideIso(row: { stage: string; matchLabel: string }) {
  if (row.stage !== 'group') return null;
  if (row.matchLabel === 'Argentina vs Algeria') {
    return new Date(Date.UTC(2026, 5, 17, 1, 0, 0)).toISOString(); // 16/06/2026 22:00 Argentina
  }
  if (row.matchLabel === 'Argentina vs Austria') {
    return new Date(Date.UTC(2026, 5, 22, 17, 0, 0)).toISOString(); // 22/06/2026 14:00 Argentina
  }
  if (row.matchLabel === 'Jordan vs Argentina') {
    return new Date(Date.UTC(2026, 5, 28, 2, 0, 0)).toISOString(); // 27/06/2026 23:00 Argentina
  }
  return null;
}

function mapArticleTeamToCanonical(articleTeam: string, groupIdHint: string | null): string {
  const mapped = ARTICLE_TEAM_TO_CANONICAL[articleTeam] ?? articleTeam;
  if (mapped !== 'TBD') return mapped;
  if (!groupIdHint) return articleTeam;

  return TBD_FALLBACK_BY_GROUP.get(groupIdHint) ?? articleTeam;
}

function inferGroupFromArticleFixture(row: OfficialFixtureRow): string | null {
  const homeKnown = row.homeTeam ? ARTICLE_TEAM_TO_CANONICAL[row.homeTeam] : undefined;
  const awayKnown = row.awayTeam ? ARTICLE_TEAM_TO_CANONICAL[row.awayTeam] : undefined;

  const homeGroup = homeKnown && homeKnown !== 'TBD' ? CANONICAL_GROUP_BY_TEAM.get(homeKnown) : undefined;
  const awayGroup = awayKnown && awayKnown !== 'TBD' ? CANONICAL_GROUP_BY_TEAM.get(awayKnown) : undefined;

  return homeGroup ?? awayGroup ?? null;
}

function normalizePairKey(groupId: string, a: string, b: string): string {
  const sorted = [a, b].sort((x, y) => x.localeCompare(y, 'es'));
  return `${groupId}|${sorted[0]}|${sorted[1]}`;
}

export function hasKnownTeam(teamName: string): boolean {
  if (TEAM_INFO_BY_NAME.has(teamName)) return true;
  const alias = ARTICLE_TEAM_TO_CANONICAL[teamName];
  return Boolean(alias && alias !== 'TBD' && TEAM_INFO_BY_NAME.has(alias));
}

export function getTeamInfo(teamName: string): TeamInfo {
  const canonical = ARTICLE_TEAM_TO_CANONICAL[teamName];
  const info = TEAM_INFO_BY_NAME.get(teamName) ?? (canonical && canonical !== 'TBD' ? TEAM_INFO_BY_NAME.get(canonical) : undefined);
  if (info) return info;
  return {
    id: teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: teamName,
    slug: teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    flag: 'PO',
    confederation: 'N/A',
    fifaStrength: 1700,
    shortDescription: 'Seleccion sin metadata cargada.',
    isPlaceholder: true,
  };
}

export function getFlagIcon(teamName: string): string {
  const code = getTeamInfo(teamName).flag;
  if (code === 'PO') return 'PO';
  if (code === 'GB-SCT') return 'SCT';
  if (!/^[A-Z]{2}$/.test(code)) return code;
  const chars = code
    .split('')
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
  return chars.join('');
}

export function getFlagLabel(teamName: string): string {
  const code = getTeamInfo(teamName).flag;
  if (code === 'PO') return 'PO';
  if (code === 'GB-SCT') return 'SCT';
  return code;
}

export function getFlagAssetUrl(teamName: string): string | null {
  const code = getTeamInfo(teamName).flag.toLowerCase();
  if (code === 'po') return null;
  if (code === 'gb-sct') return 'https://hatscripts.github.io/circle-flags/flags/gb-sct.svg';
  if (!/^[a-z]{2}$/.test(code)) return null;
  return `https://hatscripts.github.io/circle-flags/flags/${code}.svg`;
}

export function getFifaTeamNewsUrl(teamName: string): string | null {
  const team = getTeamInfo(teamName);
  if (team.isPlaceholder) return null;
  const slug = FIFA_TEAM_NEWS_SLUG_BY_TEAM[team.name];
  if (!slug) return null;
  return `${FIFA_WORLD_CUP_2026_TEAM_NEWS_BASE}/${slug}/team-news`;
}

export function getWikipediaTitleForTeam(teamName: string): string {
  const canonical = getTeamInfo(teamName).name;
  const override = TEAM_WIKIPEDIA_TITLE_OVERRIDES[canonical];
  if (override) return override;
  return fixMojibakeText(`SelecciÃƒÆ’Ã‚Â³n_de_fÃƒÆ’Ã‚Âºtbol_de_${canonical.replace(/\s+/g, '_')}`);
}

export function buildTeamProdeSummary(teamName: string, groupId?: string) {
  const team = getTeamInfo(teamName);
  const base = `${team.name} integra ${team.confederation}${groupId ? ` y compite en el Grupo ${groupId}` : ''} del Mundial 2026.`;

  if (team.isPlaceholder) {
    return fixMojibakeText(`${base} Esta plaza todavÃƒÂ­a no tiene seleccionado confirmado porque depende del repechaje.`);
  }

  let tier = 'equipo competitivo';
  if (team.fifaStrength >= 1930) tier = 'favorito al titulo';
  else if (team.fifaStrength >= 1860) tier = 'candidato fuerte';
  else if (team.fifaStrength >= 1780) tier = 'seleccion muy competitiva';

  return normalizeSpanishDisplayText(
    `${base} En el PRODE la app la evalua como ${tier} (indice ${team.fifaStrength}), por lo que sus probabilidades prepartido tienden a reflejar ese perfil.`,
  );
}

export function buildTeamSportFacts(teamName: string, groupTeams?: string[]) {
  const team = getTeamInfo(teamName);
  const rivals = (groupTeams ?? []).filter((t) => t !== team.name);
  const rivalInfos = rivals.map((name) => getTeamInfo(name));

  const strongestRival = rivalInfos
    .slice()
    .sort((a, b) => b.fifaStrength - a.fifaStrength)[0];

  const avgRivalStrength = rivalInfos.length
    ? Math.round(rivalInfos.reduce((acc, r) => acc + r.fifaStrength, 0) / rivalInfos.length)
    : null;

  const avgWinProb = rivals.length
    ? Math.round(
        rivals.reduce((acc, rival) => acc + estimateMatchProbabilities(team.name, rival).homeWinPct, 0) / rivals.length,
      )
    : null;

  const confedProfile =
    team.confederation === 'UEFA'
      ? 'Llega desde un entorno de alta exigencia competitiva (UEFA).'
      : team.confederation === 'CONMEBOL'
        ? 'Tiene roce sudamericano de alta intensidad (CONMEBOL).'
        : team.confederation === 'Concacaf'
          ? 'Perfil regional de Concacaf, con partidos fisicos y transiciones rapidas.'
          : team.confederation === 'CAF'
            ? 'Suele competir con ritmo alto y potencia fisica (CAF).'
            : team.confederation === 'AFC'
              ? 'Perfil tactico/disciplinado con gran variabilidad de estilos (AFC).'
              : 'Su rendimiento depende de la definicion de la plaza y del contexto del grupo.';

  const objective =
    team.isPlaceholder
      ? 'Objetivo deportivo: definir clasificacion via repechaje y luego competir por sumar en grupo.'
      : team.fifaStrength >= 1900
        ? 'Objetivo deportivo estimado: clasificar primero o segundo y proyectarse a fases finales.'
        : team.fifaStrength >= 1800
          ? 'Objetivo deportivo estimado: pelear la clasificacion a fase final hasta la ultima fecha.'
          : 'Objetivo deportivo estimado: competir en el grupo y buscar puntos clave en cruces directos.';

  const facts = [
    `Indice de fuerza PRODE: ${team.fifaStrength}${avgRivalStrength ? ` (promedio de rivales de grupo: ${avgRivalStrength})` : ''}.`,
    avgWinProb !== null
      ? `Probabilidad media estimada de victoria en fase de grupos: ${avgWinProb}% (modelo interno de la app).`
      : 'Sin datos suficientes para estimar una probabilidad media de grupo.',
    strongestRival
      ? `Rival de grupo mas exigente por indice: ${strongestRival.name} (${strongestRival.fifaStrength}).`
      : 'No hay rival de grupo definido para calcular exigencia.',
    confedProfile,
    objective,
  ];

  return facts.map(normalizeSpanishDisplayText);
}

type TeamEditorialNotes = {
  summary: string;
  relevantFact: string;
  curiousFact: string;
};

const TEAM_CURIOUS_FACT_OVERRIDES: Record<string, string> = {
  'Arabia Saudita': 'Dato curioso: protagonizó una de las grandes sorpresas recientes de los Mundiales al vencer a Argentina en Qatar 2022.',
  Argelia: 'Dato curioso: en Brasil 2014 llegó por primera vez a octavos y llevó a Alemania al alargue antes de caer.',
  Argentina: 'Dato curioso: llega como campeona vigente y buscará defender el título conseguido en Qatar 2022.',
  Australia: 'Dato curioso: integra la confederación asiática para competir, aunque geográficamente pertenece a Oceanía.',
  Austria: 'Dato curioso: vuelve a un Mundial después de una larga ausencia desde Francia 1998.',
  Alemania: 'Dato curioso: ganó cuatro Mundiales y es una de las selecciones con más finales disputadas en la historia.',
  Belgica: 'Dato curioso: su mejor Mundial fue Rusia 2018, cuando terminó tercera tras vencer a Inglaterra.',
  'Bosnia y Herzegovina': 'Dato curioso: su debut mundialista fue en Brasil 2014.',
  Brasil: 'Dato curioso: es la única selección que participó en todos los Mundiales de la historia.',
  Canada: 'Dato curioso: será anfitrión mundialista por primera vez en categoría masculina.',
  'Cabo Verde': 'Dato curioso: jugará su primer Mundial y será uno de los debutantes de 2026.',
  Colombia: 'Dato curioso: James Rodríguez fue Botín de Oro en Brasil 2014 con seis goles.',
  'Corea del Sur': 'Dato curioso: jugará su undécimo Mundial consecutivo, una racha que empezó en México 1986.',
  'Costa de Marfil': 'Dato curioso: vuelve al Mundial tras ausentarse en 2018 y 2022.',
  Croacia: 'Dato curioso: fue subcampeona en 2018 y tercera en 1998 y 2022, una eficacia notable para un país joven.',
  Curazao: 'Dato curioso: jugará su primer Mundial y llega como una de las selecciones debutantes de 2026.',
  Chequia: 'Dato curioso: vuelve al Mundial por primera vez desde Alemania 2006.',
  Ecuador: 'Dato curioso: su mejor actuación mundialista fue en Alemania 2006, cuando alcanzó los octavos de final.',
  Egipto: 'Dato curioso: su primera participación mundialista fue en 1934, una de las más antiguas de África.',
  Espana: 'Dato curioso: ganó el Mundial 2010 con una final definida por el gol de Andrés Iniesta en el alargue.',
  'Estados Unidos': 'Dato curioso: será anfitrión por segunda vez; ya organizó el Mundial de 1994.',
  Escocia: 'Dato curioso: vuelve a un Mundial después de no jugarlo desde Francia 1998.',
  Francia: 'Dato curioso: disputó dos finales consecutivas en 2018 y 2022, ganando una y perdiendo la otra por penales.',
  Ghana: 'Dato curioso: en 2010 estuvo a un penal de convertirse en la primera selección africana semifinalista.',
  Haiti: 'Dato curioso: regresa al Mundial por primera vez desde 1974.',
  Iran: 'Dato curioso: suma una nueva clasificación tras haber jugado también Rusia 2018 y Qatar 2022.',
  Irak: 'Dato curioso: vuelve al Mundial por primera vez desde México 1986.',
  Inglaterra: 'Dato curioso: su único título mundial fue como local en 1966.',
  Japon: 'Dato curioso: clasificó a todos los Mundiales desde Francia 1998 en adelante.',
  Jordania: 'Dato curioso: jugará su primer Mundial en 2026.',
  Marruecos: 'Dato curioso: en Qatar 2022 fue la primera selección africana en llegar a semifinales de un Mundial.',
  Mexico: 'Dato curioso: será el primer país en ser sede de tres Mundiales: 1970, 1986 y 2026.',
  'Nueva Zelanda': 'Dato curioso: en Sudáfrica 2010 terminó invicta, con tres empates en fase de grupos.',
  Noruega: 'Dato curioso: vuelve al Mundial después de no jugarlo desde Francia 1998.',
  Panama: 'Dato curioso: su debut mundialista fue en Rusia 2018.',
  Paraguay: 'Dato curioso: regresa al Mundial después de su histórica campaña de 2010, cuando llegó a cuartos de final.',
  'Paises Bajos': 'Dato curioso: disputó tres finales mundiales y aún busca su primer título.',
  Portugal: 'Dato curioso: su mejor Mundial fue 1966, cuando terminó tercero con Eusébio como figura.',
  Qatar: 'Dato curioso: 2026 será su primera clasificación obtenida en cancha, tras debutar como anfitrión en 2022.',
  'RD Congo': 'Dato curioso: regresa al Mundial por primera vez desde 1974, cuando compitió como Zaire.',
  Suecia: 'Dato curioso: fue finalista como anfitriona en 1958.',
  Senegal: 'Dato curioso: en su debut mundialista de 2002 venció a Francia, vigente campeona en ese momento.',
  Sudafrica: 'Dato curioso: vuelve al Mundial por primera vez desde 2010, cuando fue anfitrión.',
  Suiza: 'Dato curioso: suele ser una presencia estable en Mundiales recientes y clasificó a octavos en varias ediciones consecutivas.',
  Turquia: 'Dato curioso: vuelve al Mundial por primera vez desde 2002, cuando terminó tercera.',
  Tunez: 'Dato curioso: fue la primera selección africana en ganar un partido mundialista, en 1978 ante México.',
  Uruguay: 'Dato curioso: ganó el primer Mundial de la historia, disputado en 1930 en Montevideo.',
  Uzbekistan: 'Dato curioso: jugará su primer Mundial en 2026.',
};

const TEAM_RELEVANT_FACT_OVERRIDES: Record<string, string> = {
  'Arabia Saudita': 'Dato relevante: llega desde AFC y suele competir con bloque compacto, transiciones rápidas y partidos de bajo margen.',
  Argelia: 'Dato relevante: vuelve a la escena mundialista con una base física y técnica que puede complicar partidos cerrados.',
  Argentina: 'Dato relevante: entra como campeona vigente y con puntaje alto en el modelo interno, por eso sus partidos suelen mover fuerte las predicciones.',
  Australia: 'Dato relevante: su perfil físico y experiencia en torneos la vuelve peligrosa en cruces directos y partidos de ritmo alto.',
  Austria: 'Dato relevante: regresa al Mundial tras su ausencia desde 1998, con una identidad de presión alta y mucha intensidad sin pelota.',
  Alemania: 'Dato relevante: su jerarquía histórica y profundidad de plantel la mantienen como rival de máxima exigencia aunque venga de ciclos irregulares.',
  Belgica: 'Dato relevante: combina experiencia internacional con talento ofensivo, por lo que sus partidos suelen tener alta expectativa de gol.',
  'Bosnia y Herzegovina': 'Dato relevante: llega desde el repechaje UEFA y puede ser un rival incómodo por juego físico y orden defensivo.',
  Brasil: 'Dato relevante: es pentacampeona mundial y una de las selecciones con mayor peso ofensivo en cualquier simulación del torneo.',
  Canada: 'Dato relevante: como anfitrión, tendrá localía en fase de grupos y un contexto emocional que puede elevar su rendimiento.',
  'Cabo Verde': 'Dato relevante: debuta en un Mundial, por lo que su rendimiento tendrá más incertidumbre estadística que el de selecciones habituales.',
  Colombia: 'Dato relevante: su fortaleza está en el desequilibrio ofensivo y el talento individual, especialmente en partidos de ida y vuelta.',
  'Corea del Sur': 'Dato relevante: trae una racha larga de presencias mundialistas consecutivas y suele competir bien en partidos de alta velocidad.',
  'Costa de Marfil': 'Dato relevante: vuelve con potencia física y talento ofensivo, dos factores importantes para pronósticos de goles.',
  Croacia: 'Dato relevante: su experiencia reciente en fases finales la vuelve una selección difícil de descartar en partidos equilibrados.',
  Curazao: 'Dato relevante: al ser debutante mundialista, puede generar partidos de alta variabilidad para el PRODE.',
  Chequia: 'Dato relevante: regresa al Mundial tras 20 años y suele apoyarse en estructura, pelota parada y orden táctico.',
  Ecuador: 'Dato relevante: su intensidad sin pelota y su velocidad en transiciones pueden incomodar a rivales técnicamente superiores.',
  Egipto: 'Dato relevante: su peso ofensivo depende mucho de la eficacia en pocos ataques, algo clave para marcadores ajustados.',
  Espana: 'Dato relevante: su modelo de posesión y presión alta suele producir control territorial y muchos partidos con dominio de pelota.',
  'Estados Unidos': 'Dato relevante: como anfitrión, tendrá apoyo local y una generación con muchos jugadores formados en ligas europeas.',
  Escocia: 'Dato relevante: vuelve al Mundial desde 1998 y suele competir con intensidad, duelos físicos y juego directo.',
  Francia: 'Dato relevante: llega con uno de los planteles más profundos del torneo y capacidad para sostener nivel aun rotando titulares.',
  Ghana: 'Dato relevante: su velocidad en ataque y despliegue físico suelen hacerla peligrosa incluso ante rivales mejor rankeados.',
  Haiti: 'Dato relevante: regresa tras su única participación previa en 1974, por lo que será una de las selecciones con mayor componente emocional.',
  Iran: 'Dato relevante: acostumbra partidos tácticos, con bloque bajo y contragolpe, algo importante para estimar marcadores cortos.',
  Irak: 'Dato relevante: vuelve al Mundial después de 1986 y llega con un recorrido clasificatorio largo y competitivo.',
  Inglaterra: 'Dato relevante: combina una generación de alto valor internacional con la presión histórica de volver a ganar desde 1966.',
  Japon: 'Dato relevante: su disciplina táctica y velocidad colectiva lo convierten en uno de los rivales asiáticos más consistentes.',
  Jordania: 'Dato relevante: debuta en la Copa del Mundo, con un perfil de crecimiento reciente y poca referencia histórica mundialista.',
  Marruecos: 'Dato relevante: tras ser semifinalista en 2022, ya no llega como sorpresa sino como selección de referencia africana.',
  Mexico: 'Dato relevante: abrirá el torneo como anfitrión y la localía puede pesar especialmente en Ciudad de México.',
  'Nueva Zelanda': 'Dato relevante: representa a OFC y suele competir desde el orden defensivo y el juego aéreo.',
  Noruega: 'Dato relevante: vuelve al Mundial desde 1998 con un ataque de enorme atractivo para pronósticos de goles.',
  Panama: 'Dato relevante: jugará su segundo Mundial y llega con más experiencia competitiva que en su debut de 2018.',
  Paraguay: 'Dato relevante: regresa tras no jugar desde 2010 y suele ser fuerte en partidos cerrados, duelos y pelota parada.',
  'Paises Bajos': 'Dato relevante: tiene tradición de fases finales y un estilo que suele combinar posesión, laterales largos y presión alta.',
  Portugal: 'Dato relevante: llega con gran profundidad ofensiva y varias alternativas de gol, no solo una figura principal.',
  Qatar: 'Dato relevante: será su primera clasificación obtenida en eliminatorias, a diferencia de su debut como anfitrión en 2022.',
  'RD Congo': 'Dato relevante: vuelve al Mundial después de 1974 y puede ser un equipo incómodo por potencia física y transición.',
  Suecia: 'Dato relevante: regresa al Mundial con una identidad históricamente asociada a orden defensivo y fortaleza aérea.',
  Senegal: 'Dato relevante: es una de las selecciones africanas más competitivas de los últimos ciclos y suele sostener partidos físicos.',
  Sudafrica: 'Dato relevante: vuelve después de 2010 y su rendimiento puede depender mucho del primer partido ante el anfitrión.',
  Suiza: 'Dato relevante: suele avanzar con regularidad desde fase de grupos gracias a estructura defensiva y oficio competitivo.',
  Turquia: 'Dato relevante: regresa desde 2002 y llega como posible equipo incómodo por talento joven y ritmo ofensivo.',
  Tunez: 'Dato relevante: su fortaleza suele estar en el orden defensivo y en reducir espacios, clave para marcadores bajos.',
  Uruguay: 'Dato relevante: combina historia mundialista con competitividad sudamericana, ideal para partidos intensos y de pocos detalles.',
  Uzbekistan: 'Dato relevante: debuta en un Mundial y representa una de las grandes novedades competitivas de Asia Central.',
};

export function buildTeamEditorialNotes(teamName: string, groupId?: string, groupTeams?: string[]): TeamEditorialNotes {
  const team = getTeamInfo(teamName);
  const sportFacts = buildTeamSportFacts(teamName, groupTeams);

  if (team.isPlaceholder) {
    return {
      summary: normalizeSpanishDisplayText(
        `${team.name} corresponde a un cupo pendiente de repechaje. La referencia deportiva puede cambiar cuando se defina el clasificado, por eso conviene revisar esta ficha mÃ¡s cerca del inicio del grupo ${groupId ?? '-'}.`,
      ),
      relevantFact: normalizeSpanishDisplayText(
        'Dato relevante: al no estar definida la selecciÃ³n, la proyecciÃ³n de rendimiento y probabilidades de la app es provisional.',
      ),
      curiousFact: normalizeSpanishDisplayText(
        'Dato curioso: estos cupos suelen generar desvÃ­os en el PRODE porque muchos pronÃ³sticos se cargan antes de conocerse el rival definitivo.',
      ),
    };
  }

  const tierLabel =
    team.fifaStrength >= 1930
      ? 'favorito fuerte'
      : team.fifaStrength >= 1860
        ? 'candidato serio'
        : team.fifaStrength >= 1780
          ? 'selecciÃ³n competitiva'
          : 'selecciÃ³n de perfil impredecible';

  const hostTag =
    ['Argentina', 'Brasil', 'Francia', 'Inglaterra', 'Alemania', 'Espana', 'Portugal'].includes(team.name)
      ? 'Tiene plantel con aspiraciones altas en un torneo largo.'
      : ['Mexico', 'Canada', 'Estados Unidos'].includes(team.name)
        ? 'AdemÃ¡s, juega con contexto de anfitriÃ³n, un factor que puede influir en la fase de grupos.'
        : '';

  const summary = normalizeSpanishDisplayText(
    `${team.name} es una ${tierLabel} de ${team.confederation}${groupId ? ` dentro del Grupo ${groupId}` : ''}. ${sportFacts[0] ?? ''} ${hostTag}`.trim(),
  );

  const relevantFact = normalizeSpanishDisplayText(
    TEAM_RELEVANT_FACT_OVERRIDES[team.name] ??
      `Dato relevante: ${sportFacts[1] ?? `la app la valora con Ã­ndice ${team.fifaStrength} para estimar probabilidades prepartido.`}`,
  );

  const curiousFact = normalizeSpanishDisplayText(
    TEAM_CURIOUS_FACT_OVERRIDES[team.name] ??
      `Dato curioso: las selecciones de ${team.confederation} suelen mostrar patrones de juego distintos entre sÃ­, asÃ­ que mirar rivales y contexto del grupo mejora mucho el pronÃ³stico.`,
  );

  return { summary, relevantFact, curiousFact };
}

export function getAllTeams(): TeamInfo[] {
  return TEAM_CATALOG
    .map((team) => ({
      ...team,
      shortDescription: normalizeSpanishDisplayText(team.shortDescription),
      notes: team.notes ? normalizeSpanishDisplayText(team.notes) : undefined,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function estimateMatchProbabilities(homeTeam: string, awayTeam: string) {
  const home = getTeamInfo(homeTeam);
  const away = getTeamInfo(awayTeam);
  const diff = home.fifaStrength - away.fifaStrength + 25;

  const homeExpected = 1 / (1 + Math.pow(10, -diff / 400));
  const awayExpected = 1 - homeExpected;

  const drawBase = 0.28;
  const drawAdjustment = Math.max(0, 0.08 - Math.min(Math.abs(diff), 160) / 2200);
  const draw = Math.min(0.34, drawBase + drawAdjustment);

  const winPool = 1 - draw;
  const homeWin = homeExpected * winPool;
  const awayWin = awayExpected * winPool;

  return {
    homeWinPct: Math.round(homeWin * 100),
    drawPct: Math.round(draw * 100),
    awayWinPct: Math.round(awayWin * 100),
  };
}

type KnockoutSlot =
  | { kind: 'group'; position: 1 | 2; groupId: string; label: string }
  | { kind: 'third'; candidateGroupIds: string[]; label: string };

const ROUND_OF_32_SLOTS: Array<{ id: string; home: KnockoutSlot; away: KnockoutSlot }> = [
  { id: 'KO-73', home: { kind: 'group', position: 2, groupId: 'A', label: '2do Grupo A' }, away: { kind: 'group', position: 2, groupId: 'B', label: '2do Grupo B' } },
  { id: 'KO-74', home: { kind: 'group', position: 1, groupId: 'E', label: '1ro Grupo E' }, away: { kind: 'third', candidateGroupIds: ['A', 'B', 'C', 'D', 'F'], label: '3ro Grupos A/B/C/D/F' } },
  { id: 'KO-75', home: { kind: 'group', position: 1, groupId: 'F', label: '1ro Grupo F' }, away: { kind: 'group', position: 2, groupId: 'C', label: '2do Grupo C' } },
  { id: 'KO-76', home: { kind: 'group', position: 1, groupId: 'C', label: '1ro Grupo C' }, away: { kind: 'group', position: 2, groupId: 'F', label: '2do Grupo F' } },
  { id: 'KO-77', home: { kind: 'group', position: 1, groupId: 'I', label: '1ro Grupo I' }, away: { kind: 'third', candidateGroupIds: ['C', 'D', 'F', 'G', 'H'], label: '3ro Grupos C/D/F/G/H' } },
  { id: 'KO-78', home: { kind: 'group', position: 2, groupId: 'E', label: '2do Grupo E' }, away: { kind: 'group', position: 2, groupId: 'I', label: '2do Grupo I' } },
  { id: 'KO-79', home: { kind: 'group', position: 1, groupId: 'A', label: '1ro Grupo A' }, away: { kind: 'third', candidateGroupIds: ['C', 'E', 'F', 'H', 'I'], label: '3ro Grupos C/E/F/H/I' } },
  { id: 'KO-80', home: { kind: 'group', position: 1, groupId: 'L', label: '1ro Grupo L' }, away: { kind: 'third', candidateGroupIds: ['E', 'H', 'I', 'J', 'K'], label: '3ro Grupos E/H/I/J/K' } },
  { id: 'KO-81', home: { kind: 'group', position: 1, groupId: 'D', label: '1ro Grupo D' }, away: { kind: 'third', candidateGroupIds: ['B', 'E', 'F', 'I', 'J'], label: '3ro Grupos B/E/F/I/J' } },
  { id: 'KO-82', home: { kind: 'group', position: 1, groupId: 'G', label: '1ro Grupo G' }, away: { kind: 'third', candidateGroupIds: ['A', 'E', 'H', 'I', 'J'], label: '3ro Grupos A/E/H/I/J' } },
  { id: 'KO-83', home: { kind: 'group', position: 2, groupId: 'K', label: '2do Grupo K' }, away: { kind: 'group', position: 2, groupId: 'L', label: '2do Grupo L' } },
  { id: 'KO-84', home: { kind: 'group', position: 1, groupId: 'H', label: '1ro Grupo H' }, away: { kind: 'group', position: 2, groupId: 'J', label: '2do Grupo J' } },
  { id: 'KO-85', home: { kind: 'group', position: 1, groupId: 'B', label: '1ro Grupo B' }, away: { kind: 'third', candidateGroupIds: ['E', 'F', 'G', 'I', 'J'], label: '3ro Grupos E/F/G/I/J' } },
  { id: 'KO-86', home: { kind: 'group', position: 1, groupId: 'J', label: '1ro Grupo J' }, away: { kind: 'group', position: 2, groupId: 'H', label: '2do Grupo H' } },
  { id: 'KO-87', home: { kind: 'group', position: 1, groupId: 'K', label: '1ro Grupo K' }, away: { kind: 'third', candidateGroupIds: ['D', 'E', 'I', 'J', 'L'], label: '3ro Grupos D/E/I/J/L' } },
  { id: 'KO-88', home: { kind: 'group', position: 2, groupId: 'D', label: '2do Grupo D' }, away: { kind: 'group', position: 2, groupId: 'G', label: '2do Grupo G' } },
];

export function buildKnockoutCalendar(): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const addStage = (
    stage: string,
    dates: string[],
    matchesPerDate: number[],
    labels: Array<{ id: string; homeTeam: string; awayTeam: string }>,
  ) => {
    let idx = 0;
    dates.forEach((date, dateIndex) => {
      for (let i = 0; i < matchesPerDate[dateIndex]; i += 1) {
        const label = labels[idx];
        if (!label) return;
        events.push({
          id: label.id,
          stage,
          date: `${date}T20:00:00.000Z`,
          homeTeam: label.homeTeam,
          awayTeam: label.awayTeam,
        });
        idx += 1;
      }
    });
  };

  const r32Labels = ROUND_OF_32_SLOTS.map(({ id, home, away }) => ({
    id,
    homeTeam: home.label,
    awayTeam: away.label,
  }));
  addStage(
    '16avos',
    ['2026-06-28', '2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03'],
    [3, 3, 3, 3, 2, 2],
    r32Labels,
  );

  const r16Labels = Array.from({ length: 8 }, (_, i) => ({
    id: `KO-${89 + i}`,
    homeTeam: `Ganador M${73 + i * 2}`,
    awayTeam: `Ganador M${74 + i * 2}`,
  }));
  addStage('8vos', ['2026-07-04', '2026-07-05', '2026-07-06', '2026-07-07'], [2, 2, 2, 2], r16Labels);

  const qfLabels = Array.from({ length: 4 }, (_, i) => ({
    id: `KO-${97 + i}`,
    homeTeam: `Ganador M${89 + i * 2}`,
    awayTeam: `Ganador M${90 + i * 2}`,
  }));
  addStage('Cuartos', ['2026-07-09', '2026-07-10', '2026-07-11'], [1, 2, 1], qfLabels);

  const sfLabels = Array.from({ length: 2 }, (_, i) => ({
    id: `KO-${101 + i}`,
    homeTeam: `Ganador M${97 + i * 2}`,
    awayTeam: `Ganador M${98 + i * 2}`,
  }));
  addStage('Semifinal', ['2026-07-14', '2026-07-15'], [1, 1], sfLabels);

  events.push({
    id: 'KO-103',
    stage: 'Tercer puesto',
    date: '2026-07-18T20:00:00.000Z',
    homeTeam: 'Perdedor SF1',
    awayTeam: 'Perdedor SF2',
  });
  events.push({
    id: 'KO-104',
    stage: 'Final',
    date: '2026-07-19T20:00:00.000Z',
    homeTeam: 'Ganador SF1',
    awayTeam: 'Ganador SF2',
  });

  return events;
}

export function buildKnockoutMatches(): Match[] {
  const knockoutRows = ensureCompleteOfficialFixtureRows(OFFICIAL_FIXTURE_ROWS).filter((row) => row.stage === 'knockout');
  const knockoutCalendar = buildKnockoutCalendar();

  return knockoutCalendar.map((fixture, index) => {
    const row = knockoutRows[index];
    return {
      id: fixture.id,
      groupId: 'KO',
      stage: fixture.stage,
      matchday: index + 1,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      kickoffAt: row ? getOfficialRowKickoffIso(row) : fixture.date,
      venue: row?.venue ?? fixture.venue ?? null,
      officialResult: null,
    } satisfies Match;
  });
}

type GroupTableRow = {
  team: string;
  groupId: string;
  pts: number;
  gf: number;
  gc: number;
  dg: number;
};

function getCurrentGroupPositions(matches: Match[], groups: Group[]) {
  const positions = new Map<string, string>();
  const thirdRows: GroupTableRow[] = [];

  for (const group of groups) {
    const groupMatches = matches.filter((match) => match.groupId === group.id);
    if (groupMatches.every((match) => !match.officialResult)) continue;

    const rows = new Map(
      group.teams.map((team) => [
        team,
        { team, groupId: group.id, pts: 0, gf: 0, gc: 0, dg: 0 } satisfies GroupTableRow,
      ]),
    );

    for (const match of groupMatches) {
      if (!match.officialResult) continue;
      const result = match.officialResult!;
      const home = rows.get(match.homeTeam);
      const away = rows.get(match.awayTeam);
      if (!home || !away) continue;
      home.gf += result.home;
      home.gc += result.away;
      away.gf += result.away;
      away.gc += result.home;
      if (result.home > result.away) home.pts += 3;
      else if (result.home < result.away) away.pts += 3;
      else {
        home.pts += 1;
        away.pts += 1;
      }
    }

    const ordered = [...rows.values()]
      .map((row) => ({ ...row, dg: row.gf - row.gc }))
      .sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.team.localeCompare(b.team, 'es'));

    ordered.forEach((row, index) => {
      const previous = ordered[index - 1];
      const next = ordered[index + 1];
      const tiedWithPrevious = previous && previous.pts === row.pts && previous.dg === row.dg && previous.gf === row.gf;
      const tiedWithNext = next && next.pts === row.pts && next.dg === row.dg && next.gf === row.gf;
      if (!tiedWithPrevious && !tiedWithNext) positions.set(`${index + 1}${group.id}`, row.team);
    });

    if (positions.has(`3${group.id}`)) thirdRows.push(ordered[2]);
  }

  return { positions, thirdRows };
}

function resolveThirdPlaceSlots(thirdRows: GroupTableRow[]) {
  const resolved = new Map<string, string>();
  if (thirdRows.length !== 12) return resolved;

  const ordered = [...thirdRows].sort(
    (a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.groupId.localeCompare(b.groupId),
  );
  const eighth = ordered[7];
  const ninth = ordered[8];
  if (eighth.pts === ninth.pts && eighth.dg === ninth.dg && eighth.gf === ninth.gf) return resolved;

  const qualified = ordered.slice(0, 8);
  const teamByGroup = new Map(qualified.map((row) => [row.groupId, row.team] as const));
  const thirdSlots = ROUND_OF_32_SLOTS
    .flatMap(({ id, home, away }) => [
      ...(home.kind === 'third' ? [{ key: `${id}:home`, slot: home }] : []),
      ...(away.kind === 'third' ? [{ key: `${id}:away`, slot: away }] : []),
    ])
    .sort(
      (a, b) =>
        a.slot.candidateGroupIds.filter((groupId) => teamByGroup.has(groupId)).length -
        b.slot.candidateGroupIds.filter((groupId) => teamByGroup.has(groupId)).length,
    );

  const solutions: Array<Map<string, string>> = [];
  let overflow = false;
  const visit = (index: number, usedGroups: Set<string>, assignment: Map<string, string>) => {
    if (solutions.length > 4096) {
      overflow = true;
      return;
    }
    if (index === thirdSlots.length) {
      solutions.push(new Map(assignment));
      return;
    }

    const { key, slot } = thirdSlots[index];
    for (const groupId of slot.candidateGroupIds) {
      if (!teamByGroup.has(groupId) || usedGroups.has(groupId)) continue;
      usedGroups.add(groupId);
      assignment.set(key, groupId);
      visit(index + 1, usedGroups, assignment);
      assignment.delete(key);
      usedGroups.delete(groupId);
    }
  };
  visit(0, new Set(), new Map());
  if (overflow || solutions.length === 0) return resolved;

  for (const { key } of thirdSlots) {
    const possibleGroups = new Set(solutions.map((solution) => solution.get(key)).filter(Boolean));
    if (possibleGroups.size !== 1) continue;
    const groupId = [...possibleGroups][0]!;
    const team = teamByGroup.get(groupId);
    if (team) resolved.set(key, team);
  }
  return resolved;
}

function getDecidedKnockoutTeam(match: Match | undefined, outcome: 'winner' | 'loser', knownTeams: Set<string>) {
  if (!match?.officialResult || match.officialResult.home === match.officialResult.away) return null;
  const homeWon = match.officialResult.home > match.officialResult.away;
  const team = outcome === 'winner'
    ? (homeWon ? match.homeTeam : match.awayTeam)
    : (homeWon ? match.awayTeam : match.homeTeam);
  return knownTeams.has(team) ? team : null;
}

export function resolveDynamicKnockoutParticipants(matches: Match[], groups: Group[]): Match[] {
  const resolvedMatches = matches.map((match) => ({ ...match }));
  const byId = new Map(resolvedMatches.map((match) => [match.id, match] as const));
  const knownTeams = new Set(groups.flatMap((group) => group.teams));
  const { positions, thirdRows } = getCurrentGroupPositions(resolvedMatches, groups);
  const thirdSlots = resolveThirdPlaceSlots(thirdRows);

  const resolveSlot = (matchId: string, side: 'home' | 'away', slot: KnockoutSlot) => {
    if (slot.kind === 'group') return positions.get(`${slot.position}${slot.groupId}`) ?? slot.label;
    return thirdSlots.get(`${matchId}:${side}`) ?? slot.label;
  };

  for (const { id, home, away } of ROUND_OF_32_SLOTS) {
    const match = byId.get(id);
    if (!match) continue;
    match.homeTeam = resolveSlot(id, 'home', home);
    match.awayTeam = resolveSlot(id, 'away', away);
  }

  const links: Array<{
    targetId: string;
    homeSourceId: string;
    awaySourceId: string;
    outcome: 'winner' | 'loser';
  }> = [
    ...Array.from({ length: 8 }, (_, index) => ({
      targetId: `KO-${89 + index}`,
      homeSourceId: `KO-${73 + index * 2}`,
      awaySourceId: `KO-${74 + index * 2}`,
      outcome: 'winner' as const,
    })),
    ...Array.from({ length: 4 }, (_, index) => ({
      targetId: `KO-${97 + index}`,
      homeSourceId: `KO-${89 + index * 2}`,
      awaySourceId: `KO-${90 + index * 2}`,
      outcome: 'winner' as const,
    })),
    ...Array.from({ length: 2 }, (_, index) => ({
      targetId: `KO-${101 + index}`,
      homeSourceId: `KO-${97 + index * 2}`,
      awaySourceId: `KO-${98 + index * 2}`,
      outcome: 'winner' as const,
    })),
    { targetId: 'KO-103', homeSourceId: 'KO-101', awaySourceId: 'KO-102', outcome: 'loser' as const },
    { targetId: 'KO-104', homeSourceId: 'KO-101', awaySourceId: 'KO-102', outcome: 'winner' as const },
  ];

  for (const link of links) {
    const target = byId.get(link.targetId);
    if (!target) continue;
    target.homeTeam =
      getDecidedKnockoutTeam(byId.get(link.homeSourceId), link.outcome, knownTeams) ?? target.homeTeam;
    target.awayTeam =
      getDecidedKnockoutTeam(byId.get(link.awaySourceId), link.outcome, knownTeams) ?? target.awayTeam;
  }

  return resolvedMatches;
}

export type CalendarFixture = CalendarEvent;

export function getOfficialGroupStageFixtures() {
  const rows = ensureCompleteOfficialFixtureRows(OFFICIAL_FIXTURE_ROWS).filter((row) => row.stage === 'group');

  const mapped = rows
    .map((row) => {
      const groupId = inferGroupFromArticleFixture(row);
      if (!groupId || !row.homeTeam || !row.awayTeam) return null;

      const homeTeam = mapArticleTeamToCanonical(row.homeTeam, groupId);
      const awayTeam = mapArticleTeamToCanonical(row.awayTeam, groupId);

      return {
        groupId,
        homeTeam,
        awayTeam,
        kickoffAt: getOfficialRowKickoffIso(row),
        venue: row.venue,
        sourceLabel: row.matchLabel,
        dateHeading: row.dateHeading,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  mapped.sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
  return mapped;
}

export function applyOfficialFixtureToGroupMatches(matches: Match[]): Match[] {
  const officialByPair = new Map(
    getOfficialGroupStageFixtures().map((fixture) => [
      normalizePairKey(fixture.groupId, fixture.homeTeam, fixture.awayTeam),
      fixture,
    ]),
  );

  const enriched = matches.map((match) => {
    const official = officialByPair.get(normalizePairKey(match.groupId, match.homeTeam, match.awayTeam));
    if (!official) return match;
    return {
      ...match,
      homeTeam: official.homeTeam,
      awayTeam: official.awayTeam,
      kickoffAt: official.kickoffAt,
      venue: official.venue,
    };
  });

  const byGroup = new Map<string, Match[]>();
  for (const match of enriched) {
    const list = byGroup.get(match.groupId) ?? [];
    list.push(match);
    byGroup.set(match.groupId, list);
  }

  for (const [groupId, groupMatches] of byGroup.entries()) {
    groupMatches.sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
    groupMatches.forEach((match, idx) => {
      match.matchday = Math.floor(idx / 2) + 1;
    });
    byGroup.set(groupId, groupMatches);
  }

  return enriched;
}

export function buildCalendarFixtures(
  groupStageMatches: Array<{ id: string; kickoffAt: string; homeTeam: string; awayTeam: string; groupId: string; venue?: string | null }>,
) {
  const dbMatchByPair = new Map(
    groupStageMatches.map((match) => [normalizePairKey(match.groupId, match.homeTeam, match.awayTeam), match] as const),
  );

  const rows = ensureCompleteOfficialFixtureRows(OFFICIAL_FIXTURE_ROWS);
  const counters = { group: 1, knockout: 73 };

  const fixtures: CalendarFixture[] = rows.map((row) => {
    if (row.stage === 'group' && row.homeTeam && row.awayTeam) {
      const groupId = inferGroupFromArticleFixture(row) ?? '?';
      const homeTeam = mapArticleTeamToCanonical(row.homeTeam, groupId === '?' ? null : groupId);
      const awayTeam = mapArticleTeamToCanonical(row.awayTeam, groupId === '?' ? null : groupId);
      const match = dbMatchByPair.get(normalizePairKey(groupId, homeTeam, awayTeam));
      const id = match?.id ?? `G-${String(counters.group++).padStart(2, '0')}`;

      return {
        id,
        stage: `Fase de grupos - ${groupId}`,
        date: match?.kickoffAt ?? getOfficialRowKickoffIso(row),
        homeTeam,
        awayTeam,
        venue: row.venue,
      };
    }

    const date = getOfficialRowKickoffIso(row);
    const knockoutId = `KO-${counters.knockout++}`;
    return {
      id: knockoutId,
      stage: 'Fase final',
      date,
      homeTeam: row.matchLabel,
      awayTeam: '',
      venue: row.venue,
    };
  });

  return fixtures.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
