import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, Layers, Dumbbell, Utensils } from 'lucide-react';
import { iconFor, categoryOf } from '@/utils/activityIcons';

// Botón redondo de vidrio con desplegable para filtrar por tipo de actividad.
// value = tipo o null (todas). Es el único filtro de la app (Tú, calendario, Grupos).
//  · El menú nace del botón (transform-origin arriba a la derecha) y vuelve a él.
//  · Es una superficie flotante: lleva vidrio (regla 7).
//  · Muelle críticamente amortiguado: sin rebote, porque no lo lanza un gesto.
const MENU_SPRING = { type: 'spring', stiffness: 520, damping: 46, mass: 1 };

// Si recibe `view`, el menú empieza con qué se ve en la pestaña:
// entrenamiento, alimentación o ambos. Sigue siendo un único filtro.
const VIEWS = [
  ['both', 'Entrenamiento y alimentación', Layers],
  ['train', 'Solo entrenamiento', Dumbbell],
  ['food', 'Solo alimentación', Utensils],
];

export default function ActivityFilterButton({ value = null, onChange, types = [], labels = {}, view, onViewChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const outside = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', esc); };
  }, [open]);

  const hasView = view !== undefined;
  const foodOnly = view === 'food';
  const Icon = foodOnly ? Utensils : value ? iconFor(value) : SlidersHorizontal;
  const engaged = Boolean(value) || (hasView && view !== 'both');
  const itemStyle = on => ({ borderRadius: 12, ...(on ? { background: 'rgba(var(--ink),0.08)', color: 'rgba(var(--ink),0.95)' } : { color: 'rgba(var(--ink),0.7)' }) });

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="o-press w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          ...(engaged ? { boxShadow: 'inset 0 0 0 1.5px var(--accent)' } : {}),
        }}
        aria-label="Filtrar" aria-haspopup="menu" aria-expanded={open}>
        <Icon className="w-3.5 h-3.5" style={{ color: engaged ? 'var(--accent)' : 'rgba(var(--ink),0.75)' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div role="menu"
            className="absolute right-0 z-50 mt-1.5 p-1 min-w-[190px]"
            style={{
              transformOrigin: 'top right',
              background: 'var(--sheet-bg)',
              backdropFilter: 'var(--sheet-filter)', WebkitBackdropFilter: 'var(--sheet-filter)',
              border: '1px solid var(--sheet-edge)', borderRadius: 'var(--r-tile)',
              boxShadow: 'var(--sheet-shadow)',
            }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.12, ease: 'easeOut' } }}
            transition={MENU_SPRING}
          >
            {hasView && VIEWS.map(([k, label, I]) => (
              <button key={k} role="menuitemradio" aria-checked={view === k}
                onClick={() => { onViewChange?.(k); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-[12px]"
                style={itemStyle(view === k)}>
                <I className="w-3.5 h-3.5" style={{ color: 'rgba(var(--ink),0.5)' }} />
                {label}
              </button>
            ))}
            {hasView && !foodOnly && <div role="separator" className="my-1 mx-2" style={{ height: 1, background: 'rgba(var(--ink),0.12)' }} />}
            {!foodOnly && [null, ...types].map(t => {
              const I = t ? iconFor(t) : SlidersHorizontal;
              const on = value === t;
              return (
                <button key={t || 'all'} role="menuitemradio" aria-checked={on}
                  onClick={() => { onChange?.(t); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left text-[12px]"
                  style={{ borderRadius: 12, ...(on ? { background: 'rgba(var(--ink),0.08)', color: 'rgba(var(--ink),0.95)' } : { color: 'rgba(var(--ink),0.7)' }) }}>
                  <I className="w-3.5 h-3.5" style={{ color: t ? `rgb(var(--cat-${categoryOf(t)}))` : 'rgba(var(--ink),0.5)' }} />
                  {t ? (labels[t] || t) : 'Todas las actividades'}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
