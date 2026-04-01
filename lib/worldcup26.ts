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

function getOfficialRowKickoffIso(row: OfficialFixtureRow): string {
  // Use GMT provided by the official fixture as source of truth.
  return parseGmtInfoToIso(row.dateHeading, row.gmtInfo);
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
  Argentina: 'Dato curioso: llega como campeona vigente, por lo que cada rival suele jugarle con un plus competitivo.',
  Brasil: 'Dato curioso: es la Ãºnica selecciÃ³n que participÃ³ en todos los Mundiales de la historia.',
  Alemania: 'Dato curioso: suele rendir mejor cuanto mÃ¡s avanza el torneo, por profundidad y recambio.',
  Francia: 'Dato curioso: en torneos largos, su plantel suele permitir rotaciones sin perder demasiado nivel.',
  Inglaterra: 'Dato curioso: suele generar muchÃ­simo debate previo por la expectativa mediÃ¡tica que la acompaÃ±a.',
  Mexico: 'Dato curioso: como anfitriÃ³n, el factor local puede influir mucho en ritmo e intensidad en fase de grupos.',
  Canada: 'Dato curioso: ser anfitriÃ³n suele elevar la energÃ­a del grupo y el apoyo del pÃºblico en partidos clave.',
  'Estados Unidos':
    'Dato curioso: jugando como anfitriÃ³n, puede beneficiarse de logÃ­stica y adaptaciÃ³n, algo relevante en un torneo largo.',
  Japon: 'Dato curioso: sus partidos suelen ser tÃ¡cticamente muy ordenados, ideales para mirar detalles antes de predecir.',
  Marruecos: 'Dato curioso: su crecimiento reciente la volviÃ³ una selecciÃ³n que muchos rivales ya no subestiman.',
  Uruguay: 'Dato curioso: su tradiciÃ³n competitiva hace que incluso partidos cerrados sean difÃ­ciles de pronosticar.',
  Croacia: 'Dato curioso: suele competir muy bien en escenarios de alta presiÃ³n, incluso frente a favoritos.',
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
    `Dato relevante: ${sportFacts[2] ?? sportFacts[1] ?? `la app la valora con Ã­ndice ${team.fifaStrength} para estimar probabilidades prepartido.`}`,
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

  const r32Labels = Array.from({ length: 16 }, (_, i) => ({
    id: `KO-${73 + i}`,
    homeTeam: `1ro/2do de grupo (${73 + i})`,
    awayTeam: `Cruce pendiente (${73 + i})`,
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
