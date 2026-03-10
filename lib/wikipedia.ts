import { getTeamInfo } from '@/lib/worldcup26';

type WikiSummary = {
  extract: string;
  pageUrl: string;
};

function normalizeExtract(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeSpanishTeamNameForWikipedia(teamName: string) {
  const aliases: Record<string, string> = {
    Belgica: 'Bélgica',
    Canada: 'Canadá',
    Espana: 'España',
    Haiti: 'Haití',
    Iran: 'Irán',
    Japon: 'Japón',
    Mexico: 'México',
    'Paises Bajos': 'Países Bajos',
    Sudafrica: 'Sudáfrica',
    Tunez: 'Túnez',
    Uzbekistan: 'Uzbekistán',
  };

  return aliases[teamName] ?? teamName;
}

function buildWikipediaTitleCandidates(teamName: string) {
  const canonical = getTeamInfo(teamName).name;
  const normalized = normalizeSpanishTeamNameForWikipedia(canonical);
  const candidates = new Set<string>();

  if (normalized === 'Estados Unidos') {
    candidates.add('Selección de fútbol de los Estados Unidos');
  } else if (normalized === 'Arabia Saudita') {
    candidates.add('Selección de fútbol de Arabia Saudita');
    candidates.add('Selección de fútbol de Arabia Saudí');
  } else if (normalized === 'Corea del Sur') {
    candidates.add('Selección de fútbol de Corea del Sur');
  } else {
    candidates.add(`Selección de fútbol de ${normalized}`);
  }

  candidates.add(`${normalized} (selección de fútbol)`);
  return [...candidates];
}

async function fetchSummaryByTitle(title: string): Promise<WikiSummary | null> {
  const url = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    next: { revalidate: 60 * 60 * 24 * 7 },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    title?: string;
    extract?: string;
    type?: string;
    content_urls?: { desktop?: { page?: string } };
  };

  if (!data.extract || data.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') {
    return null;
  }

  return {
    extract: normalizeExtract(data.extract),
    pageUrl: data.content_urls?.desktop?.page ?? `https://es.wikipedia.org/wiki/${encodeURIComponent(data.title ?? title)}`,
  };
}

async function searchWikipediaTeamPage(teamName: string): Promise<string | null> {
  const normalized = normalizeSpanishTeamNameForWikipedia(teamName);
  const queries = [`"Selección de fútbol de ${normalized}"`, `${normalized} selección de fútbol`];

  for (const q of queries) {
    const url =
      `https://es.wikipedia.org/w/api.php?action=query&list=search&format=json&utf8=1&srlimit=1&srsearch=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    if (!res.ok) continue;

    const data = (await res.json()) as {
      query?: { search?: Array<{ title?: string }> };
    };

    const title = data.query?.search?.[0]?.title?.trim();
    if (title) return title;
  }

  return null;
}

export async function getTeamWikipediaSummary(teamName: string): Promise<WikiSummary | null> {
  const team = getTeamInfo(teamName);
  if (team.isPlaceholder) return null;

  try {
    for (const candidateTitle of buildWikipediaTitleCandidates(team.name)) {
      const summary = await fetchSummaryByTitle(candidateTitle);
      if (summary) return summary;
    }

    const searchedTitle = await searchWikipediaTeamPage(team.name);
    if (searchedTitle) {
      return await fetchSummaryByTitle(searchedTitle);
    }

    return null;
  } catch {
    return null;
  }
}

