'use client';

import AppShell from '@/components/AppShell';
import { useEffect, useState } from 'react';
import { Round, Player, Course, RoundPlayer } from '@/lib/types';
import { getRounds, getPlayers, getCourses, getAllRoundPlayers } from '@/lib/storage';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function RoundsPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allRoundPlayers, setAllRoundPlayers] = useState<RoundPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [r, p, c, rps] = await Promise.all([
        getRounds(), getPlayers(), getCourses(), getAllRoundPlayers(),
      ]);
      setRounds(r.sort((a, b) => b.date.localeCompare(a.date)));
      setPlayers(p);
      setCourses(c);
      setAllRoundPlayers(rps);
    } catch {
      setError('Error al cargar rondas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getCourse = (id: string) => courses.find(c => c.id === id);
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || '?';

  const getRoundPlayerNames = (roundId: string) => {
    const rps = allRoundPlayers.filter(rp => rp.roundId === roundId);
    return rps.map(rp => getPlayerName(rp.playerId)).join(', ');
  };

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display text-golf-gold">Rondas</h1>
            <p className="text-golf-muted mt-1">Historial de partidas</p>
          </div>
          <Link
            href="/rounds/new"
            className="px-5 py-2 rounded-lg text-white font-medium transition-colors"
            style={{ background: '#1a6b3c' }}
          >
            + Nueva Ronda
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" message="Cargando rondas..." />
          </div>
        ) : error ? (
          <div className="rounded-xl p-6 text-center" style={{ background: '#2a1a1a', border: '1px solid #5a2020' }}>
            <p className="text-red-400 text-sm mb-3">{error}</p>
            <button onClick={loadData} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#1a6b3c' }}>
              Reintentar
            </button>
          </div>
        ) : rounds.length === 0 ? (
          <div className="text-center py-20 text-golf-muted">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-lg font-display text-golf-text">Sin rondas registradas</p>
            <p className="text-sm mt-2">Comenzá creando tu primera ronda</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a4530' }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: '#223829' }}>
                  <th className="text-left px-5 py-3 text-golf-muted text-sm font-medium">Fecha</th>
                  <th className="text-left px-5 py-3 text-golf-muted text-sm font-medium">Cancha</th>
                  <th className="text-left px-5 py-3 text-golf-muted text-sm font-medium">Jugadores</th>
                  <th className="text-left px-5 py-3 text-golf-muted text-sm font-medium">Hoyos</th>
                  <th className="text-left px-5 py-3 text-golf-muted text-sm font-medium">Estado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rounds.map((round, idx) => (
                  <tr
                    key={round.id}
                    style={{
                      background: idx % 2 === 0 ? '#1a2e20' : '#1e3424',
                      borderTop: '1px solid #2a4530',
                    }}
                  >
                    <td className="px-5 py-4 text-golf-text text-sm">{formatDate(round.date)}</td>
                    <td className="px-5 py-4 text-golf-text text-sm">{getCourse(round.courseId)?.name || '-'}</td>
                    <td className="px-5 py-4 text-golf-muted text-sm max-w-48 truncate">{getRoundPlayerNames(round.id) || '-'}</td>
                    <td className="px-5 py-4 text-golf-muted text-sm">{round.holesPlayed}</td>
                    <td className="px-5 py-4">
                      <span
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={
                          round.status === 'completed'
                            ? { background: '#0f4a28', color: '#2d9e5f' }
                            : { background: '#4a3a0f', color: '#c9a84c' }
                        }
                      >
                        {round.status === 'completed' ? 'Completada' : 'En progreso'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/rounds/${round.id}`}
                        className="text-golf-gold text-sm hover:underline"
                      >
                        {round.status === 'in_progress' ? 'Continuar →' : 'Ver →'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
