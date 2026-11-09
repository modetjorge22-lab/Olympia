import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Sheet, Button, IconButton } from '@/components/ui';

// ─────────────────────────────────────────────────────────────────────────
// Comunicado de novedades (patrón «Comunicado», design-system §6).
// Lanzado en noviembre de 2026: WHOOP y disciplina alimentaria.
//
// Siempre se puede revisar abriendo la app con ?comunicado=preview (no marca
// nada como visto).
//
// Para el próximo comunicado: cambia NOVEDADES y MES, y sube SEEN_KEY
// (olympia_comunicado_{aaaa_mm}_v{n}) para que vuelva a salir a todos.
// ─────────────────────────────────────────────────────────────────────────

const ACTIVE = true;
const MES = 'noviembre 2026';
const SEEN_KEY = 'olympia_comunicado_2026_11_v2';

const NOVEDADES = [
  {
    titulo: 'WHOOP, conectado',
    parrafos: [
      <>Olympia ya se conecta con <Strong>WHOOP</Strong>. Actívalo en <Strong>Más → Integraciones</Strong> y tus entrenos entrarán solos, sin apuntar nada.</>,
      <>Si ya habías apuntado la sesión, a mano o desde Strava, no se duplica: Olympia la reconoce y la enlaza con WHOOP. Si la apuntas después, tu registro corrige el de WHOOP.</>,
      <>¿WHOOP se ha equivocado de deporte o de duración? Edita la actividad: tu cambio manda y WHOOP no lo vuelve a tocar. Si no era un entreno, bórrala y no volverá.</>,
      <>Los paseos no cuentan. Tu sueño y tu recuperación son solo para ti.</>,
    ],
  },
  {
    titulo: 'Disciplina alimentaria',
    parrafos: [
      <>La disciplina también se come. Es opcional: actívala abajo del todo en <Strong>Tú</Strong>.</>,
      <>Si quieres, apunta tus estándares en pequeñas etiquetas: sin azúcar, sin alcohol entre semana, lo que para ti sea innegociable.</>,
      <>Cada día, al abrir Olympia, te saldrá una pregunta: ¿ayer cumpliste? Un toque, sí o no, y listo hasta mañana. Si fallas, puedes marcar en cuál. Y si te equivocas, lo cambias desde el detalle del día.</>,
      <>Los días que cumplas se iluminarán con un leve resplandor verde en tu calendario. Y en el filtro de la semana puedes ver solo la alimentación.</>,
      <>Tus estándares y tus fallos son solo para ti. El grupo solo ve tu racha.</>,
    ],
  },
  // Siguientes novedades: { titulo, parrafos: [...] }
];

function Strong({ children }) {
  return <span style={{ color: 'rgba(var(--ink),0.95)' }}>{children}</span>;
}

function isPreview() {
  try { return new URLSearchParams(window.location.search).get('comunicado') === 'preview'; } catch { return false; }
}

export default function ComunicadoNovedades() {
  const [open, setOpen] = useState(false);
  const preview = isPreview();

  useEffect(() => {
    if (!ACTIVE && !preview) return;
    let seen = false;
    if (!preview) { try { seen = !!localStorage.getItem(SEEN_KEY); } catch { /* sin almacenamiento */ } }
    if (seen) return;
    const t = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(t);
  }, [preview]);

  const close = () => {
    if (!preview) { try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* sin almacenamiento */ } }
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <Sheet
          onClose={close}
          dismissOnScrim={false}
          label="Comunicado"
          header={
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-meta)', color: 'rgba(var(--ink),0.45)' }}>
                  Comunicado · {MES}
                </p>
                <p className="mt-1" style={{ fontSize: 17, letterSpacing: 'var(--tracking-title)', color: 'rgba(var(--ink),0.95)' }}>
                  Novedades en Olympia
                </p>
              </div>
              <IconButton icon={X} label="Cerrar" onClick={close} />
            </div>
          }
        >
          <div className="overflow-y-auto overscroll-contain px-5 pb-6">
            {NOVEDADES.map((n, i) => (
              <section key={n.titulo} className={i > 0 ? 'pt-5 mt-5' : ''}
                style={i > 0 ? { borderTop: '1px solid rgba(var(--ink),0.12)' } : undefined}>
                <h3 style={{ fontSize: 13, letterSpacing: '.14em', color: 'rgba(var(--ink),0.95)' }}>{n.titulo}</h3>
                <div className="mt-3 space-y-3" style={{ fontSize: 12, lineHeight: 1.55, color: 'rgba(var(--ink),0.9)' }}>
                  {n.parrafos.map((p, j) => <p key={j}>{p}</p>)}
                </div>
              </section>
            ))}
            <p className="mt-6" style={{ fontSize: 11, color: 'rgba(var(--ink),0.45)' }}>— La cúpula de Olympia</p>
            <Button className="w-full mt-5" onClick={close}>Entendido</Button>
          </div>
        </Sheet>
      )}
    </AnimatePresence>
  );
}
