import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, AlertCircle } from 'lucide-react';
import { haptic } from '@/lib/haptics';

// Aviso de Olympia (sistema de diseño §6, v1.6).
//  · Confirma lo que acaba de pasar (guardado, eliminado, error) y, si la acción
//    se puede deshacer, lo ofrece ahí mismo: deshacer en lugar de preguntar.
//  · Ocupa el sitio exacto del header (misma píldora, mismo inset): «habla el
//    header». Así nunca tapa la nav, el botón primario de una hoja ni el teclado.
//  · Entra y sale por arriba, con el muelle crítico de los menús. Se descarta
//    solo (4 s; 6 s si lleva acción), deslizándolo hacia arriba o al actuar.
//  · Solo hay uno a la vez: el nuevo sustituye al anterior en el sitio, sin
//    volver a entrar.
//
// Uso:  const toast = useToast();
//       toast({ message: 'Actividad eliminada', action: { label: 'Deshacer', onClick: undo } });
//       toast({ message: 'No se ha podido guardar', tone: 'error' });

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

const SPRING = { type: 'spring', stiffness: 520, damping: 46 };

export function ToastProvider({ children }) {
  const [item, setItem] = useState(null);
  const timer = useRef(0);
  const seq = useRef(0);

  const dismiss = useCallback(() => { clearTimeout(timer.current); setItem(null); }, []);

  const toast = useCallback(({ message, action, tone = 'success', duration } = {}) => {
    if (!message) return;
    clearTimeout(timer.current);
    seq.current += 1;
    setItem({ id: seq.current, message, action, tone });
    timer.current = setTimeout(() => setItem(null), duration ?? (action ? 6000 : 4000));
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const Icon = item?.tone === 'error' ? AlertCircle : Check;
  const node = (
    <div className="fixed top-0 left-0 right-0 z-[120]" aria-live="polite" role="status"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)', pointerEvents: 'none' }}>
      <div className="mx-auto max-w-lg px-3">
        <AnimatePresence initial={false}>
          {item && (
            <motion.div
              key="aviso"
              className="flex items-center gap-2.5 pl-4 pr-1.5"
              style={{
                height: 'var(--header-h)', borderRadius: 'calc(var(--header-h) / 2)', pointerEvents: 'auto',
                position: 'absolute', left: 12, right: 12, maxWidth: 488, marginInline: 'auto',
                background: 'var(--toast-bg)',
                backdropFilter: 'var(--sheet-filter)', WebkitBackdropFilter: 'var(--sheet-filter)',
                border: '1px solid var(--sheet-edge)', boxShadow: 'var(--glass-shadow)',
                touchAction: 'none',
              }}
              initial={{ y: '-130%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-130%', opacity: 0, transition: { duration: 0.15, ease: 'easeOut' } }}
              transition={SPRING}
              drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0.7, bottom: 0.06 }}
              onDragEnd={(_, info) => { if (info.offset.y < -16 || info.velocity.y < -200) dismiss(); }}
            >
              <Icon aria-hidden className="flex-shrink-0" strokeWidth={1.7}
                style={{ width: 15, height: 15, color: item.tone === 'error' ? 'var(--danger)' : 'var(--success)' }} />
              <p className="flex-1 min-w-0 truncate"
                style={{ fontSize: 'var(--fs-body)', color: 'rgba(var(--ink),0.95)' }}>
                {item.message}
              </p>
              {item.action ? (
                <button
                  onClick={() => { haptic(); item.action.onClick?.(); dismiss(); }}
                  className="o-press flex-shrink-0 rounded-full px-4"
                  style={{ height: 40, fontSize: 'var(--fs-body)', color: 'var(--accent)', background: 'rgba(var(--accent-rgb),0.1)' }}>
                  {item.action.label}
                </button>
              ) : <span className="w-2.5" />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  const value = useMemo(() => toast, [toast]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(node, document.body)}
    </ToastContext.Provider>
  );
}
