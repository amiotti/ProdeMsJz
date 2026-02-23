import type { LeaderboardRow } from '@/lib/types';

function initials(row: LeaderboardRow) {
  const a = row.firstName?.trim()?.[0] ?? '';
  const b = row.lastName?.trim()?.[0] ?? '';
  return `${a}${b}`.toUpperCase() || (row.userName.trim()[0] ?? 'U').toUpperCase();
}

export function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  if (!rows.length) {
    return <div className="panel">Todavia no hay participantes (el administrador no se muestra en la tabla).</div>;
  }

  return (
    <div className="panel table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Participante</th>
            <th>Puntos</th>
            <th>Exactos</th>
            <th>Ganador/Empate</th>
            <th>Pronosticos puntuados</th>
            <th>Total cargados</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.userId}>
              <td>{index + 1}</td>
              <td>
                <div className="leader-user-cell">
                  {row.photoDataUrl ? (
                    <img className="avatar-preview avatar-preview-xs" src={row.photoDataUrl} alt={`Foto de ${row.userName}`} />
                  ) : (
                    <span className="session-avatar session-avatar-fallback avatar-preview-xs" aria-hidden="true">
                      {initials(row)}
                    </span>
                  )}
                  <div>
                    <strong>{`${row.firstName} ${row.lastName}`.trim() || row.userName}</strong>
                  </div>
                </div>
              </td>
              <td>{row.totalPoints}</td>
              <td>{row.exactHits}</td>
              <td>{row.outcomeHits}</td>
              <td>{row.scoredPredictions}</td>
              <td>{row.totalPredictions}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
