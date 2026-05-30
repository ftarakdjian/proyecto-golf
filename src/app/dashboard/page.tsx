'use client';

import AppShell from '@/components/AppShell';
import { useEffect, useState, useMemo } from 'react';
import { getUserRoundData, UserRoundData } from '@/lib/storage';
import { useUser } from '@/lib/user-context';
import { Course, CourseHole } from '@/lib/types';
import { formatDate, resolveHoleNumber } from '@/lib/utils';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const { username } = useUser();
  const [data, setData] = useState<UserRoundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseFilter, setCourseFilter] = useState<string>('all');

  useEffect(() => {
    getUserRoundData(username)
      .then(setData)
      .catch(() => setError('Error al cargar estadísticas'))
      .finally(() => setLoading(false));
  }, [username]);

  const completedRounds = useMemo(
    () => (data?.rounds ?? []).filter(r => r.status === 'completed'),
    [data]
  );

  const filteredRounds = useMemo(() => {
    if (courseFilter === 'all') return completedRounds;
    return completedRounds.filter(r => r.courseId === courseFilter);
  }, [completedRounds, courseFilter]);

  const getCourse = (id: string): Course | undefined =>
    data?.courses.find(c => c.id === id);

  const getHoles = (courseId: string): CourseHole[] =>
    (data?.courseHoles ?? []).filter(h => h.courseId === courseId);

  // ─── Per-round stats ──────────────────────────────────────────
  const roundStats = useMemo(() => {
    return filteredRounds.map(round => {
      const scores = (data?.holeScores ?? []).filter(
        s => s.roundId === round.id && s.username === username
      );
      const stats = (data?.holeStats ?? []).filter(
        s => s.roundId === round.id && s.username === username
      );
      const holes = getHoles(round.courseId);
      const courseHoleCount = holes.length;

      const totalScore = scores.reduce((acc, s) => acc + s.strokes, 0);

      let parTotal = 0;
      for (let h = 1; h <= round.holesPlayed; h++) {
        if (!courseHoleCount) break;
        const ch = holes.find(x => x.holeNumber === resolveHoleNumber(h, courseHoleCount));
        if (ch) parTotal += ch.par;
      }

      const par45Holes = Array.from({ length: round.holesPlayed }, (_, i) => i + 1).filter(h => {
        if (!courseHoleCount) return false;
        const ch = holes.find(x => x.holeNumber === resolveHoleNumber(h, courseHoleCount));
        return ch && (ch.par === 4 || ch.par === 5);
      });

      const fairwaysHit = stats.filter(s => s.fairwayHit === true).length;
      const girCount = stats.filter(s => s.gir).length;
      const totalPutts = stats.reduce((acc, s) => acc + (s.putts || 0), 0);
      const penaltyCount = stats.filter(s => s.penalty).length;

      return {
        round,
        totalScore,
        parTotal,
        differential: parTotal > 0 ? totalScore - parTotal : null,
        fairwaysPct: par45Holes.length > 0 ? (fairwaysHit / par45Holes.length) * 100 : null,
        girPct: stats.length > 0 ? (girCount / stats.length) * 100 : null,
        avgPutts: stats.length > 0 ? totalPutts / stats.length : null,
        penalties: penaltyCount,
        hasStats: stats.length > 0,
      };
    });
  }, [filteredRounds, data, username]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Aggregate stats ─────────────────────────────────────────
  const aggStats = useMemo(() => {
    const withScore = roundStats.filter(r => r.totalScore > 0 && r.parTotal > 0);

    // Handicap: best 8 differentials of last 20
    const last20 = withScore.slice(0, 20);
    const diffs = last20
      .map(r => r.differential)
      .filter((d): d is number => d !== null)
      .sort((a, b) => a - b)
      .slice(0, 8);
    const handicap = diffs.length > 0
      ? Math.round((diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10) / 10
      : null;

    const withStats = roundStats.filter(r => r.hasStats);
    const fairways = withStats.filter(r => r.fairwaysPct !== null).map(r => r.fairwaysPct!);
    const girs = withStats.filter(r => r.girPct !== null).map(r => r.girPct!);
    const putts = withStats.filter(r => r.avgPutts !== null).map(r => r.avgPutts!);
    const penalties = withStats.map(r => r.penalties);

    const avg = (arr: number[]) =>
      arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

    return {
      handicap,
      fairwaysPct: avg(fairways),
      girPct: avg(girs),
      avgPutts: avg(putts),
      avgPenalties: avg(penalties),
      totalRounds: withScore.length,
    };
  }, [roundStats]);

  // ─── Chart data ───────────────────────────────────────────────
  const chartData = useMemo(() => {
    return [...roundStats]
      .filter(r => r.totalScore > 0 && r.parTotal > 0)
      .reverse()
      .slice(-15)
      .map(r => ({
        date: formatDate(r.round.date),
        score: r.totalScore,
        par: r.parTotal,
        diff: r.differential ?? 0,
      }));
  }, [roundStats]);

  const playedCourses = useMemo(() => {
    const ids = new Set(completedRounds.map(r => r.courseId));
    return (data?.courses ?? []).filter(c => ids.has(c.id));
  }, [completedRounds, data]);

  const inProgressRounds = (data?.rounds ?? []).filter(r => r.status === 'in_progress');

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display text-golf-gold">Dashboard</h1>
          <p className="text-golf-muted mt-1 text-sm">Bienvenido, {username}</p>
        </div>
        {/* Course filter */}
        {playedCourses.length > 1 && (
          <select
            value={courseFilter}
            onChange={e => setCourseFilter(e.target.value)}
            className="px-4 py-2 rounded-lg text-golf-text focus:outline-none text-sm"
            style={{ background: '#1a2e20', border: '1px solid #2a4530', fontSize: '15px' }}
          >
            <option value="all">Todas las canchas</option>
            {playedCourses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" message="Cargando..." /></div>
      ) : error ? (
        <div className="rounded-xl p-6 text-center" style={{ background: '#2a1a1a', border: '1px solid #5a2020' }}>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : (
        <>
          {/* Rondas en progreso */}
          {inProgressRounds.length > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-display text-golf-gold mb-3">En Progreso</h2>
              <div className="space-y-2">
                {inProgressRounds.map(r => (
                  <Link
                    key={r.id}
                    href={`/rounds/${r.id}`}
                    className="flex items-center justify-between rounded-xl px-5 py-4"
                    style={{ background: '#223829', border: '1px solid #2a4530' }}
                  >
                    <div>
                      <p className="text-golf-text font-medium">{getCourse(r.courseId)?.name || '—'}</p>
                      <p className="text-golf-muted text-xs">{formatDate(r.date)} · {r.holesPlayed} hoyos</p>
                    </div>
                    <span className="text-golf-gold text-sm">Continuar →</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
            <StatCard label="Rondas jugadas" value={String(aggStats.totalRounds)} icon="🏌️" />
            <StatCard
              label="Hándicap aprox."
              value={aggStats.handicap !== null ? (aggStats.handicap > 0 ? `+${aggStats.handicap}` : String(aggStats.handicap)) : '—'}
              icon="🎯"
              hint="Promedio 8 mejores diferencias (últimas 20)"
            />
            <StatCard
              label="Fairways Hit"
              value={aggStats.fairwaysPct !== null ? `${aggStats.fairwaysPct}%` : '—'}
              icon="🌿"
            />
            <StatCard
              label="GIR"
              value={aggStats.girPct !== null ? `${aggStats.girPct}%` : '—'}
              icon="🏳️"
            />
            <StatCard
              label="Putts / hoyo"
              value={aggStats.avgPutts !== null ? String(aggStats.avgPutts) : '—'}
              icon="⛳"
            />
            <StatCard
              label="Penalidades / ronda"
              value={aggStats.avgPenalties !== null ? String(aggStats.avgPenalties) : '—'}
              icon="⚠️"
            />
          </div>

          {/* Score chart */}
          {chartData.length >= 2 && (
            <div className="rounded-xl p-5 mb-8" style={{ background: '#1a2e20', border: '1px solid #2a4530' }}>
              <h2 className="text-base font-display text-golf-text mb-4">Evolución de Score</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a4530" />
                  <XAxis dataKey="date" tick={{ fill: '#8aad8f', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#8aad8f', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1a2e20', border: '1px solid #2a4530', borderRadius: '8px', color: '#e8f0e9' }}
                    formatter={(value, name) => [
                      name === 'score' ? `${value} golpes` : `Par ${value}`,
                      name === 'score' ? 'Score' : 'Par',
                    ]}
                  />
                  <Line type="monotone" dataKey="par" stroke="#2a4530" strokeDasharray="4 2" dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="score" stroke="#c9a84c" dot={{ r: 3, fill: '#c9a84c' }} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent rounds table */}
          {roundStats.length > 0 ? (
            <div>
              <h2 className="text-base font-display text-golf-text mb-3">Últimas Rondas</h2>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a4530', overflowX: 'auto' }}>
                <table className="w-full text-sm" style={{ minWidth: '360px' }}>
                  <thead>
                    <tr style={{ background: '#223829' }}>
                      <th className="text-left px-4 py-3 text-golf-muted font-medium">Fecha</th>
                      <th className="text-left px-4 py-3 text-golf-muted font-medium">Cancha</th>
                      <th className="text-right px-4 py-3 text-golf-muted font-medium">Score</th>
                      <th className="text-right px-4 py-3 text-golf-muted font-medium">vs Par</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roundStats.slice(0, 10).map(({ round, totalScore, differential }, idx) => (
                      <tr
                        key={round.id}
                        style={{ background: idx % 2 === 0 ? '#1a2e20' : '#1e3424', borderTop: '1px solid #2a4530' }}
                      >
                        <td className="px-4 py-3 text-golf-text">{formatDate(round.date)}</td>
                        <td className="px-4 py-3 text-golf-muted">{getCourse(round.courseId)?.name || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold text-golf-text">{totalScore || '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {differential !== null ? (
                            <span style={{ color: differential < 0 ? '#93c5fd' : differential === 0 ? '#8aad8f' : '#fca5a5' }}>
                              {differential > 0 ? `+${differential}` : differential}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-golf-muted">
              <p className="text-5xl mb-4">⛳</p>
              <p className="text-lg font-display text-golf-text">Sin rondas registradas</p>
              <p className="text-sm mt-2">Comenzá creando una nueva ronda</p>
              <Link href="/rounds/new" className="inline-block mt-4 px-6 py-2 rounded-lg text-white font-medium" style={{ background: '#1a6b3c' }}>
                Nueva Ronda
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, hint }: { label: string; value: string; icon: string; hint?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#1a2e20', border: '1px solid #2a4530' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-2xl font-display text-golf-gold">{value}</span>
      </div>
      <p className="text-golf-muted text-xs">{label}</p>
      {hint && <p className="text-golf-muted text-xs mt-0.5 opacity-60">{hint}</p>}
    </div>
  );
}
