'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveSession } from '@/lib/storage';
import { USERS, USER_NAMES } from '@/lib/users';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('Chechu');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const user = USERS[username];
      if (user && user.password === password) {
        saveSession(username, user.role);
        router.push('/dashboard');
      } else {
        toast.error('Contraseña incorrecta');
        setLoading(false);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1a14' }}>
      <div className="w-full max-w-md px-8">
        <div className="text-center mb-10">
          <div className="text-6xl mb-4">⛳</div>
          <h1 className="text-4xl font-display text-golf-gold mb-1">Golf Tracker</h1>
          <p className="text-golf-muted text-sm tracking-widest uppercase">Tarakdjian</p>
        </div>

        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{ background: '#1a2e20', border: '1px solid #2a4530', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
        >
          <h2 className="text-xl font-display text-golf-text mb-6">Iniciar Sesión</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-golf-muted mb-1 font-medium">Usuario</label>
              <select
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-golf-text focus:outline-none focus:ring-2 focus:ring-golf-green"
                style={{ background: '#223829', border: '1px solid #2a4530', fontSize: '16px' }}
              >
                {USER_NAMES.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-golf-muted mb-1 font-medium">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-lg text-golf-text placeholder-golf-muted focus:outline-none focus:ring-2 focus:ring-golf-green"
                style={{ background: '#223829', border: '1px solid #2a4530' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-white transition-all duration-200 mt-2"
              style={{ background: loading ? '#0f4a28' : '#1a6b3c', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-golf-muted text-xs mt-8">
          Club de Golf &bull; Sistema Privado
        </p>
      </div>
    </div>
  );
}
