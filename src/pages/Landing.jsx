import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import InfinityMark from '@/components/InfinityMark';

// Landing minimalista — siempre en claro, independiente del tema de la app.
const INK = '42,18,26';
const BG = '#f8f3ea';        // intermedio entre #f6f0e4 y #faf7f0
const ACCENT = '#38101d';    // vino más oscuro — botón y manifesto
const ON_ACCENT = '#f5ede0';

export default function Landing() {
  const navigate = useNavigate();
  const [state, setState] = useState('idle'); // idle | form | sending | done
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(clean)) {
      setError('Escribe un email válido');
      return;
    }
    setState('sending');
    setError('');

    // Si el email ya tiene cuenta, lo llevamos directo al login.
    try {
      const { data: registered, error: rpcErr } = await supabase
        .rpc('email_is_registered', { check_email: clean });
      if (!rpcErr && registered === true) {
        navigate('/login', { state: { email: clean, existing: true } });
        return;
      }
    } catch { /* sin detección disponible — continuamos al waitlist */ }

    const { error: err } = await supabase.from('waitlist').insert({ email: clean });
    if (err && err.code !== '23505') {
      console.error('waitlist error:', err);
      setError('No se pudo enviar. Inténtalo de nuevo.');
      setState('form');
      return;
    }
    setState('done');
  };

  return (
    <div
      className="flex flex-col justify-between"
      style={{
        minHeight: '100dvh',
        background: BG,
        paddingTop: 'calc(env(safe-area-inset-top) + 24px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 28px)',
      }}
    >
      {/* Cabecera — marca a la izquierda, acceso a la derecha */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="flex items-center justify-between gap-4 px-6 max-w-3xl mx-auto w-full"
      >
        <div className="flex items-center gap-3">
          <InfinityMark size={20} color={`rgba(${INK},0.92)`} />
          <span style={{
            fontFamily: '"DM Sans", system-ui, sans-serif',
            fontWeight: 400,
            fontSize: 15,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: `rgba(${INK},0.92)`,
          }}>
            Olympia
          </span>
        </div>

        <div className="flex flex-col items-end flex-shrink-0">
          {state === 'done' ? (
            <p style={{ fontSize: 12, color: `rgba(${INK},0.7)` }}>
              Pronto tendrás noticias.
            </p>
          ) : state === 'idle' ? (
            <button
              onClick={() => setState('form')}
              className="px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-transform active:scale-95"
              style={{ background: ACCENT, color: ON_ACCENT }}
            >
              Solicitar acceso
            </button>
          ) : (
            <form onSubmit={submit} className="flex items-center gap-1.5">
              <input
                type="email"
                autoFocus
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="tu@email.com"
                className="w-[170px] px-3.5 py-2.5 rounded-lg text-[13px] focus:outline-none"
                style={{
                  background: 'transparent',
                  border: `1px solid rgba(${INK},0.25)`,
                  color: `rgba(${INK},0.95)`,
                }}
              />
              <button
                type="submit"
                disabled={state === 'sending'}
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 disabled:opacity-60"
                style={{ background: ACCENT, color: ON_ACCENT }}
                aria-label="Enviar"
              >
                {state === 'sending'
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          )}
          {error && (
            <p style={{ fontSize: 11, color: '#b91c1c', marginTop: 6 }}>{error}</p>
          )}
        </div>
      </motion.div>

      {/* Manifesto — abajo a la izquierda (texto pendiente, lo redactará Jorge) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
        className="px-6 max-w-3xl mx-auto w-full"
      >
        <p style={{
          fontSize: 12,
          lineHeight: 1.7,
          color: ACCENT,
          maxWidth: 260,
        }}>
        </p>
      </motion.div>
    </div>
  );
}
