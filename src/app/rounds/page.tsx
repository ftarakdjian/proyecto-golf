'use client';

import AppShell from '@/components/AppShell';
import { useEffect, useState, useCallback } from 'react';
import { Round, Course, RoundPlayer } from '@/lib/types';
import { getRoundsForUser, getCourses, leaveRound } from '@/lib/storage';
import { useUser } from '@/lib/user-context';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function RoundsPage() {
  return (
    <AppShell>
      <RoundsContent />
    </AppShell>
  );
}

function RoundsContent() {
  const { username } = useUser();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [roundPlayers, setRoundPlayers] = useState<RoundPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [{ rounds: r, roundPlayers: rps }, c] = await Promise.all([
        getRoundsForUser(username),
        getCourses(),
      ]);
      setRounds(r);
      setRoundPlayers(rps);
      setCourses(c);
    } catch {
      setError('Error al cargar rondas');
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => { loadData(); }, [loadData]);

  const getCourse = (id: string) => courses.find(c => c.id === id);

  const getParticipants = (roundId: string) =>
    roundPlayers.filter(rp => rp.roundId === roundId).map(rp => rp.username).join(', ');

  const handleDelete = async (round: Round) => {
    const confirmed = window.confirm(
      `¿Eliminar tu participación en la ronda del ${formatDate(round.date)}?\n\n` +
      `Se borrarán tus scores, stats y tiros de esta ronda. ` +
      `Si sos el único jugador, la ronda completa será eliminada.`
    );
    if (!confirmed) return;

    setDeleting(round.id);
    try {
      await leaveRound(round.id, username);
      setRounds(prev => prev.filter(r => r.id !== round.id));
      toast.success('Ronda eliminada');
    } catch {
      // toast already shown by dbError in storage.ts
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display text-golf-gold">Rondas</h1>
            <p className="text-golf-muted mt-1">Tus partidas</p>
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
            <button
              onClick={loadData}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: '#1a6b3c' }}
            >
              Reintentar
            </button>
          </div>
        ) : rounds.length === 0 ? (
          <div className="text-center py-20 text-golf-muted">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-lg font-display text-golf-text">Sin rondas registradas</p>
            <p className="text-sm mt-2">Comenzá creando una nueva ronda</p>
            <Link
              href="/rounds/new"
              className="inline-block mt-4 px-6 py-2 rounded-lg text-white font-medium"
              style={{ background: '#1a6b3c' }}
            >
              Nueva Ronda
            </Link>
          </div>
        ) : (
          <>
            {/* ── Mobile: cards ── */}
            <div className="flex flex-col gap-3 md:hidden">
              {rounds.map(round => (
                <div
                  key={round.id}
                  className="rounded-xl px-4 pt-4 pb-3"
                  style={{ background: '#1a2e20', border: '1px solid #2a4530' }}
                >
                  {/* Top: fecha + badge */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-golf-gold font-display text-lg leading-tight">
                      {formatDate(round.date)}
                    </p>
                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium shrink-0"
                      style={
                        round.status === 'completed'
                          ? { background: '#0f4a28', color: '#2d9e5f' }
                          : { background: '#4a3a0f', color: '#c9a84c' }
                      }
                    >
                      {round.status === 'completed' ? 'Completada' : 'En progreso'}
                    </span>
                  </div>

                  {/* Cancha + jugadores */}
                  <p className="text-golf-text text-sm font-medium">
                    {getCourse(round.courseId)?.name || '—'}
                  </p>
                  <p className="text-golf-muted text-xs mt-0.5">
                    {getParticipants(round.id) || '—'} · {round.holesPlayed} hoyos
                  </p>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-2 mt-3 pt-3"
                    style={{ borderTop: '1px solid #2a4530' }}
                  >
                    <Link
                      href={`/rounds/${round.id}`}
                      className="flex-1 flex items-center justify-center rounded-lg text-sm font-medium text-golf-gold"
                      style={{ background: '#223829', border: '1px solid #2a4530', minHeight: '44px' }}
                    >
                      {round.status === 'in_progress' ? 'Continuar →' : 'Ver →'}
                    </Link>
                    <button
                      onClick={() => handleDelete(round)}
                      disabled={deleting === round.id}
                      title="Eliminar mi participación en esta ronda"
                      className="flex items-center justify-center rounded-lg text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                      style={{ background: '#2a1a1a', border: '1px solid #5a2020', minHeight: '44px', minWidth: '44px', fontSize: '18px' }}
                    >
                      {deleting === round.id ? '…' : '🗑'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Desktop: tabla ── */}
            <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: '1px solid #2a4530' }}>
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
                      <td className="px-5 py-4 text-golf-muted text-sm max-w-48 truncate">
                        {getParticipants(round.id) || '-'}
                      </td>
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
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/rounds/${round.id}`}
                            className="text-golf-gold text-sm hover:underline"
                          >
                            {round.status === 'in_progress' ? 'Continuar →' : 'Ver →'}
                          </Link>
                          <button
                            onClick={() => handleDelete(round)}
                            disabled={deleting === round.id}
                            title="Eliminar mi participación en esta ronda"
                            className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
                            style={{ fontSize: '18px', minHeight: '44px', minWidth: '44px' }}
                          >
                            {deleting === round.id ? '…' : '🗑'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
  );
}
