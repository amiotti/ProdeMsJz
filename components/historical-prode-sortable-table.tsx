'use client';

import { useMemo, useState } from 'react';

export type HistoricalProdeSortableRow = {
  name: string;
  values: Array<number | 'X'>;
  currentValue: number | 'X';
  totalHits: number;
  hitPct: number;
  played: number;
  playedPct: number;
};

type SortKey = 'name' | `history-${number}` | 'current' | 'totalHits' | 'hitPct' | 'played' | 'playedPct';
type SortDirection = 'asc' | 'desc';

type Props = {
  columns: readonly string[];
  rows: HistoricalProdeSortableRow[];
  matchCounts: readonly number[];
  currentOfficialMatches: number;
  totalMatches: number;
};

function sortableValue(row: HistoricalProdeSortableRow, key: SortKey): string | number | null {
  if (key === 'name') return row.name;
  if (key === 'current') return row.currentValue === 'X' ? null : row.currentValue;
  if (key === 'totalHits') return row.totalHits;
  if (key === 'hitPct') return row.hitPct;
  if (key === 'played') return row.played;
  if (key === 'playedPct') return row.playedPct;
  const index = Number(key.replace('history-', ''));
  const value = row.values[index];
  return value === 'X' || value === undefined ? null : value;
}

export function HistoricalProdeSortableTable({
  columns,
  rows,
  matchCounts,
  currentOfficialMatches,
  totalMatches,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('hitPct');
  const [direction, setDirection] = useState<SortDirection>('desc');

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const aValue = sortableValue(a, sortKey);
        const bValue = sortableValue(b, sortKey);
        if (aValue === null && bValue === null) return a.name.localeCompare(b.name, 'es');
        if (aValue === null) return 1;
        if (bValue === null) return -1;

        const comparison =
          typeof aValue === 'string' && typeof bValue === 'string'
            ? aValue.localeCompare(bValue, 'es')
            : Number(aValue) - Number(bValue);
        if (comparison !== 0) return direction === 'asc' ? comparison : -comparison;
        return a.name.localeCompare(b.name, 'es');
      }),
    [direction, rows, sortKey],
  );

  function changeSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(nextKey);
    setDirection(nextKey === 'name' ? 'asc' : 'desc');
  }

  function heading(label: string, key: SortKey) {
    const active = sortKey === key;
    return (
      <th aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button className="historical-sort-button" type="button" onClick={() => changeSort(key)}>
          <span>{label}</span>
          <span className="historical-sort-indicator" aria-hidden="true">
            {active ? (direction === 'asc' ? '▲' : '▼') : '↕'}
          </span>
        </button>
      </th>
    );
  }

  return (
    <div className="table-wrap">
      <table className="table historical-prode-table">
        <thead>
          <tr>
            {heading('Nombre', 'name')}
            {columns.map((column, index) => (
              <th key={column} aria-sort={sortKey === `history-${index}` ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button className="historical-sort-button" type="button" onClick={() => changeSort(`history-${index}`)}>
                  <span>{column}</span>
                  <span className="historical-sort-indicator" aria-hidden="true">
                    {sortKey === `history-${index}` ? (direction === 'asc' ? '▲' : '▼') : '↕'}
                  </span>
                </button>
              </th>
            ))}
            {heading('USA MEX CAN 2026', 'current')}
            {heading('Total aciertos', 'totalHits')}
            {heading('% acierto', 'hitPct')}
            {heading('Jugados', 'played')}
            {heading('% jugados', 'playedPct')}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={row.name}>
              <th scope="row">{row.name}</th>
              {row.values.map((value, index) => (
                <td key={`${row.name}-${columns[index]}`}>{value}</td>
              ))}
              <td>{row.currentValue}</td>
              <td>{row.totalHits}</td>
              <td>{row.hitPct.toFixed(1)}%</td>
              <td>{row.played}</td>
              <td>{row.playedPct}%</td>
            </tr>
          ))}
          <tr className="historical-prode-total-row">
            <th scope="row">PARTIDOS</th>
            {matchCounts.map((value, index) => (
              <td key={`matches-${columns[index]}`}>{value}</td>
            ))}
            <td>{currentOfficialMatches}</td>
            <td>{totalMatches}</td>
            <td>-</td>
            <td>{totalMatches}</td>
            <td>100%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
