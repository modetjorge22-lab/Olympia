import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import { iconFor, categoryOf } from '@/utils/activityIcons';

// Botón redondo de vidrio con desplegable para filtrar por tipo de actividad.
// value = tipo o null (todas). Es el único filtro de la app (Tú, calendario, Grupos).
//  · El menú nace del botón (transform-origin arriba a la derecha) y vuelve a él.
//  · Es una superficie flotante: lleva vidrio (regla 7).
//  · Muelle críticamente amortiguado: sin rebote, porque no lo lanza un gesto.
const MENU_SPRING = { type: 'spring', stiffness: 520, damping: 46, mass: 1 };

export default function ActivityFilterButton({ value = null, onChange, types = [], labels = {} }) {
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

  const Icon = value ? iconFor(value) : SlidersHorizontal;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="o-press w-8 h-8 rounded-full flex items-center justify-center"
        style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          ...(value ? { boxShadow: 'inset 0 0 0 1.5px var(--accent)' } : {}),
        }}
        aria-label="Filtrar por actividad" aria-haspopup="menu" aria-expanded={open}>
        <Icon className="w-3.5 h-3.5" style={{ color: value ? 'var(--accent)' : 'rgba(var(--ink),0.75)' }} />
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
            {[null, ...types].map(t => {
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
