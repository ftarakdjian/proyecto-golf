'use client';

import { useState, useEffect, useCallback } from 'react';
import { Round, RoundPlayer, CourseHole, Player, Shot, HoleStats, Club, ShotResult } from '@/lib/types';
import {
  getClubs, getShotResults,
  getShotsForHole, addShot, deleteShot,
  upsertHoleScore, getHoleScoresForRound, updateRound,
  getHoleStatsForPlayer, upsertHoleStats, removePlayerFromRound,
  getRoundPlayersForRound, updateShot,
} from '@/lib/storage';
import { generateId, resolveHoleNumber } from '@/lib/utils';
import toast from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';

interface Props {
  round: Round;
  roundPlayers: RoundPlayer[];
  courseHoles: CourseHole[];
  players: Player[];
  onComplete: () => void;
}

export default function PlayRound({ round, roundPlayers: initialRoundPlayers, courseHoles, players, onComplete }: Props) {
  const [currentHole, setCurrentHole] = useState(1);
  const [roundPlayers, setRoundPlayers] = useState(initialRoundPlayers);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [shotResults, setShotResults] = useState<ShotResult[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [showEditConfig, setShowEditConfig] = useState(false);
  const [editDate, setEditDate] = useState(round.date);
  const [editHolesPlayed, setEditHolesPlayed] = useState<9 | 18>(round.holesPlayed);
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(() =>
    new Set(initialRoundPlayers.map(rp => rp.playerId))
  );

  useEffect(() => {
    async function loadStatic() {
      try {
        const [c, sr] = await Promise.all([getClubs(), getShotResults()]);
        setClubs(c);
        setShotResults(sr);
      } catch {
        toast.error('Error al cargar palos');
      } finally {
        setDataReady(true);
      }
    }
    loadStatic();
  }, []);

  const totalHoles = round.holesPlayed;
  const courseHoleCount = courseHoles.length;

  const getCourseHole = (holeNumber: number): CourseHole | undefined => {
    if (courseHoleCount === 0) return undefined;
    const courseHoleNum = resolveHoleNumber(holeNumber, courseHoleCount);
    return courseHoles.find(h => h.holeNumber === courseHoleNum);
  };

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || '?';

  const handleComplete = async () => {
    try {
      await updateRound({ ...round, status: 'completed' });
      toast.success('¡Ronda completada!');
      onComplete();
    } catch {
      toast.error('Error al completar ronda');
    }
  };

  const handleSaveConfig = async () => {
    try {
      await updateRound({ ...round, date: editDate, holesPlayed: editHolesPlayed });
      setShowEditConfig(false);
      toast.success('Configuración actualizada');
    } catch {
      toast.error('Error al guardar configuración');
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    const playerName = getPlayerName(playerId);
    if (!confirm(`¿Eliminar a ${playerName} de esta ronda? Se borrarán todos sus datos.`)) return;
    try {
      await removePlayerFromRound(round.id, playerId);
      const updated = await getRoundPlayersForRound(round.id);
      setRoundPlayers(updated);
      toast.success(`${playerName} eliminado de la ronda`);
      if (updated.length === 0) toast('La ronda quedó sin jugadores.');
    } catch {
      toast.error('Error al eliminar jugador');
    }
  };

  const togglePlayer = (playerId: string) => {
    setExpandedPlayers(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const courseHole = getCourseHole(currentHole);
  const progress = Math.round(((currentHole - 1) / totalHoles) * 100);

  if (!dataReady) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#0f1a14' }}>
        <LoadingSpinner size="lg" message="Cargando..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#0f1a14' }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 px-4 py-3" style={{ background: '#1a2e20', borderBottom: '1px solid #2a4530' }}>
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display text-golf-gold text-base md:text-lg">Jugando Ronda</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditConfig(!showEditConfig)}
              className="px-3 py-1.5 rounded-lg text-xs text-golf-muted hover:text-golf-text transition-colors"
              style={{ background: '#223829', border: '1px solid #2a4530', minHeight: '36px' }}
              title="Editar configuración"
            >
              ✏️ Config
            </button>
          </div>
        </div>

        {/* Hole navigation */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentHole(h => Math.max(1, h - 1))}
            disabled={currentHole === 1}
            className="flex-shrink-0 flex items-center justify-center rounded-xl font-bold text-lg transition-all"
            style={{
              width: '44px', height: '44px',
              background: currentHole === 1 ? '#1a2e20' : '#223829',
              border: '1px solid #2a4530',
              color: currentHole === 1 ? '#2a4530' : '#8aad8f',
            }}
          >
            ←
          </button>

          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-3">
              <span className="font-display text-golf-gold text-xl">Hoyo {currentHole}</span>
              {courseHole && (
                <span className="text-golf-muted text-sm">
                  Par <span className="text-golf-text font-semibold">{courseHole.par}</span>
                  {courseHole.yards > 0 && <span className="ml-2 text-golf-muted">{courseHole.yards}yd</span>}
                </span>
              )}
              {courseHoleCount > 0 && currentHole > courseHoleCount && (
                <span className="text-golf-muted text-xs">(hoyo {resolveHoleNumber(currentHole, courseHoleCount)} cancha)</span>
              )}
            </div>
            {courseHole?.description && (
              <p className="text-golf-muted text-xs mt-0.5">{courseHole.description}</p>
            )}
          </div>

          {currentHole < totalHoles ? (
            <button
              onClick={() => setCurrentHole(h => h + 1)}
              className="flex-shrink-0 flex items-center justify-center rounded-xl font-bold text-lg transition-all"
              style={{ width: '44px', height: '44px', background: '#1a6b3c', color: '#e8f0e9', border: '1px solid #2d9e5f' }}
            >
              →
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex-shrink-0 flex items-center justify-center rounded-xl text-xs font-bold transition-all px-2"
              style={{ height: '44px', background: '#c9a84c', color: '#0f1a14', border: '1px solid #e5c97e', minWidth: '44px' }}
            >
              ✓ Fin
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: '#2a4530' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: '#1a6b3c' }} />
        </div>

        {/* Hole dots */}
        <div className="flex gap-1 mt-2 overflow-x-auto pb-1 hide-scrollbar">
          {Array.from({ length: totalHoles }, (_, i) => i + 1).map(h => (
            <button
              key={h}
              onClick={() => setCurrentHole(h)}
              className="flex-shrink-0 rounded-full text-xs font-medium transition-all"
              style={{
                width: '22px', height: '22px',
                background: h === currentHole ? '#c9a84c' : h < currentHole ? '#1a6b3c' : '#2a4530',
                color: h === currentHole ? '#0f1a14' : h < currentHole ? '#e8f0e9' : '#8aad8f',
              }}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      {/* Edit config panel */}
      {showEditConfig && (
        <div className="mx-4 mt-3 rounded-xl p-4" style={{ background: '#1a2e20', border: '1px solid #c9a84c' }}>
          <h3 className="font-display text-golf-gold text-sm mb-3">Editar configuración</h3>
          <div className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="block text-xs text-golf-muted mb-1">Fecha</label>
              <input
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                className="px-3 py-2 rounded-lg text-golf-text focus:outline-none text-sm"
                style={{ background: '#223829', border: '1px solid #2a4530', colorScheme: 'dark', fontSize: '16px' }}
              />
            </div>
            <div>
              <label className="block text-xs text-golf-muted mb-1">Hoyos</label>
              <div className="flex gap-2">
                {([9, 18] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => setEditHolesPlayed(n)}
                    className="px-3 py-2 rounded-lg text-sm font-medium"
                    style={editHolesPlayed === n
                      ? { background: '#1a6b3c', color: '#e8f0e9' }
                      : { background: '#223829', color: '#8aad8f', border: '1px solid #2a4530' }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleSaveConfig} className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: '#1a6b3c', minHeight: '40px' }}>
              Guardar
            </button>
            <button onClick={() => setShowEditConfig(false)} className="px-4 py-2 rounded-lg text-sm text-golf-muted" style={{ background: '#223829', border: '1px solid #2a4530', minHeight: '40px' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Players */}
      <div className="flex-1 p-4 space-y-3 overflow-auto">
        {roundPlayers.map(rp => (
          <div key={rp.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a4530' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ background: '#1a2e20' }}>
              <button onClick={() => togglePlayer(rp.playerId)} className="flex items-center gap-2 flex-1 text-left" style={{ minHeight: '44px' }}>
                <span className="text-xs transition-transform" style={{ transform: expandedPlayers.has(rp.playerId) ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                <span className="text-golf-text font-semibold">{getPlayerName(rp.playerId)}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={
                    rp.trackingLevel === 'shots' ? { background: '#0f4a28', color: '#2d9e5f' }
                    : rp.trackingLevel === 'stats' ? { background: '#1a2e50', color: '#6ba3f0' }
                    : { background: '#2a3a30', color: '#8aad8f' }
                  }
                >
                  {rp.trackingLevel === 'shots' ? 'Tiro a Tiro' : rp.trackingLevel === 'stats' ? 'Stats' : 'Score'}
                </span>
              </button>
              <button onClick={() => handleRemovePlayer(rp.playerId)} className="text-red-400 hover:text-red-300 text-xs px-2 transition-colors" style={{ minHeight: '44px' }} title="Eliminar jugador">
                ✕
              </button>
            </div>

            {expandedPlayers.has(rp.playerId) && (
              <div style={{ background: '#182820' }}>
                {rp.trackingLevel === 'score' && (
                  <ScoreCard roundPlayer={rp} holeNumber={currentHole} round={round} />
                )}
                {rp.trackingLevel === 'stats' && (
                  <StatsCard roundPlayer={rp} holeNumber={currentHole} courseHole={courseHole} round={round} />
                )}
                {rp.trackingLevel === 'shots' && (
                  <ShotsCard roundPlayer={rp} holeNumber={currentHole} courseHole={courseHole} round={round} clubs={clubs} shotResults={shotResults} />
                )}
              </div>
            )}
          </div>
        ))}

        {roundPlayers.length === 0 && (
          <div className="text-center py-10 text-golf-muted">
            <p>No hay jugadores en esta ronda.</p>
          </div>
        )}

        {/* Bottom navigation */}
        <div className="flex gap-3 pt-2 pb-4">
          <button
            onClick={() => setCurrentHole(h => Math.max(1, h - 1))}
            disabled={currentHole === 1}
            className="flex-1 py-3 rounded-xl font-medium transition-all"
            style={{ background: '#223829', border: '1px solid #2a4530', color: currentHole === 1 ? '#2a4530' : '#8aad8f', minHeight: '48px' }}
          >
            ← Anterior
          </button>
          {currentHole < totalHoles ? (
            <button
              onClick={() => setCurrentHole(h => h + 1)}
              className="flex-1 py-3 rounded-xl text-white font-semibold transition-all"
              style={{ background: '#1a6b3c', minHeight: '48px' }}
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex-1 py-3 rounded-xl font-semibold transition-all"
              style={{ background: '#c9a84c', color: '#0f1a14', minHeight: '48px' }}
            >
              ✓ Finalizar Ronda
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Score only ────────────────────────────────────────────────────────────

function ScoreCard({ roundPlayer, holeNumber, round }: {
  roundPlayer: RoundPlayer; holeNumber: number; round: Round;
}) {
  const [scoreInput, setScoreInput] = useState('');

  useEffect(() => {
    getHoleScoresForRound(round.id).then(scores => {
      const existing = scores.find(s => s.playerId === roundPlayer.playerId && s.holeNumber === holeNumber);
      setScoreInput(existing ? String(existing.strokes) : '');
    }).catch(() => {});
  }, [holeNumber, roundPlayer.playerId, round.id]);

  const saveScore = (value: string) => {
    const n = parseInt(value);
    if (isNaN(n) || n < 1) return;
    void upsertHoleScore({ roundId: round.id, playerId: roundPlayer.playerId, holeNumber, strokes: n });
  };

  return (
    <div className="px-4 py-4 flex items-center gap-4">
      <label className="text-golf-muted text-sm flex-shrink-0">Golpes:</label>
      <input
        type="number"
        inputMode="numeric"
        value={scoreInput}
        onChange={e => setScoreInput(e.target.value)}
        onBlur={e => saveScore(e.target.value)}
        placeholder="0"
        min={1}
        max={20}
        className="w-24 px-3 py-3 rounded-xl text-golf-text text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-golf-green"
        style={{ background: '#223829', border: '1px solid #2a4530', fontSize: '24px' }}
      />
    </div>
  );
}

// ─── Stats mode ─────────────────────────────────────────────────────────────

function calcGIR(strokes: number, putts: number, par: number, fairwayHit: boolean | null, greenHit: boolean | null): boolean {
  if (strokes === 0) return false;
  if (par === 3) return greenHit === true;
  if (par === 4) return (strokes - putts) <= 2;
  if (par === 5) return (strokes - putts) <= 3;
  return false;
}

function StatsCard({ roundPlayer, holeNumber, courseHole, round }: {
  roundPlayer: RoundPlayer; holeNumber: number; courseHole: CourseHole | undefined; round: Round;
}) {
  const defaultStats: HoleStats = {
    id: generateId(), roundId: round.id, playerId: roundPlayer.playerId,
    holeNumber, strokes: 0, fairwayHit: null, greenHit: null,
    inBunker: false, penalty: false, putts: 0, gir: false,
  };

  const [stats, setStats] = useState<HoleStats>(defaultStats);

  useEffect(() => {
    getHoleStatsForPlayer(round.id, roundPlayer.playerId, holeNumber).then(existing => {
      setStats(existing || { ...defaultStats, id: generateId() });
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holeNumber, roundPlayer.playerId, round.id]);

  const update = useCallback((field: keyof HoleStats, value: boolean | number | null) => {
    setStats(prev => {
      const next = { ...prev, [field]: value };
      const par = courseHole?.par ?? 4;
      next.gir = calcGIR(
        field === 'strokes' ? (value as number) : next.strokes,
        field === 'putts' ? (value as number) : next.putts,
        par,
        field === 'fairwayHit' ? (value as boolean | null) : next.fairwayHit,
        field === 'greenHit' ? (value as boolean | null) : next.greenHit,
      );
      void upsertHoleStats(next);
      const strokes = field === 'strokes' ? (value as number) : next.strokes;
      if (strokes > 0) {
        void upsertHoleScore({ roundId: round.id, playerId: roundPlayer.playerId, holeNumber, strokes });
      }
      return next;
    });
  }, [courseHole, round.id, roundPlayer.playerId, holeNumber]);

  const par = courseHole?.par;
  const gir = stats.gir;

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-4">
        <div>
          <label className="block text-xs text-golf-muted mb-1">Golpes</label>
          <input type="number" inputMode="numeric" value={stats.strokes || ''} onChange={e => update('strokes', Number(e.target.value))}
            placeholder="0" min={1} max={20}
            className="w-20 px-3 py-3 rounded-xl text-golf-text text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-golf-green"
            style={{ background: '#223829', border: '1px solid #2a4530', fontSize: '20px' }}
          />
        </div>
        <div>
          <label className="block text-xs text-golf-muted mb-1">Putts</label>
          <input type="number" inputMode="numeric" value={stats.putts || ''} onChange={e => update('putts', Number(e.target.value))}
            placeholder="0" min={0} max={10}
            className="w-20 px-3 py-3 rounded-xl text-golf-text text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-golf-green"
            style={{ background: '#223829', border: '1px solid #2a4530', fontSize: '20px' }}
          />
        </div>
        <div className="ml-auto">
          <span
            className="text-sm font-semibold px-3 py-1.5 rounded-full"
            style={gir
              ? { background: '#0f4a28', color: '#2d9e5f', border: '1px solid #2d9e5f' }
              : { background: '#2a3a30', color: '#8aad8f', border: '1px solid #2a4530' }}
          >
            {gir ? 'GIR ✓' : 'No GIR'}
          </span>
        </div>
      </div>

      {par === 3 && (
        <ToggleRow label="¿Llegaste al green en el tiro 1?" value={stats.greenHit} onChange={v => update('greenHit', v)} />
      )}
      {par !== undefined && par !== 3 && (
        <ToggleRow label="¿El drive fue al fairway?" value={stats.fairwayHit} onChange={v => update('fairwayHit', v)} />
      )}
      <ToggleRow label="¿Fuiste al bunker?" value={stats.inBunker} onChange={v => update('inBunker', v as boolean)} isBool />
      <ToggleRow label="¿Tuviste penalidad?" value={stats.penalty} onChange={v => update('penalty', v as boolean)} isBool />
    </div>
  );
}

function ToggleRow({ label, value, onChange, isBool = false }: {
  label: string; value: boolean | null; onChange: (v: boolean | null) => void; isBool?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-golf-muted text-sm flex-1">{label}</span>
      <div className="flex gap-2 flex-shrink-0">
        <button onClick={() => onChange(true)} className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={value === true
            ? { background: '#1a6b3c', color: '#e8f0e9', border: '1px solid #2d9e5f' }
            : { background: '#223829', color: '#8aad8f', border: '1px solid #2a4530' }}>
          Sí
        </button>
        <button onClick={() => onChange(isBool ? false : false)} className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={value === false
            ? { background: '#3a1a1a', color: '#fca5a5', border: '1px solid #5a2020' }
            : { background: '#223829', color: '#8aad8f', border: '1px solid #2a4530' }}>
          No
        </button>
      </div>
    </div>
  );
}

// ─── Shots mode ─────────────────────────────────────────────────────────────

function ShotsCard({ roundPlayer, holeNumber, courseHole, round, clubs, shotResults }: {
  roundPlayer: RoundPlayer; holeNumber: number; courseHole: CourseHole | undefined;
  round: Round; clubs: Club[]; shotResults: ShotResult[];
}) {
  const [shots, setShots] = useState<Shot[]>([]);

  const refresh = useCallback(async () => {
    const data = await getShotsForHole(round.id, roundPlayer.playerId, holeNumber);
    setShots(data);
  }, [round.id, roundPlayer.playerId, holeNumber]);

  useEffect(() => {
    void refresh();
  }, [holeNumber, roundPlayer.playerId, round.id, refresh]);

  // Auto-save shot count as score
  useEffect(() => {
    if (shots.length > 0) {
      void upsertHoleScore({
        roundId: round.id, playerId: roundPlayer.playerId, holeNumber, strokes: shots.length,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shots.length]);

  const PENALTY_RESULTS = ['Agua', 'Fuera de límites'];
  const lastShot = shots.length > 0 ? shots[shots.length - 1] : null;
  const isHoleComplete = lastShot?.result === 'Hoyo';
  const totalStrokes = shots.length;

  const addNewShot = async () => {
    if (isHoleComplete) return;
    let startPosition = 'Tee';
    let autoAddPenalty = false;

    if (lastShot) {
      if (PENALTY_RESULTS.includes(lastShot.result)) {
        startPosition = 'Fairway';
        autoAddPenalty = true;
      } else {
        startPosition = lastShot.result;
      }
    }

    const shotNum = shots.length + 1;
    try {
      if (autoAddPenalty) {
        await addShot({
          roundId: round.id, playerId: roundPlayer.playerId, holeNumber,
          shotNumber: shotNum, clubId: '', startPosition: lastShot?.result || '',
          result: 'Penalidad', yards: 0, isPenalty: true,
        });
        await addShot({
          roundId: round.id, playerId: roundPlayer.playerId, holeNumber,
          shotNumber: shotNum + 1, clubId: clubs[0]?.id || '',
          startPosition, result: 'Fairway', yards: 0, isPenalty: false,
        });
      } else {
        await addShot({
          roundId: round.id, playerId: roundPlayer.playerId, holeNumber,
          shotNumber: shotNum, clubId: clubs[0]?.id || '', startPosition,
          result: shots.length === 0 ? 'Fairway' : (lastShot?.result || 'Fairway'),
          yards: 0, isPenalty: false,
        });
      }
      await refresh();
    } catch {
      toast.error('Error al agregar tiro');
    }
  };

  const updateShotField = (shotId: string, field: keyof Shot, value: string | number | boolean) => {
    // Optimistic update
    setShots(prev => prev.map(s => s.id === shotId ? { ...s, [field]: value } : s));
    void updateShot(shotId, { [field]: value }).catch(() => {
      toast.error('Error al guardar');
      void refresh();
    });
  };

  const removeLastShot = async () => {
    if (!lastShot) return;
    try {
      await deleteShot(lastShot.id);
      const prev = shots.slice(0, -1);
      if (prev.length > 0 && prev[prev.length - 1].isPenalty) {
        await deleteShot(prev[prev.length - 1].id);
      }
      await refresh();
    } catch {
      toast.error('Error al deshacer tiro');
    }
  };

  return (
    <div className="px-4 py-3 space-y-2">
      {totalStrokes > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-golf-gold font-semibold">{totalStrokes} golpes</span>
          {courseHole && (
            <span style={{ color: totalStrokes - courseHole.par < 0 ? '#93c5fd' : totalStrokes - courseHole.par === 0 ? '#8aad8f' : '#fca5a5' }}>
              ({totalStrokes - courseHole.par > 0 ? '+' : ''}{totalStrokes - courseHole.par})
            </span>
          )}
        </div>
      )}

      {shots.map(shot => (
        <ShotRow key={shot.id} shot={shot} clubs={clubs} shotResults={shotResults} onChange={updateShotField} />
      ))}

      <div className="flex gap-2 pt-1">
        {!isHoleComplete && (
          <button onClick={addNewShot} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all" style={{ background: '#1a6b3c', color: '#e8f0e9', minHeight: '44px' }}>
            + Agregar Tiro
          </button>
        )}
        {shots.length > 0 && (
          <button onClick={removeLastShot} className="px-3 py-2.5 rounded-lg text-sm font-medium transition-all" style={{ background: '#2a3a30', color: '#fca5a5', border: '1px solid #5a2020', minHeight: '44px' }}>
            Deshacer
          </button>
        )}
      </div>

      {isHoleComplete && (
        <div className="flex items-center gap-2 text-golf-gold text-sm font-medium py-1">
          ⛳ Hoyo completado en {totalStrokes} golpes
        </div>
      )}
    </div>
  );
}

function ShotRow({ shot, clubs, shotResults, onChange }: {
  shot: Shot;
  clubs: Club[];
  shotResults: ShotResult[];
  onChange: (id: string, field: keyof Shot, value: string | number | boolean) => void;
}) {
  if (shot.isPenalty) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: '#3a1a1a', border: '1px solid #5a2020' }}>
        <span className="text-red-400 font-semibold text-xs">⚠ Penalidad</span>
        <span className="text-red-300 text-xs">Tiro {shot.shotNumber}</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-3" style={{ background: '#223829', border: '1px solid #2a4530' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-golf-gold font-semibold text-xs w-14 flex-shrink-0">Tiro {shot.shotNumber}</span>
        <span className="text-golf-muted text-xs">desde: <span className="text-golf-text">{shot.startPosition}</span></span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-golf-muted mb-1">Palo</label>
          <select value={shot.clubId} onChange={e => onChange(shot.id, 'clubId', e.target.value)}
            className="w-full px-2 py-2 rounded text-golf-text focus:outline-none"
            style={{ background: '#1a2e20', border: '1px solid #2a4530', fontSize: '16px' }}>
            {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-golf-muted mb-1">Resultado</label>
          <select value={shot.result} onChange={e => onChange(shot.id, 'result', e.target.value)}
            className="w-full px-2 py-2 rounded text-golf-text focus:outline-none"
            style={{ background: '#1a2e20', border: '1px solid #2a4530', fontSize: '16px' }}>
            {shotResults.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-golf-muted mb-1">Yardas</label>
          <input type="number" inputMode="numeric" value={shot.yards || ''} onChange={e => onChange(shot.id, 'yards', Number(e.target.value))}
            placeholder="0" min={0}
            className="w-full px-2 py-2 rounded text-golf-text focus:outline-none"
            style={{ background: '#1a2e20', border: '1px solid #2a4530', fontSize: '16px' }} />
        </div>
      </div>
    </div>
  );
}
