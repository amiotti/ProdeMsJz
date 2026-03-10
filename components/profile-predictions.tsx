'use client';

import { useEffect, useMemo, useState } from 'react';

import { TeamName } from '@/components/team-name';
import { formatKickoffArgentina } from '@/lib/datetime';
import type { StateResponse } from '@/lib/types';

export function ProfilePredictions({
  initialState,
  userId,
}: {
  initialState: StateResponse;
  userId: string;
}) {
  const [state, setState] = useState<StateResponse>(initialState);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/predictions/state', { cache: 'no-store' });
        const data = (await response.json()) as StateResponse;
        if (!response.ok) throw new Error('No se pudo actualizar el estado.');
        if (active) {
          setState(data);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    refresh();

    const onPredictionsChanged = () => {
      void refresh();
    };
    window.addEventListener('prode-predictions-changed', onPredictionsChanged);

    return () => {
      active = false;
      window.removeEventListener('prode-predictions-changed', onPredictionsChanged);
    };
  }, []);

  const predictionRows = useMemo(() => {
    return state.db.predictions
      .filter((p) => p.userId === userId)
      .map((p) => {
        const match = state.db.matches.find((m) => m.id === p.matchId);
        return { prediction: p, match };
      })
      .sort((a, b) => {
        const aTime = a.match ? new Date(a.match.kickoffAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.match ? new Date(b.match.kickoffAt).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
  }, [state, userId]);

  async function downloadPdf() {
    setDownloading(true);
    setError(null);
    try {
      const response = await fetch('/api/profile/predictions-pdf', { method: 'GET' });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || 'No se pudo generar el PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'predicciones-prode.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo descargar el PDF');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="panel stack-md">
      <div className="section-head">
        <h3>Mis predicciones guardadas</h3>
        <div className="cta-row">
          <span>{predictionRows.length} registradas</span>
          <button className="btn btn-small" type="button" onClick={downloadPdf} disabled={downloading || predictionRows.length === 0}>
            {downloading ? 'Generando PDF...' : 'Descargar PDF'}
          </button>
        </div>
      </div>
      {loading ? <p className="muted">Actualizando predicciones...</p> : null}
      {error ? <p className="status">{error}</p> : null}
      {predictionRows.length === 0 ? (
        <p className="muted">Todavía no tienes predicciones guardadas.</p>
      ) : (
        <div className="match-list">
          {predictionRows.map(({ prediction, match }) => (
            <div key={prediction.id} className="match-card">
              <div>
                <p className="match-meta">{match ? `${match.id} - ${formatKickoffArgentina(match.kickoffAt)}` : prediction.matchId}</p>
                <p className="match-meta">Sede: {match?.venue ?? 'Pendiente de confirmar'}</p>
                {match ? (
                  <div className="fixture-row">
                    <TeamName teamName={match.homeTeam} linkToTeam />
                    <span className="vs">vs</span>
                    <TeamName teamName={match.awayTeam} linkToTeam />
                  </div>
                ) : (
                  <p className="muted">No se encontró el fixture actual de esta predicción, pero el registro guardado sigue disponible.</p>
                )}
                {match?.officialResult ? (
                  <p className="official-result">Resultado oficial: {match.officialResult.home} - {match.officialResult.away}</p>
                ) : null}
              </div>
              <div className="score-inputs is-locked">
                <input value={String(prediction.homeGoals)} disabled aria-label={`Goles pronosticados local`} />
                <span className="score-divider">-</span>
                <input value={String(prediction.awayGoals)} disabled aria-label={`Goles pronosticados visitante`} />
                <span className="chip">Guardada</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

