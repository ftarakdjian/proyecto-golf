'use client';

import AppShell from '@/components/AppShell';
import { useEffect, useState } from 'react';
import { getRounds, getPlayers, getCourses } from '@/lib/storage';
import { Round, Player, Course } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    setRounds(getRounds());
    setPlayers(getPlayers());
    setCourses(getCourses());
  }, []);

  const completedRounds = rounds.filter(r => r.status === 'completed');
  const inProgressRounds = rounds.filter(r => r.status === 'in_progress');
  const recentRounds = [...rounds].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const getCourse = (id: string) => courses.find(c => c.id === id);

  return (
    <AppShell>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display text-golf-gold">Dashboard</h1>
          <p className="text-golf-muted mt-1">Bienvenido al sistema de seguimiento de golf</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total de Rondas', value: rounds.length, icon: '🏌️' },
            { label: 'Rondas Completadas', value: completedRounds.length, icon: '✅' },
            { label: 'En Progreso', value: inProgressRounds.length, icon: '⏳' },
            { label: 'Jugadores', value: players.length, icon: '👥' },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-xl p-5"
              style={{ background: '#1a2e20', border: '1px solid #2a4530' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{stat.icon}</span>
                <span className="text-3xl font-display text-golf-gold">{stat.value}</span>
              </div>
              <p className="text-golf-muted text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link
            href="/rounds/new"
            className="flex items-center gap-4 rounded-xl p-5 transition-all duration-200 hover:opacity-90"
            style={{ background: '#1a6b3c', border: '1px solid #2d9e5f' }}
          >
            <span className="text-3xl">⛳</span>
            <div>
              <p className="font-semibold text-golf-text">Nueva Ronda</p>
              <p className="text-sm text-golf-gold">Comenzar a jugar</p>
            </div>
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-4 rounded-xl p-5 transition-all duration-200 hover:opacity-90"
            style={{ background: '#1a2e20', border: '1px solid #2a4530' }}
          >
            <span className="text-3xl">⚙️</span>
            <div>
              <p className="font-semibold text-golf-text">Administración</p>
              <p className="text-sm text-golf-muted">Jugadores, palos y canchas</p>
            </div>
          </Link>
        </div>

        {/* Recent rounds */}
        {inProgressRounds.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-display text-golf-text mb-3">Rondas en Progreso</h2>
            <div className="space-y-2">
              {inProgressRounds.map(round => (
                <Link
                  key={round.id}
                  href={`/rounds/${round.id}`}
                  className="flex items-center justify-between rounded-xl px-5 py-4 transition-all hover:opacity-90"
                  style={{ background: '#223829', border: '1px solid #2a4530' }}
                >
                  <div>
                    <p className="text-golf-text font-medium">{getCourse(round.courseId)?.name || 'Sin cancha'}</p>
                    <p className="text-golf-muted text-sm">{formatDate(round.date)} &bull; {round.holesPlayed} hoyos</p>
                  </div>
                  <span className="text-golf-gold text-sm font-medium">Continuar →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {recentRounds.length > 0 && (
          <div>
            <h2 className="text-xl font-display text-golf-text mb-3">Rondas Recientes</h2>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2a4530' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#223829' }}>
                    <th className="text-left px-5 py-3 text-golf-muted text-sm font-medium">Fecha</th>
                    <th className="text-left px-5 py-3 text-golf-muted text-sm font-medium">Cancha</th>
                    <th className="text-left px-5 py-3 text-golf-muted text-sm font-medium">Hoyos</th>
                    <th className="text-left px-5 py-3 text-golf-muted text-sm font-medium">Estado</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {recentRounds.map((round, idx) => (
                    <tr
                      key={round.id}
                      style={{
                        background: idx % 2 === 0 ? '#1a2e20' : '#1e3424',
                        borderTop: '1px solid #2a4530',
                      }}
                    >
                      <td className="px-5 py-3 text-golf-text text-sm">{formatDate(round.date)}</td>
                      <td className="px-5 py-3 text-golf-text text-sm">{getCourse(round.courseId)?.name || '-'}</td>
                      <td className="px-5 py-3 text-golf-muted text-sm">{round.holesPlayed}</td>
                      <td className="px-5 py-3">
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
                      <td className="px-5 py-3 text-right">
                        <Link href={`/rounds/${round.id}`} className="text-golf-gold text-sm hover:underline">
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {rounds.length === 0 && (
          <div className="text-center py-16 text-golf-muted">
            <p className="text-5xl mb-4">⛳</p>
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
        )}
      </div>
    </AppShell>
  );
}
