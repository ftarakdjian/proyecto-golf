'use client';

import AppShell from '@/components/AppShell';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getRound, getCourses, getRoundPlayersForRound,
  getHoleScoresForRound, getShotsForRound, getHolesForCourse,
  getClubs, removePlayerFromRound,
  getHoleStatsForRound, upsertHoleScore, upsertHoleStats,
  getHoleStatsForPlayer, getShotsForHole,
  addShot, deleteShot, updateShot,
} from '@/lib/storage';
import { Round, Course, RoundPlayer, HoleScore, Shot, CourseHole, Club, HoleStats } from '@/lib/types';
import { formatDate, resolveHoleNumber, getScoreClass, generateId } from '@/lib/utils';
import Link from 'next/link';
import PlayRound from '@/components/PlayRound';
import toast from 'react-hot-toast';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function RoundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [round, setRound] = useState<Round | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [roundPlayers, setRoundPlayers] = useState<RoundPlayer[]>([]);
  const [holeScores, setHoleScores] = useState<HoleScore[]>([]);
  const [holeStats, setHoleStats] = useState<HoleStats[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [courseHoles, setCourseHoles] = useState<CourseHole[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [playing, setPlaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const r = await getRound(id);
      if (!r) { router.push('/rounds'); return; }
      setRound(r);

      const [courses, rps, scores, stats, roundShots, allClubs] = await Promise.all([
        getCourses(), getRoundPlayersForRound(id),
        getHoleScoresForRound(id), getHoleStatsForRound(id),
        getShotsForRound(id), getClubs(),
      ]);

      const c = courses.find(c => c.id === r.courseId) || null;
      setCourse(c);
      setRoundPlayers(rps);
      setHoleScores(scores);
      setHoleStats(stats);
      setShots(roundShots);
      setClubs(allClubs);

      if (c) {
        const holes = await getHolesForCourse(c.id);
        setCourseHoles(holes);
      }
    } catch {
      toast.error('Error al cargar la ronda');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { loadData(); }, [loadData, playing]);

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" message="Cargando ronda..." />
        </div>
      </AppShell>
    );
  }

  if (!round) return null;

  if (playing) {
    return (
      <AppShell>
        <PlayRound
          round={round}
          roundPlayers={roundPlayers}
          courseHoles={courseHoles}
          onComplete={() => { setPlaying(false); }}
        />
      </AppShell>
    );
  }

  if (editing) {
    return (
      <AppShell>
        <EditRound
          round={round}
          roundPlayers={roundPlayers}
          courseHoles={courseHoles}
          clubs={clubs}
          onSave={() => { setEditing(false); loadData(); toast.success('Cambios guardados'); }}
          onCancel={() => setEditing(false)}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-4 md:p-8">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 text-golf-muted text-sm mb-2">
              <Link href="/rounds" className="hover:text-golf-gold">Rondas</Link>
              <span>/</span>
              <span>{course?.name}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display text-golf-gold">{course?.name || 'Ronda'}</h1>
            <p className="text-golf-muted mt-1 text-sm">{formatDate(round.date)} &bull; {round.holesPlayed} hoyos</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {round.status === 'in_progress' && (
              <button onClick={() => setPlaying(true)} className="px-4 py-2 rounded-lg text-white font-medium text-sm" style={{ background: '#1a6b3c', minHeight: '44px' }}>
                Continuar →
              </button>
            )}
            <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-lg font-medium text-sm text-golf-muted" style={{ background: '#223829', border: '1px solid #2a4530', minHeight: '44px' }}>
              ✏️ Editar
            </button>
            <span className="px-3 py-1 rounded-full text-sm font-medium self-center"
              style={round.status === 'completed'
                ? { background: '#0f4a28', color: '#2d9e5f' }
                : { background: '#4a3a0f', color: '#c9a84c' }}>
              {round.status === 'completed' ? 'Completada' : 'En progreso'}
            </span>
          </div>
        </div>

        <Scorecard round={round} roundPlayers={roundPlayers} holeScores={holeScores} courseHoles={courseHoles} />

        {roundPlayers.filter(rp => rp.trackingLevel === 'shots').length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl md:text-2xl font-display text-golf-text mb-4">Estadísticas — Tiro a Tiro</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roundPlayers.filter(rp => rp.trackingLevel === 'shots').map(rp => (
                <PlayerShotsStats
                  key={rp.id}
                  playerName={rp.username}
                  shots={shots.filter(s => s.username === rp.username)}
                  courseHoles={courseHoles}
                  round={round}
                  clubs={clubs}
                />
              ))}
            </div>
          </div>
        )}

        {roundPlayers.filter(rp => rp.trackingLevel === 'stats').length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl md:text-2xl font-display text-golf-text mb-4">Estadísticas — Stats por Hoyo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roundPlayers.filter(rp => rp.trackingLevel === 'stats').map(rp => (
                <PlayerHoleStatsView
                  key={rp.id}
                  playerName={rp.username}
                  statsData={holeStats.filter(s => s.username === rp.username)}
                  courseHoles={courseHoles}
                  round={round}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ─── Scorecard ─────────────────────────────────────────────────────────────

function Scorecard({ round, roundPlayers, holeScores, courseHoles }: {
  round: Round; roundPlayers: RoundPlayer[]; holeScores: HoleScore[]; courseHoles: CourseHole[];
}) {
  const totalHoles = round.holesPlayed;
  const courseHoleCount = courseHoles.length;

  const getCourseHole = (playedHole: number): CourseHole | undefined => {
    if (courseHoleCount === 0) return undefined;
    const n = resolveHoleNumber(playedHole, courseHoleCount);
    return courseHoles.find(h => h.holeNumber === n);
  };

  const getScore = (username: string, hole: number) =>
    holeScores.find(s => s.username === username && s.holeNumber === hole)?.strokes;

  const getTotalScore = (username: string, from: number, to: number) => {
    let t = 0;
    for (let h = from; h <= Math.min(to, totalHoles); h++) {
      const s = getScore(username, h);
      if (s !== undefined) t += s;
    }
    return t;
  };

  const getTotalPar = (from: number, to: number) => {
    let t = 0;
    for (let h = from; h <= Math.min(to, totalHoles); h++) {
      const ch = getCourseHole(h);
      if (ch) t += ch.par;
    }
    return t;
  };

  const getTotalYards = (from: number, to: number) => {
    let t = 0;
    for (let h = from; h <= Math.min(to, totalHoles); h++) {
      const ch = getCourseHole(h);
      if (ch) t += ch.yards;
    }
    return t;
  };

  const holeCell = (hole: number) => {
    const ch = getCourseHole(hole);
    return (
      <tr key={hole} style={{ borderTop: '1px solid #2a4530' }}>
        <td className="px-3 py-2 text-golf-gold font-bold text-sm whitespace-nowrap" style={{ background: '#1a2e20', position: 'sticky', left: 0, zIndex: 1 }}>{hole}</td>
        <td className="px-3 py-2 text-golf-text text-sm font-medium">{ch?.par ?? '—'}</td>
        <td className="px-3 py-2 text-golf-muted text-sm">{ch?.yards ? `${ch.yards}` : '—'}</td>
        {roundPlayers.map(rp => {
          const score = getScore(rp.username, hole);
          const par = ch?.par;
          return (
            <td key={rp.id} className="px-2 py-2 text-center">
              {score !== undefined && par !== undefined ? (
                <span className={getScoreClass(score, par)}>{score}</span>
              ) : score !== undefined ? (
                <span className="text-golf-text text-sm">{score}</span>
              ) : (
                <span className="text-golf-muted text-sm">—</span>
              )}
            </td>
          );
        })}
      </tr>
    );
  };

  const totalRow = (label: string, from: number, to: number) => {
    const par = getTotalPar(from, to);
    const yards = getTotalYards(from, to);
    return (
      <tr key={label} style={{ background: '#223829', borderTop: '2px solid #2a4530' }}>
        <td className="px-3 py-2 text-golf-gold font-bold text-sm whitespace-nowrap" style={{ position: 'sticky', left: 0, zIndex: 1, background: '#223829' }}>{label}</td>
        <td className="px-3 py-2 text-golf-text font-semibold text-sm">{par || '—'}</td>
        <td className="px-3 py-2 text-golf-muted text-sm">{yards > 0 ? yards : '—'}</td>
        {roundPlayers.map(rp => {
          const total = getTotalScore(rp.username, from, to);
          const diff = par ? total - par : 0;
          return (
            <td key={rp.id} className="px-2 py-2 text-center">
              {total > 0 ? (
                <>
                  <span className="text-golf-text font-bold text-sm">{total}</span>
                  {par > 0 && (
                    <span className="text-xs ml-1" style={{ color: diff < 0 ? '#93c5fd' : diff === 0 ? '#8aad8f' : '#fca5a5' }}>
                      ({diff > 0 ? '+' : ''}{diff})
                    </span>
                  )}
                </>
              ) : <span className="text-golf-muted text-sm">—</span>}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div>
      <h2 className="text-xl md:text-2xl font-display text-golf-text mb-3">Scorecard</h2>
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a4530', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table className="w-full text-sm" style={{ minWidth: '400px' }}>
          <thead>
            <tr style={{ background: '#223829' }}>
              <th className="text-left px-3 py-3 text-golf-muted font-medium whitespace-nowrap" style={{ position: 'sticky', left: 0, zIndex: 2, background: '#223829' }}>Hoyo</th>
              <th className="text-left px-3 py-3 text-golf-muted font-medium">Par</th>
              <th className="text-left px-3 py-3 text-golf-muted font-medium">Yd</th>
              {roundPlayers.map(rp => (
                <th key={rp.id} className="px-2 py-3 text-golf-gold font-medium text-center whitespace-nowrap">{rp.username}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: Math.min(9, totalHoles) }, (_, i) => i + 1).map(h => holeCell(h))}
            {totalRow('Out', 1, 9)}
            {totalHoles > 9 && Array.from({ length: totalHoles - 9 }, (_, i) => i + 10).map(h => holeCell(h))}
            {totalHoles > 9 && totalRow('In', 10, 18)}
            {totalHoles > 9 && totalRow('Total', 1, 18)}
          </tbody>
        </table>
      </div>
      <div className="flex gap-3 mt-3 flex-wrap">
        {[
          { label: 'Eagle', cls: 'score-eagle', val: 3 },
          { label: 'Birdie', cls: 'score-birdie', val: 3 },
          { label: 'Par', cls: 'score-par', val: 4 },
          { label: 'Bogey', cls: 'score-bogey', val: 5 },
          { label: 'Doble', cls: 'score-double', val: 6 },
          { label: 'Triple+', cls: 'score-triple', val: 7 },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs text-golf-muted">
            <span className={item.cls}>{item.val}</span>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stats views ─────────────────────────────────────────────────────────────

function PlayerShotsStats({ playerName, shots, courseHoles, round, clubs }: {
  playerName: string; shots: Shot[]; courseHoles: CourseHole[]; round: Round; clubs: Club[];
}) {
  const courseHoleCount = courseHoles.length;
  const getCH = (h: number) => !courseHoleCount ? undefined : courseHoles.find(ch => ch.holeNumber === resolveHoleNumber(h, courseHoleCount));

  const nonPenaltyByHole = new Map<number, Shot[]>();
  shots.filter(s => !s.isPenalty).forEach(s => {
    if (!nonPenaltyByHole.has(s.holeNumber)) nonPenaltyByHole.set(s.holeNumber, []);
    nonPenaltyByHole.get(s.holeNumber)!.push(s);
  });

  const totalH = round.holesPlayed;
  const par45 = Array.from({ length: totalH }, (_, i) => i + 1).filter(h => { const ch = getCH(h); return ch && (ch.par === 4 || ch.par === 5); });
  const fairwaysHit = par45.filter(h => (nonPenaltyByHole.get(h) || []).find(s => s.shotNumber === 1)?.result === 'Fairway').length;
  const driveDists = par45.map(h => (nonPenaltyByHole.get(h) || []).find(s => s.shotNumber === 1)?.yards || 0).filter(y => y > 0);
  const avgDrive = driveDists.length > 0 ? Math.round(driveDists.reduce((a, b) => a + b, 0) / driveDists.length) : 0;
  const girHoles = Array.from({ length: totalH }, (_, i) => i + 1).filter(h => {
    const ch = getCH(h); if (!ch) return false;
    const hs = nonPenaltyByHole.get(h) || [];
    const reg = ch.par - 2;
    for (let i = 1; i <= reg; i++) { const shot = hs.find(s => s.shotNumber === i); if (shot && (shot.result === 'Green' || shot.result === 'Hoyo')) return true; }
    return false;
  });
  const putterClub = clubs.find(c => c.name === 'Putter');
  const puttShots = shots.filter(s => !s.isPenalty && putterClub && s.clubId === putterClub.id);
  const puttsByH = new Map<number, number>();
  puttShots.forEach(s => puttsByH.set(s.holeNumber, (puttsByH.get(s.holeNumber) || 0) + 1));
  const pv = Array.from(puttsByH.values());
  const totalPenalties = shots.filter(s => s.isPenalty || s.result === 'Agua' || s.result === 'Fuera de límites').length;

  return (
    <div className="rounded-xl p-5" style={{ background: '#1a2e20', border: '1px solid #2a4530' }}>
      <h3 className="text-lg font-display text-golf-gold mb-4">{playerName}</h3>
      <div className="space-y-3">
        <StatBlock title="🏌️ Tee Shots (Par 4 y 5)">
          <StatItem label="Fairways Hit" value={`${fairwaysHit}/${par45.length}`} />
          <StatItem label="Drive promedio" value={avgDrive > 0 ? `${avgDrive} yd` : '—'} />
        </StatBlock>
        <StatBlock title="🎯 GIR">
          <StatItem label="Greens en Regulación" value={`${girHoles.length}/${totalH}`} />
          <StatItem label="%" value={totalH > 0 ? `${Math.round((girHoles.length / totalH) * 100)}%` : '—'} />
        </StatBlock>
        <StatBlock title="⛳ Putting">
          <StatItem label="Total putts" value={String(puttShots.length)} />
          <StatItem label="1 putt" value={String(pv.filter(v => v === 1).length)} />
          <StatItem label="2 putts" value={String(pv.filter(v => v === 2).length)} />
          <StatItem label="3+ putts" value={String(pv.filter(v => v >= 3).length)} />
        </StatBlock>
        <StatBlock title="⚠️ Penalidades">
          <StatItem label="Total" value={String(totalPenalties)} />
        </StatBlock>
      </div>
    </div>
  );
}

function PlayerHoleStatsView({ playerName, statsData, courseHoles, round }: {
  playerName: string; statsData: HoleStats[]; courseHoles: CourseHole[]; round: Round;
}) {
  const totalH = round.holesPlayed;
  const courseHoleCount = courseHoles.length;
  const getCH = (h: number) => !courseHoleCount ? undefined : courseHoles.find(ch => ch.holeNumber === resolveHoleNumber(h, courseHoleCount));
  const par45 = Array.from({ length: totalH }, (_, i) => i + 1).filter(h => { const ch = getCH(h); return ch && (ch.par === 4 || ch.par === 5); });
  const fairwaysHit = par45.filter(h => statsData.find(s => s.holeNumber === h)?.fairwayHit === true).length;
  const girCount = statsData.filter(s => s.gir).length;
  const totalPutts = statsData.reduce((acc, s) => acc + (s.putts || 0), 0);
  const avgPutts = statsData.length > 0 ? (totalPutts / statsData.length).toFixed(1) : '—';

  return (
    <div className="rounded-xl p-5" style={{ background: '#1a2e20', border: '1px solid #2a4530' }}>
      <h3 className="text-lg font-display text-golf-gold mb-4">{playerName}</h3>
      <div className="space-y-3">
        <StatBlock title="🏌️ Tee Shots (Par 4 y 5)">
          <StatItem label="Fairways Hit" value={`${fairwaysHit}/${par45.length}`} />
        </StatBlock>
        <StatBlock title="🎯 GIR">
          <StatItem label="Greens en Regulación" value={`${girCount}/${statsData.length}`} />
          <StatItem label="%" value={statsData.length > 0 ? `${Math.round((girCount / statsData.length) * 100)}%` : '—'} />
        </StatBlock>
        <StatBlock title="⛳ Putting">
          <StatItem label="Total putts" value={String(totalPutts)} />
          <StatItem label="Promedio" value={String(avgPutts)} />
          <StatItem label="1 putt" value={String(statsData.filter(s => s.putts === 1).length)} />
          <StatItem label="2 putts" value={String(statsData.filter(s => s.putts === 2).length)} />
          <StatItem label="3+ putts" value={String(statsData.filter(s => s.putts >= 3).length)} />
        </StatBlock>
        <StatBlock title="📊 Otros">
          <StatItem label="Hoyos en bunker" value={String(statsData.filter(s => s.inBunker).length)} />
          <StatItem label="Penalidades" value={String(statsData.filter(s => s.penalty).length)} />
        </StatBlock>
      </div>
    </div>
  );
}

function StatBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-3" style={{ background: '#223829' }}>
      <p className="text-golf-text font-medium text-sm mb-2">{title}</p>
      <div className="grid grid-cols-2 gap-1 text-sm">{children}</div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-golf-muted text-xs">{label}</p>
      <p className="text-golf-text font-semibold">{value}</p>
    </div>
  );
}

// ─── Edit Round ─────────────────────────────────────────────────────────────

function EditRound({ round, roundPlayers, courseHoles, clubs, onSave, onCancel }: {
  round: Round; roundPlayers: RoundPlayer[]; courseHoles: CourseHole[];
  clubs: Club[]; onSave: () => void; onCancel: () => void;
}) {
  const [selectedUsername, setSelectedUsername] = useState(roundPlayers[0]?.username || '');
  const [localRoundPlayers, setLocalRoundPlayers] = useState(roundPlayers);
  const [shotResults] = useState(['Fairway', 'Green', 'Rough', 'Bunker', 'Hoyo', 'Agua', 'Fuera de límites']);

  const courseHoleCount = courseHoles.length;
  const getCH = (h: number) => !courseHoleCount ? undefined : courseHoles.find(ch => ch.holeNumber === resolveHoleNumber(h, courseHoleCount));
  const selectedRP = localRoundPlayers.find(rp => rp.username === selectedUsername);

  const handleRemovePlayer = async (username: string) => {
    if (!confirm(`¿Eliminar a ${username} de esta ronda?`)) return;
    try {
      await removePlayerFromRound(round.id, username);
      const updated = localRoundPlayers.filter(rp => rp.username !== username);
      setLocalRoundPlayers(updated);
      if (selectedUsername === username) setSelectedUsername(updated[0]?.username || '');
      toast.success('Jugador eliminado');
    } catch {
      toast.error('Error al eliminar jugador');
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-display text-golf-gold">Editando Ronda</h1>
        <div className="flex gap-2">
          <button onClick={onSave} className="px-4 py-2 rounded-lg text-white font-medium text-sm" style={{ background: '#1a6b3c', minHeight: '44px' }}>✓ Guardar</button>
          <button onClick={onCancel} className="px-4 py-2 rounded-lg font-medium text-sm text-golf-muted" style={{ background: '#223829', border: '1px solid #2a4530', minHeight: '44px' }}>Cancelar</button>
        </div>
      </div>

      {localRoundPlayers.length === 0 && <p className="text-golf-muted">No hay jugadores en esta ronda.</p>}

      {localRoundPlayers.length > 0 && (
        <>
          <div className="flex gap-2 flex-wrap mb-5">
            {localRoundPlayers.map(rp => (
              <div key={rp.id} className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedUsername(rp.username)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={selectedUsername === rp.username
                    ? { background: '#1a6b3c', color: '#e8f0e9', minHeight: '44px' }
                    : { background: '#1a2e20', color: '#8aad8f', border: '1px solid #2a4530', minHeight: '44px' }}>
                  {rp.username}
                </button>
                <button
                  onClick={() => handleRemovePlayer(rp.username)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-red-400 hover:text-red-300 text-xs"
                  style={{ background: '#2a2020', minHeight: '44px', minWidth: '44px' }}
                  title="Eliminar jugador"
                >✕</button>
              </div>
            ))}
          </div>

          {selectedRP && (
            <div className="space-y-3">
              <h2 className="text-base font-display text-golf-text">
                {selectedUsername} —{' '}
                <span className="text-golf-muted text-sm">
                  {selectedRP.trackingLevel === 'shots' ? 'Tiro a Tiro' : selectedRP.trackingLevel === 'stats' ? 'Stats por Hoyo' : 'Solo Score'}
                </span>
              </h2>

              {Array.from({ length: round.holesPlayed }, (_, i) => i + 1).map(hole => {
                const ch = getCH(hole);
                return (
                  <div key={hole} className="rounded-xl" style={{ border: '1px solid #2a4530' }}>
                    <div className="px-4 py-2 flex items-center gap-3" style={{ background: '#1a2e20', borderRadius: '0.75rem 0.75rem 0 0' }}>
                      <span className="text-golf-gold font-semibold">Hoyo {hole}</span>
                      {ch && <span className="text-golf-muted text-sm">Par {ch.par} • {ch.yards}yd</span>}
                    </div>
                    <div style={{ background: '#182820', borderRadius: '0 0 0.75rem 0.75rem' }}>
                      {selectedRP.trackingLevel === 'score' && <EditScoreHole roundId={round.id} username={selectedUsername} holeNumber={hole} />}
                      {selectedRP.trackingLevel === 'stats' && <EditStatsHole roundId={round.id} username={selectedUsername} holeNumber={hole} courseHole={ch} />}
                      {selectedRP.trackingLevel === 'shots' && <EditShotsHole roundId={round.id} username={selectedUsername} holeNumber={hole} clubs={clubs} shotResults={shotResults} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EditScoreHole({ roundId, username, holeNumber }: { roundId: string; username: string; holeNumber: number }) {
  const [val, setVal] = useState('');

  useEffect(() => {
    getHoleScoresForRound(roundId).then(scores => {
      const s = scores.find(s => s.username === username && s.holeNumber === holeNumber);
      setVal(s ? String(s.strokes) : '');
    }).catch(() => {});
  }, [roundId, username, holeNumber]);

  const save = (v: string) => {
    const n = parseInt(v);
    if (!isNaN(n) && n > 0) void upsertHoleScore({ roundId, username, holeNumber, strokes: n });
  };

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <label className="text-golf-muted text-sm">Golpes:</label>
      <input type="number" inputMode="numeric" value={val} onChange={e => setVal(e.target.value)} onBlur={e => save(e.target.value)}
        min={1} max={20} placeholder="0"
        className="w-20 px-3 py-2 rounded-lg text-golf-text text-center text-xl font-bold focus:outline-none"
        style={{ background: '#223829', border: '1px solid #2a4530', fontSize: '20px' }} />
    </div>
  );
}

function EditStatsHole({ roundId, username, holeNumber, courseHole }: {
  roundId: string; username: string; holeNumber: number; courseHole: CourseHole | undefined;
}) {
  const def: HoleStats = { id: generateId(), roundId, username, holeNumber, strokes: 0, fairwayHit: null, greenHit: null, inBunker: false, penalty: false, putts: 0, gir: false };
  const [s, setS] = useState<HoleStats>(def);

  useEffect(() => {
    getHoleStatsForPlayer(roundId, username, holeNumber).then(ex => {
      setS(ex || { ...def, id: generateId() });
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId, username, holeNumber]);

  const upd = (field: keyof HoleStats, value: boolean | number | null) => {
    setS(prev => {
      const next = { ...prev, [field]: value };
      const par = courseHole?.par ?? 4;
      next.gir = (() => {
        if (next.strokes === 0) return false;
        if (par === 3) return next.greenHit === true;
        if (par === 4) return (next.strokes - next.putts) <= 2;
        return (next.strokes - next.putts) <= 3;
      })();
      void upsertHoleStats(next);
      if (next.strokes > 0) void upsertHoleScore({ roundId, username, holeNumber, strokes: next.strokes });
      return next;
    });
  };

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex gap-4">
        <div>
          <label className="block text-xs text-golf-muted mb-1">Golpes</label>
          <input type="number" inputMode="numeric" value={s.strokes || ''} onChange={e => upd('strokes', Number(e.target.value))} min={1} max={20}
            className="w-16 px-2 py-2 rounded text-golf-text text-center font-bold focus:outline-none"
            style={{ background: '#223829', border: '1px solid #2a4530', fontSize: '18px' }} />
        </div>
        <div>
          <label className="block text-xs text-golf-muted mb-1">Putts</label>
          <input type="number" inputMode="numeric" value={s.putts || ''} onChange={e => upd('putts', Number(e.target.value))} min={0} max={10}
            className="w-16 px-2 py-2 rounded text-golf-text text-center font-bold focus:outline-none"
            style={{ background: '#223829', border: '1px solid #2a4530', fontSize: '18px' }} />
        </div>
        <div className="self-end">
          <span className="text-sm px-2 py-1 rounded-full" style={s.gir ? { background: '#0f4a28', color: '#2d9e5f' } : { background: '#2a3a30', color: '#8aad8f' }}>
            {s.gir ? 'GIR ✓' : 'No GIR'}
          </span>
        </div>
      </div>
      {courseHole?.par === 3 && <EditToggle label="¿Green en tiro 1?" value={s.greenHit} onChange={v => upd('greenHit', v)} />}
      {courseHole?.par !== 3 && courseHole?.par !== undefined && <EditToggle label="¿Fairway?" value={s.fairwayHit} onChange={v => upd('fairwayHit', v)} />}
      <EditToggle label="¿Bunker?" value={s.inBunker} onChange={v => upd('inBunker', v as boolean)} isBool />
      <EditToggle label="¿Penalidad?" value={s.penalty} onChange={v => upd('penalty', v as boolean)} isBool />
    </div>
  );
}

function EditToggle({ label, value, onChange, isBool = false }: {
  label: string; value: boolean | null; onChange: (v: boolean | null) => void; isBool?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-golf-muted text-sm">{label}</span>
      <div className="flex gap-1">
        <button onClick={() => onChange(true)} className="px-3 py-1 rounded text-sm"
          style={value === true ? { background: '#1a6b3c', color: '#e8f0e9' } : { background: '#223829', color: '#8aad8f', border: '1px solid #2a4530' }}>Sí</button>
        <button onClick={() => onChange(isBool ? false : false)} className="px-3 py-1 rounded text-sm"
          style={value === false ? { background: '#3a1a1a', color: '#fca5a5' } : { background: '#223829', color: '#8aad8f', border: '1px solid #2a4530' }}>No</button>
      </div>
    </div>
  );
}

function EditShotsHole({ roundId, username, holeNumber, clubs, shotResults }: {
  roundId: string; username: string; holeNumber: number; clubs: Club[]; shotResults: string[];
}) {
  const [shots, setShots] = useState<Shot[]>([]);

  const refresh = useCallback(async () => {
    const data = await getShotsForHole(roundId, username, holeNumber);
    setShots(data);
  }, [roundId, username, holeNumber]);

  useEffect(() => { void refresh(); }, [refresh]);

  const lastShot = shots.length > 0 ? shots[shots.length - 1] : null;
  const isComplete = lastShot?.result === 'Hoyo';

  const addNewShot = async () => {
    if (isComplete) return;
    const startPos = shots.length === 0 ? 'Tee' : (lastShot?.result || 'Fairway');
    try {
      await addShot({
        roundId, username, holeNumber,
        shotNumber: shots.length + 1, clubId: clubs[0]?.id || '',
        startPosition: startPos, result: 'Fairway', yards: 0, isPenalty: false,
      });
      await refresh();
    } catch { toast.error('Error al agregar tiro'); }
  };

  const removeShot = async (id: string) => {
    try { await deleteShot(id); await refresh(); }
    catch { toast.error('Error al eliminar tiro'); }
  };

  const updateShotField = (shotId: string, field: keyof Shot, value: string | number) => {
    void updateShot(shotId, { [field]: value }).then(() => refresh()).catch(() => toast.error('Error al guardar'));
  };

  return (
    <div className="px-4 py-3 space-y-2">
      {shots.map(shot => (
        <div key={shot.id} className="rounded-lg p-3" style={{ background: '#223829', border: '1px solid #2a4530' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-golf-gold text-xs font-semibold">{shot.isPenalty ? '⚠ Penalidad' : `Tiro ${shot.shotNumber}`}</span>
            <button onClick={() => removeShot(shot.id)} className="text-red-400 text-xs hover:text-red-300">✕</button>
          </div>
          {!shot.isPenalty && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-golf-muted mb-1">Palo</label>
                <select value={shot.clubId} onChange={e => updateShotField(shot.id, 'clubId', e.target.value)}
                  className="w-full px-2 py-1.5 rounded text-golf-text text-xs focus:outline-none"
                  style={{ background: '#1a2e20', border: '1px solid #2a4530', fontSize: '16px' }}>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-golf-muted mb-1">Resultado</label>
                <select value={shot.result} onChange={e => updateShotField(shot.id, 'result', e.target.value)}
                  className="w-full px-2 py-1.5 rounded text-golf-text text-xs focus:outline-none"
                  style={{ background: '#1a2e20', border: '1px solid #2a4530', fontSize: '16px' }}>
                  {shotResults.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-golf-muted mb-1">Yardas</label>
                <input type="number" inputMode="numeric" value={shot.yards || ''} onChange={e => updateShotField(shot.id, 'yards', Number(e.target.value))}
                  min={0} placeholder="0"
                  className="w-full px-2 py-1.5 rounded text-golf-text text-xs focus:outline-none"
                  style={{ background: '#1a2e20', border: '1px solid #2a4530', fontSize: '16px' }} />
              </div>
            </div>
          )}
        </div>
      ))}
      {!isComplete && (
        <button onClick={addNewShot} className="px-4 py-2 rounded-lg text-sm font-medium w-full"
          style={{ background: '#1a6b3c', color: '#e8f0e9', minHeight: '44px' }}>
          + Agregar Tiro
        </button>
      )}
    </div>
  );
}
