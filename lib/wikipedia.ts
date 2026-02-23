import { getTeamInfo, getWikipediaTitleForTeam } from '@/lib/worldcup26';

type WikiSummary = {
  extract: string;
  pageUrl: string;
};

function normalizeExtract(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

export async function getTeamWikipediaSummary(teamName: string): Promise<WikiSummary | null> {
  const team = getTeamInfo(teamName);
  if (team.isPlaceholder) return null;

  const title = getWikipediaTitleForTeam(team.name);
  const url = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

  try {
    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      next: { revalidate: 60 * 60 * 24 * 7 },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      extract?: string;
      type?: string;
      content_urls?: { desktop?: { page?: string } };
    };

    if (!data.extract || data.type === 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found') {
      return null;
    }

    return {
      extract: normalizeExtract(data.extract),
      pageUrl: data.content_urls?.desktop?.page ?? `https://es.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    };
  } catch {
    return null;
  }
}
