import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Landmark, X } from 'lucide-react';

// Cambia la versión de la clave para volver a mostrar un comunicado nuevo.
const SEEN_KEY = 'olympia_comunicado_2026_11_v1';

const TEXT_PRIMARY = 'rgba(var(--ink),0.92)';
const TEXT_SECONDARY = 'rgba(var(--ink),0.68)';
const TEXT_MUTED = 'rgba(var(--ink),0.45)';
const ACCENT = 'var(--accent)';
const ON_ACCENT = 'var(--on-accent)';

export default function OfficialAnnouncement() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let seen = false;
    try { seen = !!localStorage.getItem(SEEN_KEY); } catch {}
    if (!seen) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        background: 'rgba(30,10,15,0.72)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 'max(20px, env(safe-area-inset-top))',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="comunicado-title"
        className="w-full max-w-sm rounded-3xl overflow-hidden max-h-full overflow-y-auto"
        style={{
          background: 'var(--surface)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          border: '1px solid rgba(var(--ink),0.16)',
        }}
      >
        {/* Cabecera institucional */}
        <div className="px-6 pt-6 pb-5 relative"
          style={{ background: 'linear-gradient(135deg, #3d0010 0%, #6b1525 100%)' }}>
          <button
            onClick={dismiss}
            aria-label="Cerrar"
            className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            <X className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.85)' }} />
          </button>

          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <Landmark className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.92)' }} />
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5"
            style={{ color: 'rgba(255,255,255,0.6)' }}>
            Comunicado oficial · Noviembre 2026
          </p>
          <h2 id="comunicado-title" className="text-[20px] font-bold leading-snug"
            style={{ color: 'rgba(255,255,255,0.96)', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
            Un mensaje de la<br />cúpula de Olympia
          </h2>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-5 space-y-4 text-[13px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>
          <p>
            Tras un largo periodo de inactividad, la cúpula de Olympia ha tomado la decisión de
            retirar el acceso al usuario <strong style={{ color: TEXT_PRIMARY }}>Pablo Arévalo</strong>.
          </p>
          <p>
            Aprovechamos para recordaros que Olympia es un espacio dedicado al rendimiento deportivo
            y a la disciplina personal. Nos tomamos muy en serio la calidad y el compromiso de
            quienes forman parte de esta comunidad.
          </p>
          <p>
            Y una última cosa: muy pronto llegarán nuevas funcionalidades para llevar vuestra
            disciplina al siguiente nivel.
          </p>
          <p className="font-semibold" style={{ color: TEXT_PRIMARY }}>
            Stay tuned, my friends. 🏛️
          </p>
          <p className="text-[12px] italic pt-1" style={{ color: TEXT_MUTED }}>
            — La cúpula de Olympia
          </p>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={dismiss}
            className="w-full py-3.5 rounded-2xl text-[14px] font-bold"
            style={{ background: ACCENT, color: ON_ACCENT, boxShadow: '0 4px 16px rgba(0,0,0,0.35)' }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
