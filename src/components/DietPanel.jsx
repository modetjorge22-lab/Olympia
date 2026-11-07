import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Button, IconButton, Sheet } from '@/components/ui';
import { MAX_STANDARDS, pendingDate, useDiet } from '@/hooks/useDiet';

// Disciplina alimentaria (design-system §6 «Alimentación»): opcional, todo en
// tinta. Un toque al día sobre el día anterior; el «en cuál fallaste» es opcional.

const INK = a => `rgba(var(--ink),${a})`;
const MONO = 'var(--font-mono)';

const dayLabel = ds => {
  const s = new Date(`${ds}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function Choice({ on, children, ...rest }) {
  return (
    <button {...rest}
      className="o-press px-3 py-1.5 rounded-full text-[11px]"
      style={on ? { background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)' } : { background: INK(0.06), color: INK(0.75) }}>
      {children}
    </button>
  );
}

const questionFor = diet => (diet.standards.length ? '¿Cumpliste ayer tus estándares?' : '¿Cumpliste ayer con tu alimentación?');

// Sí / No sobre `date`. Tras «No» con 2+ estándares, chips opcionales para
// marcar en cuál se falló. Con 1 estándar, el fallo es ese.
function Answer({ diet, date, onDone, compact }) {
  const [failing, setFailing] = useState(null);

  if (failing) {
    const toggle = id => setFailing(prev => {
      const ids = new Set(prev);
      ids.has(id) ? ids.delete(id) : ids.add(id);
      diet.setDay(date, false, [...ids]);
      return ids;
    });
    return (
      <div>
        <p className="text-[12px]" style={{ color: INK(0.9) }}>
          ¿En cuál has fallado? <span style={{ color: INK(0.45) }}>opcional</span>
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {diet.standards.map(s => (
            <Choice key={s.id} on={failing.has(s.id)} onClick={() => toggle(s.id)} aria-pressed={failing.has(s.id)}>{s.text}</Choice>
          ))}
        </div>
        {compact
          ? <button onClick={() => { setFailing(null); onDone?.(); }} className="mt-3 text-[11px] underline underline-offset-2" style={{ color: INK(0.45) }}>Listo</button>
          : <Button className="w-full mt-5" onClick={() => { setFailing(null); onDone?.(); }}>Listo</Button>}
      </div>
    );
  }

  const no = () => {
    const n = diet.standards.length;
    diet.setDay(date, false, n === 1 ? [diet.standards[0].id] : []);
    if (n > 1) setFailing(new Set());
    else onDone?.();
  };

  return (
    <div className="flex gap-2">
      <Button variant="secondary" size={compact ? 'sm' : 'md'} className="flex-1" onClick={() => { diet.setDay(date, true); onDone?.(); }}>
        <Check className="w-3.5 h-3.5" />Sí
      </Button>
      <Button variant="secondary" size={compact ? 'sm' : 'md'} className="flex-1" onClick={no}>
        <X className="w-3.5 h-3.5" />No
      </Button>
    </div>
  );
}

function Streak({ stats, big }) {
  const { streak, best, met30, failed30 } = stats;
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span style={{ fontFamily: MONO, fontSize: big ? 22 : 17, color: streak ? 'var(--accent)' : INK(0.6) }}>{streak}</span>
        <span className="text-[12px]" style={{ color: INK(0.6) }}>{streak === 1 ? 'día seguido' : 'días seguidos'}</span>
      </div>
      <p className="mt-1" style={{ fontFamily: MONO, fontSize: 11, color: INK(0.45) }}>
        mejor {best} · {met30}/30 días · {failed30} {failed30 === 1 ? 'fallo' : 'fallos'}
      </p>
    </div>
  );
}

// ── Editor de estándares en tags ──
export function DietStandardsSheet({ onClose }) {
  const diet = useDiet();
  const [tags, setTags] = useState(() => diet.standards.map(s => ({ id: s.id, text: s.text })));
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const full = tags.length >= MAX_STANDARDS;

  const add = () => {
    const t = draft.trim();
    if (!t || full || tags.some(x => x.text.toLowerCase() === t.toLowerCase())) { setDraft(''); return; }
    setTags(arr => [...arr, { text: t }]);
    setDraft('');
    inputRef.current?.focus();
  };

  const save = async () => {
    setSaving(true);
    const pending = draft.trim() && !full ? [...tags, { text: draft.trim() }] : tags;
    try { await diet.saveStandards(pending); onClose(); } finally { setSaving(false); }
  };

  return (
    // Sin cierre por scrim: en móvil, al ocultarse el teclado la hoja baja y el
    // toque en «Añadir» caía fuera y la cerraba.
    <Sheet onClose={onClose} dismissOnScrim={false} label="Estándares de alimentación" header={
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 'var(--fs-title)', letterSpacing: 'var(--tracking-title)', color: INK(0.95) }}>Tus estándares</p>
          <p className="mt-0.5" style={{ fontFamily: MONO, fontSize: 11, color: INK(0.45) }}>opcionales · solo los ves tú</p>
        </div>
        <IconButton icon={X} label="Cerrar" onClick={onClose} />
      </div>
    }>
      <div className="overflow-y-auto overscroll-contain px-5 pb-6">
        <p className="text-[12px] mb-4" style={{ color: INK(0.6) }}>
          Lo que para ti es innegociable al comer. Cada día te preguntaremos si ayer lo cumpliste.
        </p>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.map((t, i) => (
              <span key={t.id || `n${i}`} className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-full text-[12px]"
                style={{ background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)' }}>
                {t.text}
                <button onClick={() => setTags(arr => arr.filter((_, j) => j !== i))} aria-label={`Quitar ${t.text}`}
                  className="w-5 h-5 rounded-full flex items-center justify-center">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {!full && (
          <div className="flex gap-2">
            <input ref={inputRef} value={draft} maxLength={40}
              placeholder={tags.length ? 'Añade otro' : 'Sin azúcar añadido'}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
              enterKeyHint="done"
              className="flex-1 min-w-0 px-4 py-2.5 rounded-full text-[13px] outline-none"
              style={{ background: INK(0.06), color: INK(0.95) }} />
            {/* pointerdown sin foco: el teclado sigue abierto para el siguiente */}
            <Button variant="secondary" size="sm" onPointerDown={e => e.preventDefault()} onClick={add}>Añadir</Button>
          </div>
        )}
        <Button className="w-full mt-6" onClick={save} disabled={saving}>Guardar</Button>
      </div>
    </Sheet>
  );
}

// ── Bloque bajo la semana (solo si está activa) ──
export default function DietPanel({ view, onEdit }) {
  const diet = useDiet();
  if (!diet.active || !diet.loaded || view === 'train') return null;

  return (
    <div className="mt-4 pt-3 space-y-4" style={{ borderTop: `1px solid ${INK(0.06)}` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {view === 'both' && <p className="text-[10px] mb-1.5" style={{ color: INK(0.45) }}>Alimentación</p>}
          <Streak stats={diet.stats} big={view === 'food'} />
        </div>
        <button onClick={onEdit} className="text-[11px] underline underline-offset-2 flex-shrink-0" style={{ color: INK(0.45) }}>
          estándares
        </button>
      </div>

      {view === 'food' && diet.stats.failsByStandard.length > 0 && (
        <div>
          <p className="text-[10px] mb-2" style={{ color: INK(0.45) }}>Dónde fallas · 30 días</p>
          <div className="space-y-1.5">
            {diet.stats.failsByStandard.map(s => (
              <div key={s.id} className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] truncate" style={{ color: INK(0.9) }}>{s.text}</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: INK(0.6) }}>{s.fails}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Activación, abajo del todo en Tú ──
export function DietSettingsRow({ onEdit }) {
  const diet = useDiet();
  if (!diet.available || !diet.loaded) return null;
  const n = diet.standards.length;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[13px]" style={{ color: INK(0.95) }}>Disciplina alimentaria</p>
        <p className="text-[11px] mt-0.5" style={{ color: INK(0.45) }}>
          {diet.enabled
            ? <>Activa · {n ? `${n} ${n === 1 ? 'estándar' : 'estándares'}` : 'sin estándares'} · <button onClick={onEdit} className="underline underline-offset-2">editar</button></>
            : 'Marca cada día si cumpliste tus estándares al comer'}
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={async () => {
        if (diet.enabled) return diet.setEnabled(false);
        await diet.setEnabled(true);
        if (!n) onEdit?.();
      }}>
        {diet.enabled ? 'Desactivar' : 'Activar'}
      </Button>
    </div>
  );
}

// ── Pregunta al entrar en la app (si está activa y ayer sigue sin responder) ──
let askedThisVisit = false;

export function DietDailyPrompt() {
  const diet = useDiet();
  const [open, setOpen] = useState(false);
  const date = diet.active && diet.loaded ? pendingDate(diet.byDate) : null;

  useEffect(() => {
    if (!date || askedThisVisit) return;
    // Espera a que no haya otra hoja abierta (p. ej. un comunicado).
    const t = setInterval(() => {
      if (document.querySelector('[role="dialog"]')) return;
      clearInterval(t);
      askedThisVisit = true;
      setOpen(true);
    }, 1200);
    return () => clearInterval(t);
  }, [date]);

  const close = () => setOpen(false);

  return (
    <AnimatePresence>
      {open && date && (
        <Sheet onClose={close} dismissOnScrim={false} label="Alimentación de ayer" header={
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <p style={{ fontFamily: MONO, fontSize: 11, color: INK(0.45) }}>Alimentación · {dayLabel(date)}</p>
              <p className="mt-1" style={{ fontSize: 17, letterSpacing: 'var(--tracking-title)', color: INK(0.95) }}>{questionFor(diet)}</p>
            </div>
            <IconButton icon={X} label="Ahora no" onClick={close} />
          </div>
        }>
          <div className="px-5 pb-6">
            {diet.standards.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {diet.standards.map(s => (
                  <span key={s.id} className="px-3 py-1.5 rounded-full text-[11px]" style={{ background: INK(0.06), color: INK(0.75) }}>{s.text}</span>
                ))}
              </div>
            )}
            <Answer diet={diet} date={date} onDone={close} />
            {diet.stats.streak > 0 && (
              <p className="mt-4 text-center" style={{ fontFamily: MONO, fontSize: 11, color: INK(0.45) }}>
                llevas {diet.stats.streak} {diet.stats.streak === 1 ? 'día seguido' : 'días seguidos'}
              </p>
            )}
          </div>
        </Sheet>
      )}
    </AnimatePresence>
  );
}

// Fila para el detalle de un día: corregir o marcar días pasados.
export function DietDayRow({ date }) {
  const diet = useDiet();
  if (!diet.active) return null;
  const entry = diet.byDate[date];
  const set = met => (entry && entry.met === met ? diet.clearDay(date) : diet.setDay(date, met, []));
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[12px]" style={{ color: INK(0.9) }}>Alimentación</span>
      <div className="flex gap-1.5">
        <Choice on={entry?.met === true} onClick={() => set(true)} aria-pressed={entry?.met === true}>Cumplido</Choice>
        <Choice on={entry?.met === false} onClick={() => set(false)} aria-pressed={entry?.met === false}>No cumplido</Choice>
      </div>
    </div>
  );
}

export function useDietSheet() {
  const [open, setOpen] = useState(false);
  return { open, show: () => setOpen(true), hide: () => setOpen(false) };
}

export function DietSheetHost({ sheet }) {
  return (
    <AnimatePresence>
      {sheet.open && <DietStandardsSheet onClose={sheet.hide} />}
    </AnimatePresence>
  );
}
