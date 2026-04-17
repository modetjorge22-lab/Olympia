import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { useSearchParams } from 'react-router-dom';
import { User, Settings, Link2, LogOut, ChevronRight, BarChart3, Dumbbell, Check, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

const glassCard = {
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  background: 'rgba(17, 19, 26, 0.65)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
};

export default function Mas() {
  const { user, signOut } = useAuth();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const [searchParams] = useSearchParams();

  const [stravaConnected, setStravaConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [stravaStatus, setStravaStatus] = useState(null);

  useEffect(() => {
    const stravaParam = searchParams.get('strava');
    if (stravaParam === 'success') setStravaStatus('success');
    else if (stravaParam === 'error') setStravaStatus('error');
  }, [searchParams]);

  useEffect(() => {
    async function checkStrava() {
      if (!user?.email) return;
      const { data } = await supabase.from('strava_tokens').select('id').eq('user_email', user.email).limit(1);
      setStravaConnected(data?.length > 0);
    }
    checkStrava();
  }, [user, stravaStatus]);

  const connectStrava = () => {
    window.location.href = `/api/strava-auth?email=${encodeURIComponent(user.email)}`;
  };

  const syncStrava = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const response = await fetch('/api/strava-sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email }) });
      const data = await response.json();
      if (response.ok) setSyncResult({ type: 'success', message: `${data.imported} actividades importadas` });
      else setSyncResult({ type: 'error', message: data.error || 'Error al sincronizar' });
    } catch (err) {
      setSyncResult({ type: 'error', message: 'Error de conexión' });
    } finally {
      setSyncing(false);
    }
  };

  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="px-4 py-5 space-y-5 max-w-lg mx-auto">
      {/* User card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-4 flex items-center gap-4" style={glassCard}>
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.05))',
            border: '1.5px solid rgba(99,102,241,0.25)',
            color: '#818cf8',
            boxShadow: '0 2px 12px rgba(99,102,241,0.15)',
          }}
        >
          {initials}
        </div>
        <div>
          <p className="text-[15px] font-semibold text-zinc-100">{userName}</p>
          <p className="text-[13px] text-zinc-500">{user?.email}</p>
        </div>
      </motion.div>

      {/* Strava banners */}
      {stravaStatus === 'success' && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl px-4 py-3 flex items-center gap-2"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-[13px] text-emerald-400 font-medium">Strava conectado correctamente</span>
        </motion.div>
      )}
      {stravaStatus === 'error' && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl px-4 py-3 flex items-center gap-2"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-[13px] text-red-400 font-medium">Error al conectar Strava</span>
        </motion.div>
      )}

      {/* Integrations */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-2 px-1">Integraciones</p>
        <div className="rounded-2xl overflow-hidden" style={glassCard}>
          {/* Strava */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(252,76,2,0.12)', border: '1px solid rgba(252,76,2,0.2)' }}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#fc4c02">
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                  </svg>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-zinc-200">Strava</p>
                  <p className="text-[11px] text-zinc-500">{stravaConnected ? 'Conectado' : 'Sincroniza tus actividades'}</p>
                </div>
              </div>
              {stravaConnected ? (
                <button onClick={syncStrava} disabled={syncing}
                  className="flex items-center gap-1.5 text-zinc-300 text-[12px] font-medium px-3 py-2 rounded-lg transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Sincronizar
                </button>
              ) : (
                <button onClick={connectStrava}
                  className="text-white text-[12px] font-semibold px-3 py-2 rounded-lg transition-colors"
                  style={{ background: '#fc4c02' }}>
                  Conectar
                </button>
              )}
            </div>
            {syncResult && (
              <div className={`mt-2 px-3 py-2 rounded-lg text-[12px] ${syncResult.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}
                style={{ background: syncResult.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
                {syncResult.message}
              </div>
            )}
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />

          {/* Whoop */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}>
                  <span className="text-sm font-bold text-teal-400">W</span>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-zinc-200">Whoop</p>
                  <p className="text-[11px] text-zinc-500">Próximamente</p>
                </div>
              </div>
              <span className="text-[11px] text-zinc-600 px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.04)' }}>Pronto</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Personal menu */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-2 px-1">Personal</p>
        <div className="rounded-2xl overflow-hidden" style={glassCard}>
          {[
            { icon: User, label: 'Perfil', color: 'rgba(99,102,241,0.15)', iconColor: '#818cf8' },
            { icon: Dumbbell, label: 'Mis Workouts', color: 'rgba(16,185,129,0.12)', iconColor: '#10b981' },
            { icon: BarChart3, label: 'Estadísticas', color: 'rgba(245,158,11,0.12)', iconColor: '#f59e0b' },
            { icon: Settings, label: 'Ajustes', color: 'rgba(255,255,255,0.06)', iconColor: '#71717a' },
          ].map((item, idx, arr) => (
            <button key={item.label}
              className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-white/[0.02] ${idx < arr.length - 1 ? 'border-b' : ''}`}
              style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: item.color }}>
                  <item.icon className="w-[15px] h-[15px]" style={{ color: item.iconColor }} />
                </div>
                <p className="text-[13px] font-medium text-zinc-300">{item.label}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-700" />
            </button>
          ))}
        </div>
      </motion.div>

      {/* Logout */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <button onClick={signOut}
          className="w-full rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-colors hover:bg-red-500/5"
          style={glassCard}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <LogOut className="w-[15px] h-[15px] text-red-400" />
          </div>
          <span className="text-[13px] font-medium text-red-400">Cerrar sesión</span>
        </button>
      </motion.div>
    </div>
  );
}
