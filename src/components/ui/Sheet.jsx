import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { SHEET_SPRING, useSheetDrag } from '@/components/sheetDrag';
import { IconButton } from './primitives';

// Hoja flotante de Olympia (sistema de diseño §4, v1.2).
//  · Material de cristal grueso (--sheet-bg + --sheet-filter) que flota a
//    --sheet-inset de los bordes, igual que el header y la nav.
//  · Entra y sale por el mismo camino (abajo).
//  · Se arrastra solo desde la cabecera; al soltar con un tirón, la salida
//    continúa a la velocidad del dedo (sin costura entre gesto y animación).
//  · Debe renderizarse dentro de <AnimatePresence> para animar la salida.
//
// Props:
//  onClose          cierre (X, arrastre, scrim)
//  header           contenido de la cabecera (zona de arrastre), bajo el asa
//  dismissOnScrim   tocar fuera cierra (por defecto sí; los comunicados no)
//  maxHeight        alto máximo de la hoja (por defecto 88dvh)
//  aboveNav         deja hueco para la nav inferior (hojas abiertas desde la app)
export function Sheet({
  onClose, header, children, dismissOnScrim = true, maxHeight = '88dvh',
  aboveNav = false, label, className = '', bodyClassName = '',
}) {
  const [exitVelocity, setExitVelocity] = useState(0);
  const sheet = useSheetDrag(onClose, { onDismissVelocity: setExitVelocity });
  const panel = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Teclado y lectores de pantalla: el foco entra en la hoja al abrir y vuelve
  // a quien la abrió al cerrar; Escape cierra (solo la hoja de más arriba) y
  // Tab no sale de la hoja.
  useEffect(() => {
    const opener = document.activeElement;
    const el = panel.current;
    el?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (!el) return;
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== el) return;
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current?.(); return; }
      if (e.key !== 'Tab') return;
      const items = el.querySelectorAll('button:not(:disabled), [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, []);

  const bottom = aboveNav
    ? 'calc(env(safe-area-inset-bottom) + 84px)'
    : 'max(var(--sheet-inset), env(safe-area-inset-bottom))';

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: 'var(--scrim)', paddingLeft: 'var(--sheet-inset)', paddingRight: 'var(--sheet-inset)', paddingBottom: bottom }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={dismissOnScrim ? onClose : undefined}
    >
      <motion.div
        ref={panel} tabIndex={-1}
        role="dialog" aria-modal="true" aria-label={label}
        className={`w-full max-w-lg flex flex-col overflow-hidden outline-none ${className}`}
        style={{
          maxHeight,
          background: 'var(--sheet-bg)',
          backdropFilter: 'var(--sheet-filter)',
          WebkitBackdropFilter: 'var(--sheet-filter)',
          border: '1px solid var(--sheet-edge)',
          borderRadius: 'var(--r-sheet)',
          boxShadow: 'var(--sheet-shadow)',
        }}
        initial={{ y: '110%' }}
        animate={{ y: 0 }}
        exit={{ y: '110%', transition: { ...SHEET_EXIT, velocity: exitVelocity } }}
        transition={SHEET_SPRING}
        {...sheet.dragProps}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-shrink-0 pt-2.5 px-5" {...sheet.handleProps}>
          <div className="mx-auto mb-3 rounded-full" style={{ width: 36, height: 4, background: 'rgba(var(--ink),0.18)' }} />
          {header}
        </div>
        <div className={`flex-1 min-h-0 flex flex-col ${bodyClassName}`}>{children}</div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

// Salida: muelle críticamente amortiguado (respuesta ≈ 0,3 s) que hereda la
// velocidad del gesto. Cerrar con la X parte de velocidad 0.
const SHEET_EXIT = { type: 'spring', stiffness: 440, damping: 42, mass: 1, restDelta: 1 };

// Fila de título estándar de una hoja: [leading] título / subtítulo  [X]
export function SheetTitle({ title, subtitle, leading, onClose, className = 'mb-4' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {leading}
      <div className="flex-1 min-w-0">
        <p className="truncate" style={{ fontSize: 'var(--fs-title)', letterSpacing: 'var(--tracking-title)', color: 'rgba(var(--ink),0.95)' }}>
          {title}
        </p>
        {subtitle != null && (
          <p className="mt-0.5 truncate" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-meta)', color: 'rgba(var(--ink),0.45)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {onClose && <IconButton icon={X} label="Cerrar" onClick={onClose} />}
    </div>
  );
}
