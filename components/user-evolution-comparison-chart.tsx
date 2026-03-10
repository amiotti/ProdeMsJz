'use client';

import { useMemo, useState } from 'react';

type EvolutionSeries = {
  userId: string;
  label: string;
  values: number[];
};

function LineChart({
  labels,
  series,
  height = 280,
}: {
  labels: string[];
  series: Array<{ label: string; values: number[]; color: string; emphasized?: boolean }>;
  height?: number;
}) {
  const width = 760;
  const padding = { top: 18, right: 16, bottom: 54, left: 28 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(1, ...series.flatMap((s) => s.values.length ? s.values : [0]));
  const xStep = labels.length > 1 ? innerW / (labels.length - 1) : innerW;

  function pointY(v: number) {
    return innerH - (v / max) * innerH;
  }

  function path(values: number[]) {
    const safeValues = values.length ? values : [0];
    return safeValues.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * xStep} ${pointY(v)}`).join(' ');
  }

  return (
    <div className="line-chart-wrap">
      <svg className="chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de evolucion">
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

export function UserEvolutionComparisonChart({
  labels,
  users,
  currentUserId,
}: {
  labels: string[];
  users: EvolutionSeries[];
  currentUserId: string;
}) {
  const [compareUserId, setCompareUserId] = useState('');
  const currentUser = users.find((u) => u.userId === currentUserId) ?? null;

  const series = useMemo(() => {
    if (!currentUser) return [] as Array<{ label: string; values: number[]; color: string; emphasized?: boolean }>;
    const compareUser = users.find((u) => u.userId === compareUserId) ?? null;
    const result: Array<{ label: string; values: number[]; color: string; emphasized?: boolean }> = [
      { label: currentUser.label, values: currentUser.values, color: '#ef3100', emphasized: true },
    ];
    if (compareUser) {
      result.push({ label: compareUser.label, values: compareUser.values, color: '#3850dd' });
    }
    return result;
  }, [users, currentUser, compareUserId]);

  const compareOptions = users.filter((u) => u.userId !== currentUserId);

  if (!currentUser || labels.length === 0) {
    return <p className="muted">Todavía no hay partidos con resultado oficial para graficar evolución.</p>;
  }

  return (
    <div className="stack-md">
      <div className="toolbar-grid">
        <label>
          Tu curva
          <input value={currentUser.label} disabled />
        </label>
        <label>
          Comparar con
          <select value={compareUserId} onChange={(e) => setCompareUserId(e.target.value)}>
            <option value="">Sin comparativa</option>
            {compareOptions.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
        <div className="readonly-note" aria-hidden="true" />
      </div>
      <LineChart labels={labels} series={series} />
    </div>
  );
}
