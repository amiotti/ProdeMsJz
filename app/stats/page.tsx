import { UserEvolutionComparisonChart } from '@/components/user-evolution-comparison-chart';
import { requireAuthenticatedUser } from '@/lib/route-guard';
import { getState } from '@/lib/db';
import { formatKickoffArgentina } from '@/lib/datetime';
import { calculatePredictionPoints } from '@/lib/prode';
import { getStatsAnalytics, type StatsAnalyticsSnapshot } from '@/lib/stats-analytics';
import type { LeaderboardRow, Match, Prediction, ProdeDB, Score, StateResponse, User } from '@/lib/types';
import { getTeamDisplayName } from '@/lib/worldcup26';

export const dynamic = 'force-dynamic';

type BarDatum = {
  label: string;
  value: number;
  color?: string;
  note?: string;
};

type SeriesDatum = {
  label: string;
  values: number[];
  color: string;
  emphasized?: boolean;
};

type OfficialMatchInsights = {
  playedCount: number;
  totalGoals: number;
  avgGoals: number;
  cleanSheets: number;
  topScoring: BarDatum[];
  biggestMargins: BarDatum[];
  hardestMatches: BarDatum[];
};

type HistoricalProdeRow = {
  name: string;
  aliases?: string[];
  values: Array<number | 'X'>;
  played: number;
};

const HISTORICAL_COLUMNS = ['Brasil 2014', 'Rusia 2018', 'Copa Ame/Eu', 'Mini Ame/Eu', 'Qatar 2022', 'Copa Ame/Euro', 'Mini Copa Ame/Euro'] as const;

const HISTORICAL_PRODE_ROWS: HistoricalProdeRow[] = [
  { name: 'BOSSA', values: [20, 27, 36, 8, 29, 36, 13], played: 299 },
  { name: 'BOTTACIN', values: [23, 28, 34, 10, 27, 32, 12], played: 299 },
  { name: 'MIOTTI', values: [21, 26, 'X', 'X', 28, 35, 14], played: 227 },
  { name: 'CALVO', values: [20, 27, 33, 'X', 29, 'X', 'X'], played: 200 },
  { name: 'ZIELINSKI', values: [22, 28, 34, 10, 24, 30, 'X'], played: 276 },
  { name: 'TUESCA', values: [21, 29, 32, 'X', 26, 30, 'X'], played: 260 },
  { name: 'DEL BARCO', values: [21, 27, 37, 7, 26, 30, 10], played: 299 },
  { name: 'VENTURINO', values: [18, 26, 'X', 'X', 28, 35, 9], played: 227 },
  { name: 'PEROTTI', values: [20, 'X', 34, 7, 27, 32, 8], played: 251 },
  { name: 'BODELLO', values: [14, 26, 29, 8, 25, 36, 13], played: 299 },
  { name: 'ROSSANIGO', values: [19, 'X', 27, 6, 31, 32, 10], played: 251 },
  { name: 'FRAIZ', values: [20, 24, 30, 4, 26, 36, 8], played: 299 },
  { name: 'LAMBER', aliases: ['SANTIAGO LAMBERTUCCI', 'LAMBERTUCCI'], values: [18, 21, 27, 'X', 27, 29, 13], played: 283 },
];

const HISTORICAL_MATCH_COUNTS = [48, 48, 56, 16, 48, 60, 23] as const;

function isPredictionEditable(kickoffAt: string, nowMs = Date.now()) {
  const kickoffMs = new Date(kickoffAt).getTime();
  if (!Number.isFinite(kickoffMs)) return false;
  return nowMs < kickoffMs - 60 * 60 * 1000;
}

function normalizeHistoricalName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function historicalValueTotal(values: Array<number | 'X'>) {
  return values.reduce<number>((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
}

function buildCurrentSignHitsByHistoricalName(leaderboard: LeaderboardRow[]) {
  const map = new Map<string, number>();
  for (const row of leaderboard) {
    const fullName = normalizeHistoricalName(`${row.firstName} ${row.lastName}`);
    const lastName = normalizeHistoricalName(row.lastName || row.userName);
    const signHits = row.exactHits + row.outcomeHits;
    if (lastName) map.set(lastName, signHits);
    if (fullName) map.set(fullName, signHits);
  }
  return map;
}

function HistoricalProdeTable({ state }: { state: StateResponse }) {
  const currentSignHitsByName = buildCurrentSignHitsByHistoricalName(state.leaderboard);
  const historicalTotalMatches = HISTORICAL_MATCH_COUNTS.reduce((sum, value) => sum + value, 0);
  const currentOfficialMatches = state.summary.matchesWithOfficialResult;
  const totalMatchesWithCurrent = historicalTotalMatches + currentOfficialMatches;
  const historicalRows = HISTORICAL_PRODE_ROWS.map((row) => {
    const lookupNames = [row.name, ...(row.aliases ?? [])].map(normalizeHistoricalName);
    const currentHits = lookupNames.reduce((max, key) => Math.max(max, currentSignHitsByName.get(key) ?? 0), 0);
    const totalHits = historicalValueTotal(row.values) + currentHits;
    const played = row.played + currentOfficialMatches;
    const hitPct = played > 0 ? Math.round((totalHits / played) * 100) : 0;
    const playedPct = totalMatchesWithCurrent > 0 ? Math.round((played / totalMatchesWithCurrent) * 100) : 0;
    return { row, currentHits, totalHits, played, hitPct, playedPct };
  }).sort((a, b) => b.hitPct - a.hitPct || b.totalHits - a.totalHits || a.row.name.localeCompare(b.row.name, 'es'));

  return (
    <div className="panel stack-md historical-prode-panel">
      <div className="section-head">
        <h3>Tabla histórica PRODE LBB</h3>
        <span>Aciertos por signo</span>
      </div>
      <p className="muted">
        Comparativa histórica de prodes anteriores, continuada con los aciertos por signo del Mundial 2026.
      </p>
      <div className="table-wrap">
        <table className="table historical-prode-table">
          <thead>
            <tr>
              <th>Nombre</th>
              {HISTORICAL_COLUMNS.map((column) => (
                <th key={column}>{column}</th>
              ))}
              <th>USA MEX CAN 2026</th>
              <th>Total aciertos</th>
              <th>% acierto</th>
              <th>Jugados</th>
              <th>% jugados</th>
            </tr>
          </thead>
          <tbody>
            {historicalRows.map(({ row, currentHits, totalHits, played, hitPct, playedPct }) => {
              return (
                <tr key={row.name}>
                  <th scope="row">{row.name}</th>
                  {row.values.map((value, index) => (
                    <td key={`${row.name}-${HISTORICAL_COLUMNS[index]}`}>{value}</td>
                  ))}
                  <td>{currentHits}</td>
                  <td>{totalHits}</td>
                  <td>{hitPct}%</td>
                  <td>{played}</td>
                  <td>{playedPct}%</td>
                </tr>
              );
            })}
            <tr className="historical-prode-total-row">
              <th scope="row">PARTIDOS</th>
              {HISTORICAL_MATCH_COUNTS.map((value, index) => (
                <td key={`matches-${HISTORICAL_COLUMNS[index]}`}>{value}</td>
              ))}
              <td>{currentOfficialMatches}</td>
              <td>{totalMatchesWithCurrent}</td>
              <td>-</td>
              <td>{totalMatchesWithCurrent}</td>
              <td>100%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="muted compact-text">* La columna USA MEX CAN 2026 se actualiza con resultados oficiales cargados.</p>
    </div>
  );
}

function BarChart({ data, height = 220 }: { data: BarDatum[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const width = 760;
  const padding = { top: 16, right: 16, bottom: 56, left: 20 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const slot = innerW / Math.max(1, data.length);
  const barW = Math.max(18, slot * 0.55);

  return (
    <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Grafico de barras">
      <g transform={`translate(${padding.left},${padding.top})`}>
        {Array.from({ length: 4 }).map((_, i) => {
          const y = (innerH / 4) * i;
          return <line key={i} x1={0} y1={y} x2={innerW} y2={y} className="chart-grid-line" />;
        })}
        {data.map((d, idx) => {
          const barH = (d.value / max) * innerH;
          const x = idx * slot + (slot - barW) / 2;
          const y = innerH - barH;
          return (
            <g key={`${d.label}-${idx}`}>
              <rect x={x} y={y} width={barW} height={Math.max(2, barH)} rx={8} className="chart-bar" fill={d.color ?? 'url(#barGradient)'} />
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" className="chart-value-label">
                {d.value}
              </text>
              <text x={x + barW / 2} y={innerH + 20} textAnchor="middle" className="chart-axis-label">
                {d.label}
              </text>
            </g>
          );
        })}
      </g>
      <defs>
        <linearGradient id="barGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#3850dd" />
          <stop offset="55%" stopColor="#59e3d7" />
          <stop offset="100%" stopColor="#f4be1f" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function HorizontalBars({ data, percent = false }: { data: BarDatum[]; percent?: boolean }) {
  const top = data.slice(0, 10);
  const max = Math.max(1, ...top.map((d) => d.value));
  return (
    <div className="hbars">
      {top.map((d) => (
        <div key={d.label} className="hbar-row">
          <div className="hbar-label">
            <span>{d.label}</span>
            {d.note ? <small>{d.note}</small> : null}
          </div>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <div className="hbar-value">{percent ? `${d.value}%` : d.value}</div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({
  segments,
  centerLabel,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
  centerLabel: string;
}) {
  const total = Math.max(1, segments.reduce((acc, s) => acc + s.value, 0));
  const r = 74;
  const stroke = 18;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="donut-wrap">
      <svg className="donut-svg" viewBox="0 0 220 220" role="img" aria-label="Grafico circular">
        <g transform="translate(110,110)">
          <circle r={r} fill="none" className="donut-track" strokeWidth={stroke} />
          {segments.map((seg) => {
            const len = (seg.value / total) * c;
            const node = (
              <circle
                key={seg.label}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                transform="rotate(-90)"
              />
            );
            offset += len;
            return node;
          })}
          <text x="0" y="-4" textAnchor="middle" className="donut-center-big">
            {total}
          </text>
          <text x="0" y="16" textAnchor="middle" className="donut-center-small">
            {centerLabel}
          </text>
        </g>
      </svg>
      <div className="donut-legend">
        {segments.map((s) => (
          <div key={s.label} className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: s.color }} />
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({
  labels,
  series,
  height = 280,
}: {
  labels: string[];
  series: SeriesDatum[];
  height?: number;
}) {
  const width = 760;
  const padding = { top: 18, right: 16, bottom: 54, left: 28 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const xStep = labels.length > 1 ? innerW / (labels.length - 1) : innerW;

  function pointY(v: number) {
    return innerH - (v / max) * innerH;
  }

  function path(values: number[]) {
    return values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * xStep} ${pointY(v)}`)
      .join(' ');
  }

  return (
    <div className="line-chart-wrap">
      <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Grafico de evolucion">
        <g transform={`translate(${padding.left},${padding.top})`}>
          {Array.from({ length: 5 }).map((_, i) => {
            const y = (innerH / 4) * i;
            return <line key={i} x1={0} y1={y} x2={innerW} y2={y} className="chart-grid-line" />;
          })}
          {series.map((s) => (
            <path
              key={s.label}
              d={path(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth={s.emphasized ? 3.5 : 2.1}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={s.emphasized ? 1 : 0.72}
            />
          ))}
          {labels.map((label, i) => (
            <text key={`${label}-${i}`} x={i * xStep} y={innerH + 18} textAnchor="middle" className="chart-axis-label">
              {label}
            </text>
          ))}
        </g>
      </svg>
      <div className="line-legend">
        {series.map((s) => (
          <div key={s.label} className="legend-item">
            <span className="legend-dot" style={{ backgroundColor: s.color }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function scoreOutcome(score: Score) {
  if (score.home > score.away) return 'home' as const;
  if (score.home < score.away) return 'away' as const;
  return 'draw' as const;
}

function getUniquePredictionRiskScore(userId: string, db: ProdeDB, frequency?: Map<string, number>) {
  const userPreds = db.predictions.filter((p) => p.userId === userId);
  if (userPreds.length === 0) return 0;
  const freqMap = frequency ?? new Map<string, number>();
  if (!frequency) {
    for (const p of db.predictions) {
      const key = `${p.matchId}|${p.homeGoals}|${p.awayGoals}`;
      freqMap.set(key, (freqMap.get(key) ?? 0) + 1);
    }
  }
  let uniqueCount = 0;
  for (const p of userPreds) {
    const key = `${p.matchId}|${p.homeGoals}|${p.awayGoals}`;
    if ((freqMap.get(key) ?? 0) === 1) uniqueCount += 1;
  }
  return Math.round((uniqueCount / userPreds.length) * 100);
}

function buildCumulativeSeries(state: StateResponse, analytics: StatsAnalyticsSnapshot, highlightUserId: string) {
  const palette = ['#3850dd', '#59e3d7', '#f4be1f', '#ef3100', '#9bd910', '#ff5f78', '#7b68ee'];
  const topIds = state.leaderboard.slice(0, 5).map((r) => r.userId);
  const ids = Array.from(new Set([...topIds, highlightUserId]));
  const labels = analytics.cumulativeLabels;
  const series = ids.reduce<SeriesDatum[]>((acc, id, idx) => {
      const row = state.leaderboard.find((r) => r.userId === id);
      const vals = analytics.cumulativeByUser.get(id) ?? [];
      if (!row) return acc;
      acc.push({
        label: `${row.firstName} ${row.lastName}`,
        values: vals.length ? vals : [0],
        color: id === highlightUserId ? '#ef3100' : palette[idx % palette.length] ?? '#3850dd',
        emphasized: id === highlightUserId,
      });
      return acc;
    }, []);

  return { labels: labels.length ? labels : ['Sin fechas'], series };
}

function getPositionDeltaFromLastDate(state: StateResponse, analytics: StatsAnalyticsSnapshot, userId: string) {
  if (analytics.cumulativeLabels.length < 2) return null;

  const pointsAt = (targetIndex: number, row: LeaderboardRow) => analytics.cumulativeByUser.get(row.userId)?.[targetIndex] ?? 0;
  const buildRankingAt = (targetIndex: number) =>
    [...state.leaderboard].sort((a, b) => {
      const pb = pointsAt(targetIndex, b);
      const pa = pointsAt(targetIndex, a);
      if (pb !== pa) return pb - pa;
      if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
      if (b.outcomeHits !== a.outcomeHits) return b.outcomeHits - a.outcomeHits;
      if (b.sideGoalsHits !== a.sideGoalsHits) return b.sideGoalsHits - a.sideGoalsHits;
      return a.userName.localeCompare(b.userName, 'es');
    });

  const prevRanking = buildRankingAt(analytics.cumulativeLabels.length - 2);
  const currentRanking = buildRankingAt(analytics.cumulativeLabels.length - 1);
  const prevPos = prevRanking.findIndex((row) => row.userId === userId);
  const currentPos = currentRanking.findIndex((row) => row.userId === userId);
  if (prevPos === -1 || currentPos === -1) return null;

  return prevPos - currentPos;
}

function getOfficialMatchInsights(state: StateResponse): OfficialMatchInsights {
  const playedMatches = [...state.db.matches]
    .filter((match) => match.officialResult)
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());

  if (playedMatches.length === 0) {
    return {
      playedCount: 0,
      totalGoals: 0,
      avgGoals: 0,
      cleanSheets: 0,
      topScoring: [],
      biggestMargins: [],
      hardestMatches: [],
    };
  }

  const predictionsByMatch = new Map<string, Prediction[]>();
  for (const prediction of state.db.predictions) {
    if (!predictionsByMatch.has(prediction.matchId)) predictionsByMatch.set(prediction.matchId, []);
    predictionsByMatch.get(prediction.matchId)!.push(prediction);
  }

  let totalGoals = 0;
  let cleanSheets = 0;

  const topScoring = playedMatches
    .map((match) => {
      const total = (match.officialResult?.home ?? 0) + (match.officialResult?.away ?? 0);
      totalGoals += total;
      if ((match.officialResult?.home ?? 0) === 0 || (match.officialResult?.away ?? 0) === 0) {
        cleanSheets += 1;
      }

      return {
        label: `${getTeamDisplayName(match.homeTeam)} ${match.officialResult?.home} - ${match.officialResult?.away} ${getTeamDisplayName(match.awayTeam)}`,
        value: total,
      };
    })
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'es'))
    .slice(0, 5);

  const biggestMargins = playedMatches
    .map((match) => ({
      label: `${getTeamDisplayName(match.homeTeam)} ${match.officialResult?.home} - ${match.officialResult?.away} ${getTeamDisplayName(match.awayTeam)}`,
      value: Math.abs((match.officialResult?.home ?? 0) - (match.officialResult?.away ?? 0)),
    }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'es'))
    .slice(0, 5);

  const hardestMatches = playedMatches
    .map((match) => {
      const predictions = predictionsByMatch.get(match.id) ?? [];
      const accurateOutcome = predictions.reduce((acc, prediction) => {
        if (!match.officialResult) return acc;
        const points = calculatePredictionPoints(prediction, match.officialResult, state.db.pointsConfig);
        return acc + (points.exactHit || points.outcomeHit ? 1 : 0);
      }, 0);
      const accuracy = predictions.length > 0 ? Math.round((accurateOutcome / predictions.length) * 100) : 0;

      return {
        label: `${getTeamDisplayName(match.homeTeam)} ${match.officialResult?.home} - ${match.officialResult?.away} ${getTeamDisplayName(match.awayTeam)}`,
        value: 100 - accuracy,
        note:
          predictions.length > 0
            ? `${accurateOutcome}/${predictions.length} acertaron signo`
            : 'Sin predicciones evaluadas',
      };
    })
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'es'))
    .slice(0, 5);

  return {
    playedCount: playedMatches.length,
    totalGoals,
    avgGoals: totalGoals / playedMatches.length,
    cleanSheets,
    topScoring,
    biggestMargins,
    hardestMatches,
  };
}

function OfficialMatchStatsPanel({ state }: { state: StateResponse }) {
  const insights = getOfficialMatchInsights(state);

  return (
    <section className="stack-md">
      <div className="panel stack-md">
        <div className="section-head">
          <h3>Partidos oficiales</h3>
          <span>Métricas calculadas con resultados cargados</span>
        </div>

        <div className="detail-grid">
          <div className="detail-card">
            <span className="detail-label">Partidos evaluados</span>
            <strong>{insights.playedCount}</strong>
            <span className="muted compact-text">Solo encuentros con resultado oficial.</span>
          </div>
          <div className="detail-card">
            <span className="detail-label">Goles convertidos</span>
            <strong>{insights.totalGoals}</strong>
            <span className="muted compact-text">Total acumulado en partidos oficiales.</span>
          </div>
          <div className="detail-card">
            <span className="detail-label">Promedio de gol</span>
            <strong>{insights.avgGoals.toFixed(2)}</strong>
            <span className="muted compact-text">Media de goles por partido jugado.</span>
          </div>
          <div className="detail-card">
            <span className="detail-label">Arcos en cero</span>
            <strong>{insights.cleanSheets}</strong>
            <span className="muted compact-text">Partidos donde un equipo no recibio goles.</span>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="panel stack-md">
          <div className="section-head">
            <h3>Partidos con más goles</h3>
            <span>Top 5</span>
          </div>
          {insights.topScoring.length > 0 ? (
            <HorizontalBars data={insights.topScoring} />
          ) : (
            <p className="muted">Aún no hay resultados oficiales cargados.</p>
          )}
        </div>

        <div className="panel stack-md">
          <div className="section-head">
            <h3>Mayores diferencias</h3>
            <span>Top 5</span>
          </div>
          {insights.biggestMargins.length > 0 ? (
            <HorizontalBars data={insights.biggestMargins} />
          ) : (
            <p className="muted">Aún no hay resultados oficiales cargados.</p>
          )}
        </div>
      </div>

      <div className="panel stack-md">
        <div className="section-head">
          <h3>Partidos más difíciles</h3>
          <span>Menor acierto de signo del grupo</span>
        </div>
        {insights.hardestMatches.length > 0 ? (
          <HorizontalBars data={insights.hardestMatches} percent />
        ) : (
          <p className="muted">Aún no hay resultados oficiales cargados.</p>
        )}
      </div>
    </section>
  );
}

function NextMatchPredictionsPanel({
  state,
  analytics,
}: {
  state: StateResponse;
  analytics: StatsAnalyticsSnapshot;
}) {
  const nextMatch = analytics.nextMatchId ? state.db.matches.find((match) => match.id === analytics.nextMatchId) : null;
  if (!nextMatch || isPredictionEditable(nextMatch.kickoffAt)) return null;

  const total = analytics.nextMatchDist.home + analytics.nextMatchDist.draw + analytics.nextMatchDist.away;
  const homeName = getTeamDisplayName(nextMatch.homeTeam);
  const awayName = getTeamDisplayName(nextMatch.awayTeam);

  return (
    <div className="panel stack-md">
      <div className="section-head">
        <h3>Predicciones del próximo partido</h3>
        <span>{formatKickoffArgentina(nextMatch.kickoffAt)}</span>
      </div>
      <p className="muted compact-text">
        {homeName} vs {awayName}. Se muestra porque la edición ya está cerrada para este partido.
      </p>
      {total > 0 ? (
        <DonutChart
          centerLabel="pred."
          segments={[
            { label: homeName, value: analytics.nextMatchDist.home, color: '#3850dd' },
            { label: 'Empate', value: analytics.nextMatchDist.draw, color: '#f4be1f' },
            { label: awayName, value: analytics.nextMatchDist.away, color: '#ef3100' },
          ]}
        />
      ) : (
        <p className="muted">Todavía no hay predicciones cargadas para este partido.</p>
      )}
    </div>
  );
}

function AdminStatsDashboard({ state }: { state: StateResponse }) {
  const analytics = getStatsAnalytics(state);
  const predictionsByGroup = analytics.predictionsByGroup.map((g) => ({ label: g.groupId, value: g.count, note: g.groupName }));
  const avgGoals = analytics.avgGoals.toFixed(2);
  const participationBars = state.leaderboard.map((r) => ({
    label: `${r.firstName} ${r.lastName}`,
    value: r.totalPredictions,
    note: `${r.totalPoints} pts`,
  }));

  return (
    <section className="stack-lg">
      <div className="panel">
        <h2>Estadísticas (Administracion)</h2>
        <p className="muted">Vista general del PRODE para control del grupo y seguimiento de actividad.</p>
      </div>

      <div className="cards">
        <div className="stat-card"><div className="muted">Usuarios activos</div><div className="value">{state.summary.users}</div></div>
        <div className="stat-card"><div className="muted">Predicciones cargadas</div><div className="value">{state.summary.predictions}</div></div>
        <div className="stat-card"><div className="muted">Resultados cargados</div><div className="value">{state.summary.matchesWithOfficialResult}</div></div>
        <div className="stat-card"><div className="muted">Promedio de goles</div><div className="value">{avgGoals}</div></div>
      </div>

      <div className="stats-grid">
        <div className="panel stack-md">
          <div className="section-head"><h3>Predicciones por grupo</h3><span>Carga acumulada</span></div>
          <BarChart data={predictionsByGroup} />
        </div>
        <NextMatchPredictionsPanel state={state} analytics={analytics} />
        <div className="panel stack-md">
          <div className="section-head"><h3>Resultados oficiales</h3><span>Distribución de signos</span></div>
          <DonutChart
            centerLabel="partidos"
            segments={[
              { label: 'Gana local', value: analytics.officialOutcome.local, color: '#3850dd' },
              { label: 'Empate', value: analytics.officialOutcome.empate, color: '#f4be1f' },
              { label: 'Gana visitante', value: analytics.officialOutcome.visitante, color: '#ef3100' },
            ]}
          />
        </div>
      </div>

      <div className="stats-grid">
        <div className="panel stack-md">
          <div className="section-head"><h3>Participación por usuario</h3><span>Top por cantidad de predicciones</span></div>
          {participationBars.length > 0 ? <HorizontalBars data={participationBars} /> : <p className="muted">Aún no hay predicciones.</p>}
        </div>
        <div className="panel stack-md">
          <div className="section-head"><h3>Precisión global del PRODE</h3><span>Predicciones evaluadas</span></div>
          <DonutChart
            centerLabel="pred."
            segments={[
              { label: 'Exactas', value: analytics.exactHits, color: '#59e3d7' },
              { label: 'Solo signo', value: analytics.outcomeHits, color: '#9bd910' },
              { label: 'Fallidas', value: analytics.misses, color: '#ff5f78' },
            ]}
          />
          <p className="muted">
            Total evaluadas: <strong>{analytics.scoredPredictions}</strong>. Puntaje: {state.db.pointsConfig.exactScore} exacto /{' '}
            {state.db.pointsConfig.correctOutcome} signo.
          </p>
        </div>
      </div>

      <div className="panel stack-md">
        <div className="section-head"><h3>Total de goles por partido</h3><span>Histograma</span></div>
        <BarChart
          data={[
            { label: '0', value: analytics.goalsHistogram['0'], color: '#3850dd' },
            { label: '1', value: analytics.goalsHistogram['1'], color: '#4db8e8' },
            { label: '2', value: analytics.goalsHistogram['2'], color: '#59e3d7' },
            { label: '3', value: analytics.goalsHistogram['3'], color: '#f4be1f' },
            { label: '4', value: analytics.goalsHistogram['4'], color: '#f68b1f' },
            { label: '5', value: analytics.goalsHistogram['5'], color: '#ef6b22' },
            { label: '6', value: analytics.goalsHistogram['6'], color: '#ef4d22' },
            { label: '7', value: analytics.goalsHistogram['7'], color: '#ef3100' },
            { label: '8', value: analytics.goalsHistogram['8'], color: '#b51f08' },
          ]}
          height={240}
        />
      </div>

      <HistoricalProdeTable state={state} />

      <OfficialMatchStatsPanel state={state} />
    </section>
  );
}

function UserStatsDashboard({ state, user }: { state: StateResponse; user: User }) {
  const analytics = getStatsAnalytics(state);
  const matchById = new Map(state.db.matches.map((m) => [m.id, m] as const));
  const userRow = state.leaderboard.find((r) => r.userId === user.id);
  const leader = state.leaderboard[0] ?? null;
  const rank = userRow ? state.leaderboard.findIndex((r) => r.userId === user.id) + 1 : null;
  const diffToLeader = userRow && leader ? Math.max(0, leader.totalPoints - userRow.totalPoints) : null;

  const userPredictions = state.db.predictions.filter((p) => p.userId === user.id);
  const scoredUserPredictions = userPredictions
    .map((p) => {
      const match = matchById.get(p.matchId);
      if (!match?.officialResult) return null;
      const score = calculatePredictionPoints(p, match.officialResult, state.db.pointsConfig);
      const predictedDiff = p.homeGoals - p.awayGoals;
      const officialDiff = match.officialResult.home - match.officialResult.away;
      return { p, match, score, diffHit: predictedDiff === officialDiff };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const exactCount = scoredUserPredictions.filter((x) => x.score.exactHit).length;
  const outcomeCount = scoredUserPredictions.filter((x) => x.score.outcomeHit || x.score.exactHit).length;
  const diffCount = scoredUserPredictions.filter((x) => x.diffHit).length;
  const totalScored = scoredUserPredictions.length;
  const exactPct = totalScored ? Math.round((exactCount / totalScored) * 100) : 0;
  const outcomePct = totalScored ? Math.round((outcomeCount / totalScored) * 100) : 0;
  const diffPct = totalScored ? Math.round((diffCount / totalScored) * 100) : 0;

  const exactsByUser = new Map<string, { exacts: number; evals: number }>();
  for (const r of state.leaderboard) exactsByUser.set(r.userId, { exacts: 0, evals: 0 });
  for (const p of state.db.predictions) {
    const match = matchById.get(p.matchId);
    if (!match?.officialResult) continue;
    const bucket = exactsByUser.get(p.userId);
    if (!bucket) continue;
    bucket.evals += 1;
    const result = calculatePredictionPoints(p, match.officialResult, state.db.pointsConfig);
    if (result.exactHit) bucket.exacts += 1;
  }

  const evolutionLabels = analytics.cumulativeLabels.length ? analytics.cumulativeLabels : ['Sin fechas'];
  const evolutionUsers = state.leaderboard.map((row) => ({
    userId: row.userId,
    label: `${row.firstName} ${row.lastName}`.trim() || row.userName,
    values: analytics.cumulativeByUser.get(row.userId) ?? [],
  }));
  const riskPct = getUniquePredictionRiskScore(user.id, state.db, analytics.predictionPatternFrequency);
  const positionDelta = getPositionDeltaFromLastDate(state, analytics, user.id);

  const badges: string[] = [];
  if (exactPct >= 25) badges.push('Nostradamus');
  if (riskPct >= 35) badges.push('Kamikaze');
  if (outcomePct >= 60) badges.push('Analista');
  if (userRow && rank && rank <= 3) badges.push('Podio');
  if (totalScored > 0 && exactPct < 5 && outcomePct < 30) badges.push('Pecho frío');

  return (
    <section className="stack-lg">
      <div className="panel stack-md">
        <h2>Estadísticas personales</h2>
        <p className="muted">
          Tu dashboard del PRODE: rendimiento, precisión, tendencia y comparación con el grupo.
        </p>
        <div className="detail-grid">
          <div className="detail-card">
            <span className="detail-label">Ranking general</span>
            <strong>{rank ? `#${rank}` : 'Sin ranking'}</strong>
            <span className="muted compact-text">{userRow ? `${userRow.totalPoints} puntos` : 'Aún no hay puntaje'}</span>
          </div>
          <div className="detail-card">
            <span className="detail-label">Diferencia con el líder</span>
            <strong>{diffToLeader ?? 0} pts</strong>
            <span className="muted compact-text">{leader ? `Líder: ${leader.firstName} ${leader.lastName}` : 'Sin líder aun'}</span>
          </div>
          <div className="detail-card">
            <span className="detail-label">Posiciones ganadas</span>
            <strong>
              {positionDelta == null ? '-' : positionDelta > 0 ? `+${positionDelta}` : String(positionDelta)}
            </strong>
            <span className="muted compact-text">Comparado con la última fecha evaluada.</span>
          </div>
        </div>
      </div>


      <div className="panel stack-md">
        <div className="section-head">
          <h3>Evolución del puntaje</h3>
          <span>Acumulado por partido con resultado oficial</span>
        </div>
        <UserEvolutionComparisonChart labels={evolutionLabels} users={evolutionUsers} currentUserId={user.id} />
      </div>

      <NextMatchPredictionsPanel state={state} analytics={analytics} />

      <div className="panel stack-md">
        <div className="section-head">
          <h3>Tu perfil de juego</h3>
          <span>Riesgo vs consistencia</span>
        </div>
        <div className="detail-grid">
          <div className="detail-card">
            <span className="detail-label">Riesgo (predicciones únicas)</span>
            <strong>{riskPct}%</strong>
            <span className="muted compact-text">Cuanto más alto, más diferente al resto.</span>
          </div>
          <div className="detail-card">
            <span className="detail-label">Resultados exactos</span>
            <strong>{exactCount}</strong>
            <span className="muted compact-text">Tu métrica de "adicto al detalle".</span>
          </div>
          <div className="detail-card">
            <span className="detail-label">Aciertos de signo</span>
            <strong>{userRow?.outcomeHits ?? 0}</strong>
            <span className="muted compact-text">Ganador o empate correcto sin marcador exacto.</span>
          </div>
          <div className="detail-card">
            <span className="detail-label">Aciertos de goles</span>
            <strong>{userRow?.sideGoalsHits ?? 0}</strong>
            <span className="muted compact-text">Goles acertados de local o visitante.</span>
          </div>
          <div className="detail-card">
            <span className="detail-label">Pronósticos incorrectos</span>
            <strong>{userRow?.incorrectPredictions ?? 0}</strong>
            <span className="muted compact-text">Predicciones evaluadas sin puntos.</span>
          </div>
          <div className="detail-card">
            <span className="detail-label">Efectividad de signo</span>
            <strong>{userRow?.accuracyRate ?? 0}%</strong>
            <span className="muted compact-text">Exactos + signos sobre partidos evaluados.</span>
          </div>
          <div className="detail-card">
            <span className="detail-label">Predicciones evaluadas</span>
            <strong>{totalScored}</strong>
            <span className="muted compact-text">Se actualiza cuando el admin carga resultados oficiales.</span>
          </div>
        </div>
      </div>

      <HistoricalProdeTable state={state} />

      <OfficialMatchStatsPanel state={state} />
    </section>
  );
}

export default async function StatsPage() {
  const { token } = await requireAuthenticatedUser();
  const state = await getState(token);
  const viewerUser = state.viewer.user;

  if (viewerUser?.role === 'admin') {
    return <AdminStatsDashboard state={state} />;
  }

  if (!viewerUser) return null;
  return <UserStatsDashboard state={state} user={viewerUser} />;
}




