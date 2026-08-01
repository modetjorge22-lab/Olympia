import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import InfinityMark from '@/components/InfinityMark';

const glass = {
  background: 'var(--glass-bg)',
  backdropFilter: 'blur(24px) saturate(160%)',
  WebkitBackdropFilter: 'blur(24px) saturate(160%)',
  border: '1px solid var(--glass-border)',
  boxShadow: 'var(--glass-shadow)',
};

// Pantalla a la que llega el usuario desde el enlace del email de recuperación.
// Supabase ya ha creado una sesión de recuperación al abrir el enlace, así que
// aquí solo hay que fijar la nueva contraseña.
export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return; }
    if (password !== repeat) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true); setError('');
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => navigate('/actividad', { replace: true }), 1600);
    } catch (err) {
      setError(err.message === 'Auth session missing!'
        ? 'El enlace ha caducado. Pide uno nuevo desde “¿Olvidaste tu contraseña?”.'
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: 'var(--bg)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4"><InfinityMark size={32} /></div>
          <h1 style={{
            fontSize: 22, fontWeight: 400, letterSpacing: '0.32em',
            textTransform: 'uppercase', color: 'rgba(var(--ink),0.95)',
          }}>
            Olympia
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: 'rgba(var(--ink),0.5)' }}>
            Elige una contraseña nueva
          </p>
        </div>

        <div className="rounded-3xl p-6" style={glass}>
          {done ? (
            <div className="text-center py-4">
              <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                <Check className="w-5 h-5" style={{ color: 'var(--on-accent)' }} />
              </div>
              <p className="text-[14px]" style={{ color: 'rgba(var(--ink),0.9)' }}>Contraseña actualizada</p>
              <p className="text-[12px] mt-1" style={{ color: 'rgba(var(--ink),0.5)' }}>Entrando en Olympia…</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              {[['Nueva contraseña', password, setPassword], ['Repetir contraseña', repeat, setRepeat]].map(([label, val, set]) => (
                <div key={label}>
                  <label className="block text-[12px] mb-1.5" style={{ color: 'rgba(var(--ink),0.5)' }}>{label}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(var(--ink),0.4)' }} />
                    <input
                      type="password" value={val} required minLength={6}
                      onChange={e => { set(e.target.value); setError(''); }}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 text-[14px]"
                      style={{
                        background: 'rgba(var(--ink),0.06)',
                        border: '1px solid rgba(var(--ink),0.12)',
                        borderRadius: 12,
                        color: 'rgba(var(--ink),0.95)',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              ))}

              {error && (
                <div className="rounded-xl px-4 py-3 text-[13px]"
                  style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: 'var(--danger)' }}>
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-[14px] mt-1 disabled:opacity-60"
                style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Guardar contraseña <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
