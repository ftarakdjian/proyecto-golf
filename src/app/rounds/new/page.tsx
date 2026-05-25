'use client';

import AppShell from '@/components/AppShell';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Player, Course, CourseHole, Round, RoundPlayer } from '@/lib/types';
import {
  getPlayers, getCourses, getHolesForCourse,
  addRound, addRoundPlayers,
} from '@/lib/storage';
import { getTodayISO } from '@/lib/utils';
import toast from 'react-hot-toast';
import PlayRound from '@/components/PlayRound';
import LoadingSpinner from '@/components/LoadingSpinner';

type Step = 1 | 2 | 3;
type TrackingLevel = 'score' | 'stats' | 'shots';

interface PlayerSelection {
  playerId: string;
  selected: boolean;
  trackingLevel: TrackingLevel;
}

const TRACKING_OPTIONS: { value: TrackingLevel; label: string; desc: string }[] = [
  { value: 'score', label: 'Solo Score', desc: 'Total por hoyo' },
  { value: 'stats', label: 'Stats', desc: 'Score + fairway/GIR/putts' },
  { value: 'shots', label: 'Tiro a Tiro', desc: 'Cada tiro individual' },
];

export default function NewRoundPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [date, setDate] = useState(getTodayISO());
  const [courseId, setCourseId] = useState('');
  const [holesPlayed, setHolesPlayed] = useState<9 | 18>(18);
  const [courses, setCourses] = useState<Course[]>([]);

  // Step 2
  const [playerSelections, setPlayerSelections] = useState<PlayerSelection[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  // Step 3
  const [round, setRound] = useState<Round | null>(null);
  const [roundPlayers, setRoundPlayers] = useState<RoundPlayer[]>([]);
  const [courseHoles, setCourseHoles] = useState<CourseHole[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [c, p] = await Promise.all([getCourses(), getPlayers()]);
        setCourses(c);
        setPlayers(p);
        setPlayerSelections(p.map(pl => ({ playerId: pl.id, selected: false, trackingLevel: 'score' })));
        if (c.length > 0) setCourseId(c[0].id);
      } catch {
        toast.error('Error al cargar datos');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const goToStep2 = () => {
    if (!courseId) { toast.error('Seleccioná una cancha'); return; }
    setStep(2);
  };

  const goToStep3 = async () => {
    const selected = playerSelections.filter(p => p.selected);
    if (selected.length === 0) { toast.error('Seleccioná al menos un jugador'); return; }

    setSaving(true);
    try {
      const newRound = await addRound({ date, courseId, holesPlayed, status: 'in_progress' });
      const newRoundPlayers = await addRoundPlayers(
        selected.map(s => ({ roundId: newRound.id, playerId: s.playerId, trackingLevel: s.trackingLevel }))
      );
      const holes = await getHolesForCourse(courseId);

      setCourseHoles(holes);
      setRound(newRound);
      setRoundPlayers(newRoundPlayers);
      setStep(3);
    } catch {
      toast.error('Error al crear la ronda');
    } finally {
      setSaving(false);
    }
  };

  const togglePlayer = (playerId: string) => {
    setPlayerSelections(prev =>
      prev.map(p => p.playerId === playerId ? { ...p, selected: !p.selected } : p)
    );
  };

  const setTracking = (playerId: string, level: TrackingLevel) => {
    setPlayerSelections(prev =>
      prev.map(p => p.playerId === playerId ? { ...p, trackingLevel: level } : p)
    );
  };

  if (step === 3 && round && roundPlayers.length > 0) {
    return (
      <AppShell>
        <PlayRound
          round={round}
          roundPlayers={roundPlayers}
          courseHoles={courseHoles}
          players={players}
          onComplete={() => router.push(`/rounds/${round.id}`)}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-4 md:p-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-display text-golf-gold">Nueva Ronda</h1>
          <p className="text-golf-muted mt-1 text-sm">Paso {step} de 3</p>
          <div className="flex gap-2 mt-3">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ background: s <= step ? '#1a6b3c' : '#2a4530' }}
              />
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" message="Cargando..." />
          </div>
        ) : (
          <>
            {step === 1 && (
              <div className="rounded-xl p-5 space-y-5" style={{ background: '#1a2e20', border: '1px solid #2a4530' }}>
                <h2 className="text-xl font-display text-golf-text">Configuración</h2>

                <div>
                  <label className="block text-sm text-golf-muted mb-1">Fecha</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="px-4 py-3 rounded-lg text-golf-text focus:outline-none focus:ring-2 focus:ring-golf-green text-base"
                    style={{ background: '#223829', border: '1px solid #2a4530', colorScheme: 'dark', fontSize: '16px' }}
                  />
                </div>

                <div>
                  <label className="block text-sm text-golf-muted mb-1">Cancha</label>
                  {courses.length === 0 ? (
                    <p className="text-golf-muted text-sm">
                      No hay canchas registradas.{' '}
                      <a href="/admin" className="text-golf-gold underline">Crear cancha →</a>
                    </p>
                  ) : (
                    <select
                      value={courseId}
                      onChange={e => setCourseId(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg text-golf-text focus:outline-none focus:ring-2 focus:ring-golf-green"
                      style={{ background: '#223829', border: '1px solid #2a4530', fontSize: '16px' }}
                    >
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.numberOfHoles} hoyos)</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-golf-muted mb-2">Hoyos a jugar</label>
                  <div className="flex gap-3">
                    {([9, 18] as const).map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setHolesPlayed(n)}
                        className="flex-1 py-3 rounded-lg text-sm font-medium transition-all"
                        style={
                          holesPlayed === n
                            ? { background: '#1a6b3c', color: '#e8f0e9', border: '1px solid #2d9e5f' }
                            : { background: '#223829', color: '#8aad8f', border: '1px solid #2a4530' }
                        }
                      >
                        {n} hoyos
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={goToStep2}
                  disabled={!courseId}
                  className="w-full py-3 rounded-lg text-white font-semibold transition-all"
                  style={{ background: courseId ? '#1a6b3c' : '#0f4a28', opacity: courseId ? 1 : 0.6, minHeight: '48px' }}
                >
                  Siguiente: Jugadores →
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="rounded-xl p-5 space-y-4" style={{ background: '#1a2e20', border: '1px solid #2a4530' }}>
                <h2 className="text-xl font-display text-golf-text">Seleccionar Jugadores</h2>

                <div className="space-y-3">
                  {playerSelections.map(ps => {
                    const player = players.find(p => p.id === ps.playerId);
                    if (!player) return null;
                    return (
                      <div
                        key={ps.playerId}
                        className="rounded-xl p-4"
                        style={{
                          background: '#223829',
                          border: `1px solid ${ps.selected ? '#1a6b3c' : '#2a4530'}`,
                        }}
                      >
                        <button
                          onClick={() => togglePlayer(ps.playerId)}
                          className="flex items-center gap-3 w-full text-left"
                          style={{ minHeight: '44px' }}
                        >
                          <span
                            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                            style={{
                              background: ps.selected ? '#1a6b3c' : 'transparent',
                              border: `2px solid ${ps.selected ? '#1a6b3c' : '#2a4530'}`,
                              minWidth: '20px', minHeight: '20px',
                            }}
                          >
                            {ps.selected && <span className="text-white text-xs leading-none">✓</span>}
                          </span>
                          <span className="text-golf-text font-medium">{player.name}</span>
                        </button>

                        {ps.selected && (
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {TRACKING_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => setTracking(ps.playerId, opt.value)}
                                className="py-2 px-1 rounded-lg text-center transition-all"
                                style={
                                  ps.trackingLevel === opt.value
                                    ? { background: '#1a6b3c', color: '#e8f0e9', border: '1px solid #2d9e5f' }
                                    : { background: '#1a2e20', color: '#8aad8f', border: '1px solid #2a4530' }
                                }
                              >
                                <div className="text-xs font-medium">{opt.label}</div>
                                <div className="text-xs opacity-70 mt-0.5 hidden sm:block">{opt.desc}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 rounded-lg font-medium text-golf-muted"
                    style={{ background: '#223829', border: '1px solid #2a4530', minHeight: '48px' }}
                  >
                    ← Atrás
                  </button>
                  <button
                    onClick={goToStep3}
                    disabled={saving}
                    className="flex-1 py-3 rounded-lg text-white font-semibold"
                    style={{ background: '#1a6b3c', minHeight: '48px', opacity: saving ? 0.7 : 1 }}
                  >
                    {saving ? 'Creando...' : 'Comenzar Ronda →'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
