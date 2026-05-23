'use client';

import AppShell from '@/components/AppShell';
import { useState, useEffect } from 'react';
import { Player, Club, Course, CourseHole } from '@/lib/types';
import {
  getPlayers, addPlayer, deletePlayer,
  getClubs, addClub, deleteClub,
  getCourses, addCourse, updateCourse, deleteCourse,
  getHolesForCourse, saveHolesForCourse,
} from '@/lib/storage';
import { generateId } from '@/lib/utils';
import toast from 'react-hot-toast';

type Tab = 'jugadores' | 'palos' | 'canchas';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('jugadores');

  return (
    <AppShell>
      <div className="p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-display text-golf-gold">Administración</h1>
          <p className="text-golf-muted mt-1 text-sm">Gestión de jugadores, palos y canchas</p>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 mb-6 rounded-xl p-1 w-full md:w-auto"
          style={{ background: '#1a2e20', border: '1px solid #2a4530' }}
        >
          {(['jugadores', 'palos', 'canchas'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 md:flex-none px-4 md:px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all duration-150"
              style={
                tab === t
                  ? { background: '#1a6b3c', color: '#e8f0e9' }
                  : { color: '#8aad8f' }
              }
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'jugadores' && <JugadoresTab />}
        {tab === 'palos' && <PalosTab />}
        {tab === 'canchas' && <CanchasTab />}
      </div>
    </AppShell>
  );
}

function JugadoresTab() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState('');

  useEffect(() => { setPlayers(getPlayers()); }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addPlayer({ id: generateId(), name: name.trim(), createdAt: new Date().toISOString() });
    setPlayers(getPlayers());
    setName('');
    toast.success('Jugador agregado');
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar este jugador?')) return;
    deletePlayer(id);
    setPlayers(getPlayers());
    toast.success('Jugador eliminado');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-xl p-5" style={{ background: '#1a2e20', border: '1px solid #2a4530' }}>
        <h2 className="text-lg font-display text-golf-text mb-4">Jugadores</h2>
        <div className="space-y-2">
          {players.map(p => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3 rounded-lg" style={{ background: '#223829' }}>
              <span className="text-golf-text">{p.name}</span>
              <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300 text-sm transition-colors px-2 py-1" style={{ minHeight: '44px' }}>
                Eliminar
              </button>
            </div>
          ))}
          {players.length === 0 && <p className="text-golf-muted text-sm">Sin jugadores</p>}
        </div>
      </div>

      <div className="rounded-xl p-5" style={{ background: '#1a2e20', border: '1px solid #2a4530' }}>
        <h2 className="text-lg font-display text-golf-text mb-4">Agregar Jugador</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <label className="block text-sm text-golf-muted mb-1">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nombre del jugador"
              className="w-full px-4 py-3 rounded-lg text-golf-text focus:outline-none focus:ring-2 focus:ring-golf-green text-base"
              style={{ background: '#223829', border: '1px solid #2a4530' }}
            />
          </div>
          <button
            type="submit"
            className="px-5 py-3 rounded-lg text-white font-medium transition-colors"
            style={{ background: '#1a6b3c', minHeight: '44px' }}
          >
            Agregar
          </button>
        </form>
      </div>
    </div>
  );
}

function PalosTab() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [name, setName] = useState('');

  useEffect(() => { setClubs(getClubs()); }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addClub({ id: generateId(), name: name.trim() });
    setClubs(getClubs());
    setName('');
    toast.success('Palo agregado');
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar este palo?')) return;
    deleteClub(id);
    setClubs(getClubs());
    toast.success('Palo eliminado');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-xl p-5" style={{ background: '#1a2e20', border: '1px solid #2a4530' }}>
        <h2 className="text-lg font-display text-golf-text mb-4">Palos</h2>
        <div className="space-y-2">
          {clubs.map(c => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3 rounded-lg" style={{ background: '#223829' }}>
              <span className="text-golf-text">🏌️ {c.name}</span>
              <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300 text-sm transition-colors px-2 py-1" style={{ minHeight: '44px' }}>
                Eliminar
              </button>
            </div>
          ))}
          {clubs.length === 0 && <p className="text-golf-muted text-sm">Sin palos</p>}
        </div>
      </div>

      <div className="rounded-xl p-5" style={{ background: '#1a2e20', border: '1px solid #2a4530' }}>
        <h2 className="text-lg font-display text-golf-text mb-4">Agregar Palo</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <label className="block text-sm text-golf-muted mb-1">Nombre del palo</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: 4 Iron"
              className="w-full px-4 py-3 rounded-lg text-golf-text focus:outline-none focus:ring-2 focus:ring-golf-green text-base"
              style={{ background: '#223829', border: '1px solid #2a4530' }}
            />
          </div>
          <button
            type="submit"
            className="px-5 py-3 rounded-lg text-white font-medium"
            style={{ background: '#1a6b3c', minHeight: '44px' }}
          >
            Agregar
          </button>
        </form>
      </div>
    </div>
  );
}

type CoursePanel = { type: 'view' | 'edit' | 'holes'; courseId: string } | null;

function CanchasTab() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [name, setName] = useState('');
  const [numHoles, setNumHoles] = useState<9 | 18>(18);
  // Panel shown below the list
  const [panel, setPanel] = useState<CoursePanel>(null);
  // Newly created course to auto-open holes editor
  const [newCoursePanel, setNewCoursePanel] = useState<Course | null>(null);

  useEffect(() => { setCourses(getCourses()); }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const c: Course = { id: generateId(), name: name.trim(), numberOfHoles: numHoles };
    addCourse(c);
    setCourses(getCourses());
    setName('');
    setNewCoursePanel(c);
    setPanel(null);
    toast.success('Cancha creada. Cargá los hoyos.');
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Eliminar esta cancha y todos sus hoyos?')) return;
    deleteCourse(id);
    setCourses(getCourses());
    if (panel?.courseId === id) setPanel(null);
    if (newCoursePanel?.id === id) setNewCoursePanel(null);
    toast.success('Cancha eliminada');
  };

  const openPanel = (type: 'view' | 'edit', courseId: string) => {
    if (panel?.courseId === courseId && panel.type === type) {
      setPanel(null);
    } else {
      setPanel({ type, courseId });
      setNewCoursePanel(null);
    }
  };

  const handleCourseSaved = (updated: Course) => {
    setCourses(getCourses());
    setPanel({ type: 'view', courseId: updated.id });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* List */}
        <div className="rounded-xl p-5" style={{ background: '#1a2e20', border: '1px solid #2a4530' }}>
          <h2 className="text-lg font-display text-golf-text mb-4">Canchas</h2>
          <div className="space-y-2">
            {courses.map(c => (
              <div key={c.id}>
                <div className="flex items-center justify-between px-4 py-3 rounded-lg" style={{ background: '#223829' }}>
                  <div>
                    <span className="text-golf-text font-medium">{c.name}</span>
                    <span className="text-golf-muted text-sm ml-2">({c.numberOfHoles} hoyos)</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openPanel('view', c.id)}
                      className="text-golf-gold text-xs px-2 py-1 rounded transition-colors hover:underline"
                      style={{ minHeight: '44px' }}
                    >
                      Hoyos
                    </button>
                    <button
                      onClick={() => openPanel('edit', c.id)}
                      className="text-golf-muted text-xs px-2 py-1 rounded transition-colors hover:text-golf-text"
                      style={{ minHeight: '44px' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded"
                      style={{ minHeight: '44px' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {courses.length === 0 && <p className="text-golf-muted text-sm">Sin canchas registradas</p>}
          </div>
        </div>

        {/* New course form */}
        <div className="rounded-xl p-5" style={{ background: '#1a2e20', border: '1px solid #2a4530' }}>
          <h2 className="text-lg font-display text-golf-text mb-4">Nueva Cancha</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="block text-sm text-golf-muted mb-1">Nombre</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nombre de la cancha"
                className="w-full px-4 py-3 rounded-lg text-golf-text focus:outline-none focus:ring-2 focus:ring-golf-green text-base"
                style={{ background: '#223829', border: '1px solid #2a4530' }}
              />
            </div>
            <div>
              <label className="block text-sm text-golf-muted mb-2">Cantidad de hoyos</label>
              <div className="flex gap-3">
                {([9, 18] as const).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNumHoles(n)}
                    className="flex-1 py-3 rounded-lg text-sm font-medium transition-all"
                    style={
                      numHoles === n
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
              type="submit"
              className="w-full py-3 rounded-lg text-white font-medium"
              style={{ background: '#1a6b3c', minHeight: '44px' }}
            >
              Crear Cancha
            </button>
          </form>
        </div>
      </div>

      {/* Panel: holes editor for new course */}
      {newCoursePanel && (
        <div className="rounded-xl p-5" style={{ background: '#1a2e20', border: '1px solid #c9a84c' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display text-golf-gold">Configurar hoyos: {newCoursePanel.name}</h2>
            <button onClick={() => setNewCoursePanel(null)} className="text-golf-muted hover:text-golf-text text-sm" style={{ minHeight: '44px', padding: '0 8px' }}>
              Cerrar ✕
            </button>
          </div>
          <HolesEditor course={newCoursePanel} onSave={() => setNewCoursePanel(null)} />
        </div>
      )}

      {/* Panel: edit course metadata */}
      {panel?.type === 'edit' && (() => {
        const course = courses.find(c => c.id === panel.courseId);
        if (!course) return null;
        return (
          <CourseEditForm
            course={course}
            onSave={handleCourseSaved}
            onCancel={() => setPanel(null)}
          />
        );
      })()}

      {/* Panel: view/edit holes */}
      {panel?.type === 'view' && (() => {
        const course = courses.find(c => c.id === panel.courseId);
        if (!course) return null;
        return (
          <div className="rounded-xl p-5" style={{ background: '#1a2e20', border: '1px solid #2a4530' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display text-golf-text">Hoyos: {course.name}</h2>
              <button onClick={() => setPanel(null)} className="text-golf-muted hover:text-golf-text text-sm" style={{ minHeight: '44px', padding: '0 8px' }}>
                Cerrar ✕
              </button>
            </div>
            <HolesEditor course={course} />
          </div>
        );
      })()}
    </div>
  );
}

function CourseEditForm({ course, onSave, onCancel }: { course: Course; onSave: (c: Course) => void; onCancel: () => void }) {
  const [name, setName] = useState(course.name);
  const [numHoles, setNumHoles] = useState<9 | 18>(course.numberOfHoles as 9 | 18);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const updatedCourse: Course = { ...course, name: name.trim(), numberOfHoles: numHoles };
    updateCourse(updatedCourse);

    // If numberOfHoles increased, add missing holes
    const existing = getHolesForCourse(course.id);
    if (numHoles > existing.length) {
      const newHoles: CourseHole[] = [];
      for (let i = existing.length + 1; i <= numHoles; i++) {
        newHoles.push({
          id: generateId(),
          courseId: course.id,
          holeNumber: i,
          par: 4,
          description: '',
          yards: 0,
        });
      }
      saveHolesForCourse(course.id, [...existing, ...newHoles]);
    } else if (numHoles < existing.length) {
      // Truncate: keep only holes 1..numHoles
      saveHolesForCourse(course.id, existing.filter(h => h.holeNumber <= numHoles));
    }

    toast.success('Cancha actualizada');
    onSave(updatedCourse);
  };

  return (
    <div className="rounded-xl p-5" style={{ background: '#1a2e20', border: '1px solid #c9a84c' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-display text-golf-gold">Editar cancha</h2>
        <button onClick={onCancel} className="text-golf-muted hover:text-golf-text text-sm" style={{ minHeight: '44px', padding: '0 8px' }}>
          Cancelar ✕
        </button>
      </div>
      <form onSubmit={handleSave} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm text-golf-muted mb-1">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-golf-text focus:outline-none focus:ring-2 focus:ring-golf-green text-base"
            style={{ background: '#223829', border: '1px solid #2a4530' }}
          />
        </div>
        <div>
          <label className="block text-sm text-golf-muted mb-2">Cantidad de hoyos</label>
          <div className="flex gap-3">
            {([9, 18] as const).map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setNumHoles(n)}
                className="flex-1 py-3 rounded-lg text-sm font-medium transition-all"
                style={
                  numHoles === n
                    ? { background: '#1a6b3c', color: '#e8f0e9', border: '1px solid #2d9e5f' }
                    : { background: '#223829', color: '#8aad8f', border: '1px solid #2a4530' }
                }
              >
                {n} hoyos
              </button>
            ))}
          </div>
          {numHoles < (course.numberOfHoles as number) && (
            <p className="text-xs text-red-400 mt-1">⚠ Reducir hoyos eliminará los hoyos extra.</p>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            className="px-5 py-3 rounded-lg text-white font-medium"
            style={{ background: '#1a6b3c', minHeight: '44px' }}
          >
            Guardar cambios
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-3 rounded-lg font-medium text-golf-muted"
            style={{ background: '#223829', border: '1px solid #2a4530', minHeight: '44px' }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

function HolesEditor({ course, onSave }: { course: Course; onSave?: () => void }) {
  const [holes, setHoles] = useState<CourseHole[]>([]);

  useEffect(() => {
    const existing = getHolesForCourse(course.id);
    if (existing.length > 0) {
      setHoles(existing);
    } else {
      setHoles(
        Array.from({ length: course.numberOfHoles }, (_, i) => ({
          id: generateId(),
          courseId: course.id,
          holeNumber: i + 1,
          par: 4 as 3 | 4 | 5,
          description: '',
          yards: 0,
        }))
      );
    }
  }, [course.id, course.numberOfHoles]);

  const updateHole = (index: number, field: keyof CourseHole, value: string | number) => {
    setHoles(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  const handleSave = () => {
    saveHolesForCourse(course.id, holes);
    toast.success('Hoyos guardados');
    onSave?.();
  };

  return (
    <div className="mt-2">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#223829' }}>
              <th className="text-left px-3 py-2 text-golf-muted font-medium w-12">Hoyo</th>
              <th className="text-left px-3 py-2 text-golf-muted font-medium w-20">Par</th>
              <th className="text-left px-3 py-2 text-golf-muted font-medium w-24">Yardas</th>
              <th className="text-left px-3 py-2 text-golf-muted font-medium">Descripción</th>
            </tr>
          </thead>
          <tbody>
            {holes.map((hole, idx) => (
              <tr key={hole.id} style={{ borderTop: '1px solid #2a4530' }}>
                <td className="px-3 py-2 text-golf-gold font-semibold">{hole.holeNumber}</td>
                <td className="px-3 py-2">
                  <select
                    value={hole.par}
                    onChange={e => updateHole(idx, 'par', Number(e.target.value))}
                    className="px-2 py-2 rounded text-golf-text text-sm focus:outline-none w-full"
                    style={{ background: '#223829', border: '1px solid #2a4530' }}
                  >
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={hole.yards || ''}
                    onChange={e => updateHole(idx, 'yards', Number(e.target.value))}
                    placeholder="0"
                    min={0}
                    className="w-full px-2 py-2 rounded text-golf-text text-sm focus:outline-none"
                    style={{ background: '#223829', border: '1px solid #2a4530', fontSize: '16px' }}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={hole.description}
                    onChange={e => updateHole(idx, 'description', e.target.value)}
                    placeholder="Descripción opcional"
                    className="w-full px-2 py-2 rounded text-golf-text text-sm focus:outline-none"
                    style={{ background: '#223829', border: '1px solid #2a4530', fontSize: '16px' }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={handleSave}
        className="mt-4 px-5 py-3 rounded-lg text-white font-medium"
        style={{ background: '#1a6b3c', minHeight: '44px' }}
      >
        Guardar Hoyos
      </button>
    </div>
  );
}
