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
  const max = Math.max(1, ...series.flatMap((s) => (s.values.length ? s.values : [0])));
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

export function UserEvolutionComparisonChart({
  labels,
  users,
  currentUserId,
}: {
  labels: string[];
  users: EvolutionSeries[];
  currentUserId: string;
}) {
  const [compareUserIds, setCompareUserIds] = useState<string[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const currentUser = users.find((u) => u.userId === currentUserId) ?? null;

  const compareOptions = useMemo(() => users.filter((u) => u.userId !== currentUserId), [users, currentUserId]);

  const filteredOptions = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return compareOptions;
    return compareOptions.filter((user) => user.label.toLowerCase().includes(search));
  }, [compareOptions, searchTerm]);

  const series = useMemo(() => {
    if (!currentUser) return [] as Array<{ label: string; values: number[]; color: string; emphasized?: boolean }>;

    const palette = ['#3850dd', '#59e3d7', '#f4be1f', '#9bd910', '#7b68ee', '#ff5f78', '#00a6a6'];
    const compareUsers = compareUserIds
      .map((id) => users.find((u) => u.userId === id))
      .filter((u): u is EvolutionSeries => Boolean(u));

    const result: Array<{ label: string; values: number[]; color: string; emphasized?: boolean }> = [
      { label: currentUser.label, values: currentUser.values, color: '#ef3100', emphasized: true },
    ];

    compareUsers.forEach((user, index) => {
      result.push({
        label: user.label,
        values: user.values,
        color: palette[index % palette.length] ?? '#3850dd',
      });
    });

    return result;
  }, [users, currentUser, compareUserIds]);

  function toggleUser(userId: string) {
    setCompareUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  }

  if (!currentUser || labels.length === 0) {
    return <p className="muted">Todavia no hay partidos con resultado oficial para graficar evolucion.</p>;
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
          <button type="button" className="btn" onClick={() => setIsPickerOpen(true)}>
            {compareUserIds.length > 0 ? `${compareUserIds.length} seleccionados` : 'Seleccionar usuarios'}
          </button>
        </label>

      </div>

      {isPickerOpen ? (
        <div className="compare-picker-backdrop" role="dialog" aria-modal="true" aria-label="Seleccionar usuarios para comparar">
          <div className="compare-picker-modal panel stack-md">
            <div className="section-head">
              <h3>Comparar usuarios</h3>
              <button type="button" className="btn btn-small" onClick={() => setIsPickerOpen(false)}>
                Cerrar
              </button>
            </div>

            <label>
              Buscar usuario
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Nombre o apellido"
              />
            </label>

            <div className="compare-picker-list">
              {filteredOptions.map((user) => (
                <label key={user.userId} className="compare-picker-item">
                  <input
                    type="checkbox"
                    checked={compareUserIds.includes(user.userId)}
                    onChange={() => toggleUser(user.userId)}
                  />
                  <span>{user.label}</span>
                </label>
              ))}
              {filteredOptions.length === 0 ? <p className="muted">No hay usuarios que coincidan con la busqueda.</p> : null}
            </div>

            <div className="compare-picker-actions">
              <button type="button" className="btn btn-small" onClick={() => setCompareUserIds([])}>
                Limpiar seleccion
              </button>
              <button type="button" className="btn btn-primary btn-small" onClick={() => setIsPickerOpen(false)}>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <LineChart labels={labels} series={series} />
    </div>
  );
}


