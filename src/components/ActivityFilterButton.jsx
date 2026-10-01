import React, { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { iconFor, categoryOf } from '@/utils/activityIcons';

// Botón redondo de vidrio con desplegable para filtrar por tipo de actividad.
// value = tipo o null (todas). Mismo patrón que en "Tú".
export default function ActivityFilterButton({ value = null, onChange, types = [], labels = {} }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const Icon = value ? iconFor(value) : SlidersHorizontal;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          border: '1px solid var(--glass-border)',
          ...(value ? { boxShadow: 'inset 0 0 0 1.5px var(--accent)' } : {}),
        }}
        aria-label="Filtrar por actividad">
        <Icon className="w-3.5 h-3.5" style={{ color: value ? 'var(--accent)' : 'rgba(var(--ink),0.75)' }} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1.5 p-1 min-w-[180px]"
          style={{ background: 'var(--surface)', border: '1px solid rgba(var(--ink),0.12)', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }}>
          {[null, ...types].map(t => {
            const I = t ? iconFor(t) : SlidersHorizontal;
            const on = value === t;
            return (
              <button key={t || 'all'} onClick={() => { onChange?.(t); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left text-[12px]"
                style={on ? { background: 'rgba(var(--ink),0.07)', color: 'rgba(var(--ink),0.95)' } : { color: 'rgba(var(--ink),0.65)' }}>
                <I className="w-3.5 h-3.5" style={{ color: t ? `rgb(var(--cat-${categoryOf(t)}))` : 'rgba(var(--ink),0.5)' }} />
                {t ? (labels[t] || t) : 'Todas las actividades'}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
