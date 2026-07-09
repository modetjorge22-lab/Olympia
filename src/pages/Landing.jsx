import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, CalendarDays, Users, Trophy, ArrowRight, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import InfinityMark from '@/components/InfinityMark';

const glass = {
  background: 'var(--glass-bg)',
  backdropFilter: 'blur(24px) saturate(160%)',
  WebkitBackdropFilter: 'blur(24px) saturate(160%)',
  border: '1px solid var(--glass-border)',
  boxShadow: 'var(--glass-shadow)',
};

const FEATURES = [
  {
    icon: TrendingUp,
    title: 'Tu carga, clara',
    text: 'Horas de entrenamiento por semana, comparadas con tu media. Sincroniza Strava y Whoop.',
  },
  {
    icon: CalendarDays,
    title: 'Planifica la semana',
    text: 'Marca qué días entrenas y convierte cada plan en entrenamiento hecho con un toque.',
  },
  {
    icon: Users,
    title: 'Compite con tu grupo',
    text: 'Carrera mensual de horas con tu equipo: ranking, ritmo frente a la media y calendarios de todos.',
  },
  {
    icon: Trophy,
    title: 'Bate tus marcas',
    text: 'Registra tus récords personales y celébralos con el grupo cuando los superes.',
  },
];

export default function Landing() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | done | error
  const [errorMsg, setErrorMsg] = useState('');

  const join = async (e) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean || !/^\S+@\S+\.\S+$/.test(clean)) {
      setErrorMsg('Escribe un email válido');
      setState('error');
      return;
    }
    setState('sending');
    setErrorMsg('');
    const { error } = await supabase.from('waitlist').insert({ email: clean });
    if (error) {
      // 23505 = email ya apuntado → lo tratamos como éxito
      if (error.code === '23505') {
        setState('done');
      } else {
        console.error('waitlist error:', error);
        setErrorMsg('No se pudo guardar. Inténtalo de nuevo.');
        setState('error');
      }
      return;
    }
    setState('done');
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header flotante */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)', pointerEvents: 'none' }}>
        <div className="mx-auto max-w-lg px-3">
          <div className="flex items-center justify-between pl-4 pr-2" style={{ height: 52, borderRadius: 26, pointerEvents: 'auto', ...glass }}>
            <div className="flex items-center gap-2">
              <InfinityMark size={15} />
              <span style={{ fontSize: 13, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(var(--ink),0.92)' }}>
                Olympia
              </span>
            </div>
            <Link
              to="/login"
              className="text-[12px] font-semibold px-4 py-2 rounded-full transition-opacity hover:opacity-80"
              style={{ background: 'rgba(var(--ink),0.08)', border: '1px solid rgba(var(--ink),0.1)', color: 'rgba(var(--ink),0.92)' }}
            >
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 100px)', paddingBottom: 60 }}>
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="flex justify-center mb-5">
            <InfinityMark size={40} />
          </div>
          <h1 className="text-[32px] leading-[1.15] font-bold" style={{ color: 'rgba(var(--ink),0.95)' }}>
            Tu deporte y tu grupo,
            <br />
            <span style={{ color: 'var(--accent)' }}>en un solo lugar</span>
          </h1>
          <p className="text-[15px] mt-4 leading-relaxed" style={{ color: 'rgba(var(--ink),0.6)' }}>
            Olympia registra tus horas de entrenamiento y convierte
            el mes en una competición sana con tus compañeros.
          </p>
        </motion.section>

        {/* Waitlist */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="mt-8"
        >
          {state === 'done' ? (
            <div className="rounded-2xl p-5 text-center" style={glass}>
              <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                <Check className="w-5 h-5" style={{ color: 'var(--on-accent)' }} />
              </div>
              <p className="text-[15px] font-semibold" style={{ color: 'rgba(var(--ink),0.95)' }}>¡Estás dentro!</p>
              <p className="text-[13px] mt-1" style={{ color: 'rgba(var(--ink),0.55)' }}>
                Te avisaremos muy pronto para que pruebes Olympia.
              </p>
            </div>
          ) : (
            <form onSubmit={join} className="rounded-2xl p-2 flex items-center gap-2" style={glass}>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); if (state === 'error') setState('idle'); }}
                placeholder="tu@email.com"
                className="flex-1 min-w-0 bg-transparent px-3 py-2.5 text-[14px] focus:outline-none"
                style={{ color: 'rgba(var(--ink),0.95)' }}
              />
              <button
                type="submit"
                disabled={state === 'sending'}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold flex-shrink-0 disabled:opacity-60"
                style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
              >
                {state === 'sending'
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <>Unirme <ArrowRight className="w-3.5 h-3.5" /></>}
              </button>
            </form>
          )}
          {state === 'error' && errorMsg && (
            <p className="text-[12px] mt-2 px-2" style={{ color: 'var(--danger)' }}>{errorMsg}</p>
          )}
          {state !== 'done' && (
            <p className="text-[11px] mt-2.5 text-center" style={{ color: 'rgba(var(--ink),0.4)' }}>
              Apúntate a la lista y sé de los primeros en probarla.
            </p>
          )}
        </motion.section>

        {/* Features */}
        <section className="mt-12 space-y-2">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="flex items-start gap-4 py-4"
              style={{ borderTop: '1px solid rgba(var(--ink),0.1)' }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent)' }}>
                <Icon className="w-4.5 h-4.5" style={{ color: 'var(--on-accent)', width: 18, height: 18 }} />
              </div>
              <div>
                <p className="text-[15px] font-bold" style={{ color: 'rgba(var(--ink),0.95)' }}>{title}</p>
                <p className="text-[13px] mt-1 leading-relaxed" style={{ color: 'rgba(var(--ink),0.55)' }}>{text}</p>
              </div>
            </motion.div>
          ))}
        </section>

        {/* CTA final */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-[17px] font-bold" style={{ color: 'rgba(var(--ink),0.95)' }}>
            El deporte engancha más en equipo.
          </p>
          <button
            onClick={() => document.querySelector('input[type="email"]')?.focus()}
            className="mt-4 px-6 py-3 rounded-full text-[14px] font-bold"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            Quiero probar Olympia
          </button>
        </motion.section>

        {/* Footer */}
        <footer className="mt-16 pt-6 text-center" style={{ borderTop: '1px solid rgba(var(--ink),0.08)' }}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <InfinityMark size={10} />
            <span style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(var(--ink),0.5)' }}>
              Olympia
            </span>
          </div>
          <p className="text-[11px]" style={{ color: 'rgba(var(--ink),0.35)' }}>
            © 2026 Olympia · <Link to="/login" style={{ color: 'rgba(var(--ink),0.5)' }}>¿Ya tienes cuenta? Entra</Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
