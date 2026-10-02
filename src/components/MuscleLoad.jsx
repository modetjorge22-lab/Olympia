import React, { useMemo, useState } from 'react';
import { MUSCLE_GROUPS, detectMuscleGroups } from '@/utils/muscles';

// Carga muscular y frescura (inspirado en Bevel Fall 2026).
//  · Carga: horas de los últimos 7 días frente a tu media semanal de las 4
//    semanas anteriores → Baja / Óptima / Alta (zona óptima 0,8–1,3×).
//  · Frescura: la fatiga de cada sesión decae con el tiempo (vida media ~36h);
//    100 % = totalmente recuperado.
// Fuerza aporta según los grupos detectados; el cardio carga los grupos que
// mueve (correr → piernas y core, nadar → espalda y hombros…).

const MONO = '"JetBrains Mono", monospace';

const CARDIO_MAP = {
  running: { piernas: 0.8, core: 0.2 },
  cycling: { piernas: 0.9, core: 0.1 },
  hiking: { piernas: 0.8, core: 0.2 },
  football: { piernas: 0.8, core: 0.2 },
  tennis: { piernas: 0.5, hombros: 0.3, core: 0.2 },
  padel: { piernas: 0.5, hombros: 0.3, core: 0.2 },
  golf: { core: 0.6, hombros: 0.4 },
  swimming: { espalda: 0.35, hombros: 0.35, piernas: 0.15, core: 0.15 },
  martial_arts: { piernas: 0.3, core: 0.3, hombros: 0.2, pectorales: 0.2 },
  yoga: { core: 0.5, piernas: 0.25, hombros: 0.25 },
  pilates: { core: 0.7, piernas: 0.3 },
};
// El cardio fatiga menos por hora que la fuerza
const CARDIO_WEIGHT = 0.5;

function distribution(a) {
  if (a.type === 'strength_training') {
    const explicit = Array.isArray(a.muscle_groups) ? a.muscle_groups : [];
    const keys = explicit.length ? explicit
      : detectMuscleGroups(`${a.title || ''} ${a.description || ''} ${a.progress_note || ''}`);
    if (!keys.length) return null;
    return Object.fromEntries(keys.map(k => [k, 1 / keys.length]));
  }
  const m = CARDIO_MAP[a.type];
  if (!m) return null;
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v * CARDIO_WEIGHT]));
}

function status(acute, chronic) {
  if (acute === 0 && chronic === 0) return { key: 'none', label: 'Sin carga' };
  if (chronic === 0) return { key: 'high', label: 'Nueva' };
  const r = acute / chronic;
  if (r < 0.8) return { key: 'low', label: 'Baja' };
  if (r <= 1.3) return { key: 'ok', label: 'Óptima' };
  return { key: 'high', label: 'Alta' };
}

export default function MuscleLoad({ activities }) {
  const [view, setView] = useState('load'); // 'load' | 'fresh'

  const rows = useMemo(() => {
    const now = Date.now();
    const DAY = 86400000;
    const acute = {}, chronic = {}, fatigue = {};
    MUSCLE_GROUPS.forEach(g => { acute[g.key] = 0; chronic[g.key] = 0; fatigue[g.key] = 0; });

    activities.forEach(a => {
      const t = new Date(`${a.date?.slice(0, 10)}T18:00:00`).getTime();
      const ago = now - t;
      if (!(ago >= 0) || ago > 35 * DAY) return;
      const dist = distribution(a);
      if (!dist) return;
      const h = (a.duration_minutes || 0) / 60;
      Object.entries(dist).forEach(([k, w]) => {
        if (!(k in acute)) return;
        if (ago <= 7 * DAY) acute[k] += h * w;
        else chronic[k] += (h * w) / 4; // media semanal de las 4 semanas previas
        fatigue[k] += h * w * Math.pow(0.5, ago / (36 * 3600000));
      });
    });

    return MUSCLE_GROUPS.map(g => {
      const st = status(acute[g.key], chronic[g.key]);
      const fresh = Math.max(0, Math.round(100 - Math.min(100, fatigue[g.key] * 70)));
      return { ...g, acute: acute[g.key], chronic: chronic[g.key], st, fresh };
    });
  }, [activities]);

  // Escala común: hasta el mayor de (carga actual, techo de tu rango)
  const maxLoad = Math.max(0.5, ...rows.map(r => Math.max(r.acute, r.chronic * 1.5)));

  return (
    <div>
      <div className="flex justify-end mb-3">
        <div className="flex items-center gap-0.5 rounded-full p-1"
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(24px) saturate(160%)',
            WebkitBackdropFilter: 'blur(24px) saturate(160%)',
            border: '1px solid var(--glass-border)',
          }}>
          {[['load', 'Carga'], ['fresh', 'Frescura']].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)}
              className="px-2.5 py-1 rounded-full text-[10px] transition-all"
              style={view === k
                ? { background: 'rgba(var(--ink),0.1)', color: 'rgba(var(--ink),0.95)' }
                : { color: 'rgba(var(--ink),0.45)' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {rows.map(r => {
          if (view === 'fresh') {
            const label = r.fresh >= 85 ? 'Fresco' : r.fresh >= 50 ? 'Recuperando' : 'Fatigado';
            return (
              <div key={r.key}>
                <div className="flex justify-between mb-1">
                  <span className="text-[11px]" style={{ color: 'rgba(var(--ink),0.85)' }}>{r.label}</span>
                  <span className="text-[10px]" style={{ fontFamily: MONO, color: 'rgba(var(--ink),0.5)' }}>
                    {label} · <span style={{ color: 'var(--accent)' }}>{r.fresh}%</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(var(--ink),0.08)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${r.fresh}%`, background: 'var(--accent)', opacity: 0.35 + r.fresh / 160 }} />
                </div>
              </div>
            );
          }
          // Vista de carga — misma barra que Frescura (un solo color). Tu rango
          // habitual (0,8–1,3× tu media de las 4 semanas previas) se marca con dos
          // rayitas finas y un rayado diagonal muy tenue entre ellas.
          const toPct = v => Math.min(100, (v / maxLoad) * 100);
          const cur = toPct(r.acute);
          const lo = toPct(r.chronic * 0.8), hi = toPct(r.chronic * 1.3);
          return (
            <div key={r.key}>
              <div className="flex justify-between mb-1">
                <span className="text-[11px]" style={{ color: 'rgba(var(--ink),0.85)' }}>{r.label}</span>
                <span className="text-[10px]" style={{ fontFamily: MONO, color: 'rgba(var(--ink),0.5)' }}>
                  {r.acute.toFixed(1)}h · {r.st.label}
                </span>
              </div>
              <div className="relative h-1.5 rounded-full" style={{ background: 'rgba(var(--ink),0.08)' }}>
                <div className="absolute top-0 left-0 h-full rounded-full transition-all"
                  style={{ width: `${cur}%`, background: 'var(--accent)', opacity: 0.85 }} />
                {r.chronic > 0 && (
                  <>
                    <span className="absolute" style={{
                      left: `${lo}%`, width: `${Math.max(0, hi - lo)}%`, top: -3, bottom: -3,
                      backgroundImage: 'repeating-linear-gradient(135deg, rgba(var(--ink),0.16) 0 1px, transparent 1px 4px)',
                    }} />
                    <span className="absolute" style={{ left: `${lo}%`, top: -3, bottom: -3, width: 1, background: 'rgba(var(--ink),0.4)' }} />
                    <span className="absolute" style={{ left: `${hi}%`, top: -3, bottom: -3, width: 1, background: 'rgba(var(--ink),0.4)' }} />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[9px] mt-3" style={{ color: 'rgba(var(--ink),0.4)' }}>
        {view === 'load'
          ? 'Últimos 7 días. Las rayitas marcan tu rango habitual según tus 4 semanas anteriores.'
          : 'Recuperación estimada por grupo según tus sesiones recientes de fuerza y cardio.'}
      </p>
    </div>
  );
}
