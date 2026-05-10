import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, X } from 'lucide-react';

const SEEN_KEY = 'olympia_metas_announcement_v1';

const TEXT_PRIMARY = '#2a1a11';
const TEXT_SECONDARY = '#6e5647';
const TEXT_MUTED = '#8c7364';

export default function FeatureAnnouncement() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(SEEN_KEY)) {
      // Pequeño delay para que la app cargue antes de mostrar el popup
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(SEEN_KEY, '1');
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
      onClick={dismiss}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: '#f5ede0',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.35)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header vino oscuro */}
        <div className="px-6 pt-6 pb-5 relative"
          style={{ background: 'linear-gradient(135deg, #3d0010 0%, #6b1525 100%)' }}>
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(245,237,224,0.15)' }}
          >
            <X className="w-3.5 h-3.5" style={{ color: 'rgba(245,237,224,0.8)' }} />
          </button>

          {/* Icono */}
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(245,237,224,0.12)', border: '1px solid rgba(245,237,224,0.2)' }}>
            <Trophy className="w-6 h-6" style={{ color: 'rgba(245,237,224,0.92)' }} />
          </div>

          <h2 className="text-[20px] font-bold leading-snug"
            style={{ color: 'rgba(245,237,224,0.96)', fontFamily: '"DM Sans", system-ui, sans-serif' }}>
            ¡Es el momento<br />de marcar tus metas!
          </h2>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-[13px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>
            Ya puedes registrar tus marcas personales en Olympia: levantamiento máximo, tiempo en carrera, repeticiones… lo que quieras mejorar.
          </p>

          {/* Pasos */}
          <div className="space-y-3">
            <Step number="1" text="Ve al nuevo marco Metas en la pestaña Actividad y crea tus objetivos con la marca actual." />
            <Step number="2" text="Cada vez que registres una actividad, indica si has superado alguna de tus marcas e introduce el nuevo valor." />
            <Step number="3" text="El día en el calendario se pondrá en vino oscuro con un 🏆 y aparecerá un anuncio en el Feed del equipo." />
          </div>

          <p className="text-[12px] leading-relaxed pt-1" style={{ color: TEXT_MUTED }}>
            En caso de equivocación, puedes borrar el logro directamente desde el día expandido del calendario y el color volverá a la normalidad.
          </p>
        </div>

        {/* Botón */}
        <div className="px-6 pb-6">
          <button
            onClick={dismiss}
            className="w-full py-3.5 rounded-2xl text-[14px] font-bold"
            style={{
              background: 'linear-gradient(135deg, #3d0010 0%, #6b1525 100%)',
              color: 'rgba(245,237,224,0.96)',
              boxShadow: '0 4px 16px rgba(61,0,16,0.4)',
            }}
          >
            ¡Empezar a marcar metas!
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Step({ number, text }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: '#3d0010' }}>
        <span className="text-[9px] font-bold" style={{ color: 'rgba(245,237,224,0.95)' }}>{number}</span>
      </div>
      <p className="text-[12px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>{text}</p>
    </div>
  );
}
