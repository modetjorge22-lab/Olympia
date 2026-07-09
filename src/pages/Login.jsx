import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import InfinityMark from '@/components/InfinityMark';

const glass = {
  background: 'var(--glass-bg)',
  backdropFilter: 'blur(24px) saturate(160%)',
  WebkitBackdropFilter: 'blur(24px) saturate(160%)',
  border: '1px solid var(--glass-border)',
  boxShadow: 'var(--glass-shadow)',
};

const inputStyle = {
  background: 'rgba(var(--ink),0.06)',
  border: '1px solid rgba(var(--ink),0.12)',
  borderRadius: 12,
  color: 'rgba(var(--ink),0.95)',
  outline: 'none',
  transition: 'border-color 0.2s',
};

function Field({ icon: Icon, label, ...props }) {
  return (
    <div>
      <label className="block text-[12px] mb-1.5" style={{ color: 'rgba(var(--ink),0.5)' }}>{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(var(--ink),0.4)' }} />
        <input
          className="w-full pl-10 pr-4 py-3 text-[14px]"
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = 'rgba(var(--accent-rgb),0.6)'}
          onBlur={e => e.target.style.borderColor = 'rgba(var(--ink),0.12)'}
          {...props}
        />
      </div>
    </div>
  );
}

export default function Login() {
  const { signInWithEmail, signInWithGoogle, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, fullName);
        setSuccess('¡Cuenta creada! Revisa tu email para confirmar.');
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos' : err.message);
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
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.4 }}
            className="flex justify-center mb-4"
          >
            <InfinityMark size={32} />
          </motion.div>
          <h1 style={{
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: 'rgba(var(--ink),0.95)',
          }}>
            Olympia
          </h1>
          <p className="mt-2 text-[14px]" style={{ color: 'rgba(var(--ink),0.5)' }}>
            {isSignUp ? 'Crea tu cuenta' : 'Inicia sesión para continuar'}
          </p>
        </div>

        {/* Card de vidrio */}
        <div className="rounded-3xl p-6" style={glass}>
          {/* Google */}
          <button
            onClick={signInWithGoogle}
            className="w-full font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-3 mb-4 text-[14px]"
            style={{ background: 'rgba(255,255,255,0.95)', color: '#18181b' }}
          >
            <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: 'rgba(var(--ink),0.1)' }} />
            <span className="text-[11px]" style={{ color: 'rgba(var(--ink),0.4)' }}>o con email</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(var(--ink),0.1)' }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && (
              <Field
                icon={User} label="Nombre completo" type="text"
                value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Tu nombre" required
              />
            )}
            <Field
              icon={Mail} label="Email" type="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com" required
            />
            <Field
              icon={Lock} label="Contraseña" type="password"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required minLength={6}
            />

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl px-4 py-3 text-[13px]"
                style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', color: 'var(--danger)' }}>
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl px-4 py-3 text-[13px]"
                style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)', color: 'var(--success)' }}>
                {success}
              </motion.div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 group text-[14px] mt-1 disabled:opacity-60"
              style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 text-center" style={{ borderTop: '1px solid rgba(var(--ink),0.1)' }}>
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess(''); }}
              className="text-[13px] transition-opacity hover:opacity-80"
              style={{ color: 'rgba(var(--ink),0.55)' }}
            >
              {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
            </button>
          </div>
        </div>

        <p className="text-center mt-6 text-[12px]">
          <Link to="/" style={{ color: 'rgba(var(--ink),0.4)' }}>← Volver a la página principal</Link>
        </p>
      </motion.div>
    </div>
  );
}
