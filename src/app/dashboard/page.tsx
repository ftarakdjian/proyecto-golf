'use client';

import AppShell from '@/components/AppShell';
import { useEffect, useState, useMemo } from 'react';
import { getUserRoundData, UserRoundData } from '@/lib/storage';
import { useUser } from '@/lib/user-context';
import { Club, Course, CourseHole, Shot } from '@/lib/types';
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

// ─── Derive per-hole stats from shots when hole_stats is absent ───────────────
function deriveStatsFromShots(
  shotsForRound: Shot[],
  holes: CourseHole[],
  holesPlayed: number,
  courseHoleCount: number,
  clubs: Club[],
) {
  const putterId = clubs.find(c => c.name === 'Putter')?.id ?? null;

  // Exclude penalty shots (same as round detail: filter !isPenalty for fairway/GIR/drive)
  const nonPenaltyByHole = new Map<number, Shot[]>();
  shotsForRound.filter(s => !s.isPenalty).forEach(s => {
    const arr = nonPenaltyByHole.get(s.holeNumber) ?? [];
    arr.push(s);
    nonPenaltyByHole.set(s.holeNumber, arr);
  });

  let fairwaysHit = 0;
  let fairwayOpportunities = 0;
  let girCount = 0;
  const totalHoles = holesPlayed;

  // Putts: shots with Putter club, excluding penalty shots (same as PlayerShotsStats)
  const puttShots = shotsForRound.filter(s =>
    !s.isPenalty && putterId !== null && s.clubId === putterId
  );
  const totalPutts = puttShots.length;

  // Penalties: shots where result is Agua or Fuera de límites (no isPenalty flag — avoids double count)
  const penalties = shotsForRound.filter(s =>
    s.result === 'Agua' || s.result === 'Fuera de límites'
  ).length;

  for (let h = 1; h <= totalHoles; h++) {
    const holeNum = resolveHoleNumber(h, courseHoleCount);
    const ch = holes.find(x => x.holeNumber === holeNum);
    const hShots = (nonPenaltyByHole.get(h) ?? []).sort((a, b) => a.shotNumber - b.shotNumber);

    if (!ch) continue;

    // Fairways: first non-penalty shot on par 4/5 with result Fairway
    if (ch.par === 4 || ch.par === 5) {
      fairwayOpportunities++;
      if (hShots[0]?.result === 'Fairway') fairwaysHit++;
    }

    // GIR: reached green within (par - 2) non-penalty shots
    girCount++;  // will subtract if not GIR
    const regulation = ch.par - 2;
    let gir = false;
    for (let i = 1; i <= regulation; i++) {
      const shot = hShots.find(s => s.shotNumber === i);
      if (shot && (shot.result === 'Green' || shot.result === 'Hoyo')) { gir = true; break; }
    }
    if (!gir) girCount--;
  }

  return {
    fairwaysPct: fairwayOpportunities > 0 ? (fairwaysHit / fairwayOpportunities) * 100 : null,
    girPct: totalHoles > 0 ? (girCount / totalHoles) * 100 : null,
    avgPutts: totalHoles > 0 ? totalPutts / totalHoles : null,
    penalties,
    hasStats: shotsForRound.length > 0,
  };
}

function DashboardContent() {
  const { username } = useUser();
  const [data, setData] = useState<UserRoundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    getUserRoundData(username)
      .then(setData)
      .catch(err => {
        console.error('[Dashboard] Error loading data:', err);
        setError('Error al cargar estadísticas');
      })
      .finally(() => setLoading(false));
  }, [username]);

  const completedRounds = useMemo(
    () => (data?.rounds ?? []).filter(r => r.status === 'completed'),
    [data]
  );

  const filteredRounds = useMemo(() => {
    return completedRounds.filter(r => {
      if (courseFilter !== 'all' && r.courseId !== courseFilter) return false;
      const roundDate = new Date(r.date).toLocaleDateString('en-CA'); // YYYY-MM-DD en timezone local
      if (dateFrom && roundDate < dateFrom) return false;
      if (dateTo && roundDate > dateTo) return false;
      return true;
    });
  }, [completedRounds, courseFilter, dateFrom, dateTo]);

  const getCourse = (id: string): Course | undefined =>
    data?.courses.find(c => c.id === id);

  const getHoles = (courseId: string): CourseHole[] =>
    (data?.courseHoles ?? []).filter(h => h.courseId === courseId);

  // ─── Per-round stats ─────────────────────────────────────────
  const roundStats = useMemo(() => {
    return filteredRounds.map(round => {
      const scores = (data?.holeScores ?? []).filter(
        s => s.roundId === round.id && s.username === username
      );
      const stats = (data?.holeStats ?? []).filter(
        s => s.roundId === round.id && s.username === username
      );
      const shotsForRound = (data?.shots ?? []).filter(
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

      // ── Stats: prefer hole_stats, fall back to deriving from shots ──
      if (stats.length > 0) {
        // Stats-level tracking: use hole_stats
        // Penalties: count holes with penalty = true (one per penalized hole)
        // but also count from shots if available (more accurate)
        const penaltyFromShots = shotsForRound.filter(
          s => s.result === 'Agua' || s.result === 'Fuera de límites'
        ).length;
        const penaltyCount = shotsForRound.length > 0
          ? penaltyFromShots
          : stats.filter(s => s.penalty).length;

        const fairwaysHit = stats.filter(s => s.fairwayHit === true).length;
        const girCount = stats.filter(s => s.gir).length;
        const totalPutts = stats.reduce((acc, s) => acc + (s.putts || 0), 0);

        return {
          round,
          totalScore,
          parTotal,
          differential: parTotal > 0 ? totalScore - parTotal : null,
          fairwaysPct: par45Holes.length > 0 ? (fairwaysHit / par45Holes.length) * 100 : null,
          girPct: stats.length > 0 ? (girCount / stats.length) * 100 : null,
          avgPutts: stats.length > 0 ? totalPutts / stats.length : null,
          penalties: penaltyCount,
          hasStats: true,
        };
      }

      if (shotsForRound.length > 0) {
        // Shots-level tracking: derive stats from shots table
        const derived = deriveStatsFromShots(
          shotsForRound, holes, round.holesPlayed, courseHoleCount, data?.clubs ?? []
        );
        return {
          round,
          totalScore,
          parTotal,
          differential: parTotal > 0 ? totalScore - parTotal : null,
          ...derived,
        };
      }

      // Score-only tracking
      return {
        round,
        totalScore,
        parTotal,
        differential: parTotal > 0 ? totalScore - parTotal : null,
        fairwaysPct: null,
        girPct: null,
        avgPutts: null,
        penalties: 0,
        hasStats: false,
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

  const hasActiveFilters = courseFilter !== 'all' || dateFrom !== '' || dateTo !== '';

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-display text-golf-gold">Dashboard</h1>
        <p className="text-golf-muted mt-1 text-sm">Bienvenido, {username}</p>
      </div>

      {/* ── Filters ── */}
      <div
        className="rounded-xl p-4 mb-6"
        style={{ background: '#1a2e20', border: '1px solid #2a4530' }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Course */}
          <div className="flex flex-col gap-1">
            <label className="text-golf-muted text-xs font-medium">Cancha</label>
            <select
              value={courseFilter}
              onChange={e => setCourseFilter(e.target.value)}
              className="w-full px-3 rounded-lg text-golf-text focus:outline-none"
              style={{ background: '#223829', border: '1px solid #2a4530', fontSize: '16px', height: '44px' }}
            >
              <option value="all">Todas las canchas</option>
              {playedCourses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div className="flex flex-col gap-1">
            <label className="text-golf-muted text-xs font-medium">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full px-3 rounded-lg text-golf-text focus:outline-none"
              style={{ background: '#223829', border: '1px solid #2a4530', fontSize: '16px', height: '44px', colorScheme: 'dark' }}
            />
          </div>

          {/* Date to */}
          <div className="flex flex-col gap-1">
            <label className="text-golf-muted text-xs font-medium">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full px-3 rounded-lg text-golf-text focus:outline-none"
              style={{ background: '#223829', border: '1px solid #2a4530', fontSize: '16px', height: '44px', colorScheme: 'dark' }}
            />
          </div>
        </div>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            onClick={() => { setCourseFilter('all'); setDateFrom(''); setDateTo(''); }}
            className="mt-3 w-full py-2 rounded-lg text-golf-muted text-sm hover:text-golf-text transition-colors"
            style={{ background: '#223829', border: '1px solid #2a4530', minHeight: '44px' }}
          >
            Limpiar filtros
          </button>
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
              <h2 className="text-base font-display text-golf-text mb-3">
                Últimas Rondas
                {hasActiveFilters && (
                  <span className="text-golf-muted text-xs font-normal ml-2">
                    ({filteredRounds.length} de {completedRounds.length})
                  </span>
                )}
              </h2>
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
              <p className="text-lg font-display text-golf-text">
                {hasActiveFilters ? 'Sin rondas para los filtros seleccionados' : 'Sin rondas registradas'}
              </p>
              {!hasActiveFilters && (
                <>
                  <p className="text-sm mt-2">Comenzá creando una nueva ronda</p>
                  <Link href="/rounds/new" className="inline-block mt-4 px-6 py-2 rounded-lg text-white font-medium" style={{ background: '#1a6b3c' }}>
                    Nueva Ronda
                  </Link>
                </>
              )}
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
