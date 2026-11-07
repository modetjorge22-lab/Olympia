import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Button, IconButton, Sheet } from '@/components/ui';
import { MAX_STANDARDS, pendingDate } from '@/hooks/useDiet';

// Disciplina alimentaria (design-system §6 «Alimentación»): todo en tinta,
// sin color propio. Un toque al día; el «en cuál fallaste» es opcional.

const INK = a => `rgba(var(--ink),${a})`;
const MONO = 'var(--font-mono)';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

// Pregunta del día. Tras «No», se puede marcar qué estándar falló (o nada).
function CheckIn({ diet }) {
  const date = pendingDate(diet.byDate);
  const [failing, setFailing] = useState(null); // { date, ids: Set }

  if (failing) {
    const toggle = id => setFailing(f => {
      const ids = new Set(f.ids);
      ids.has(id) ? ids.delete(id) : ids.add(id);
      diet.setDay(f.date, false, [...ids]);
      return { ...f, ids };
    });
    return (
      <div>
        <p className="text-[12px]" style={{ color: INK(0.9) }}>
          ¿En cuál has fallado? <span style={{ color: INK(0.45) }}>opcional</span>
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {diet.standards.map(s => (
            <Choice key={s.id} on={failing.ids.has(s.id)} onClick={() => toggle(s.id)} aria-pressed={failing.ids.has(s.id)}>{s.text}</Choice>
          ))}
        </div>
        <button onClick={() => setFailing(null)} className="mt-3 text-[11px] underline underline-offset-2" style={{ color: INK(0.45) }}>
          Listo
        </button>
      </div>
    );
  }

  if (!date) return null;
  const isToday = date === todayStr();
  return (
    <div>
      <p className="text-[12px]" style={{ color: INK(0.9) }}>
        {isToday ? '¿Has cumplido hoy tus estándares?' : '¿Cumpliste ayer tus estándares?'}
      </p>
      <div className="flex gap-2 mt-2.5">
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => diet.setDay(date, true)}>
          <Check className="w-3.5 h-3.5" />Sí
        </Button>
        <Button variant="secondary" size="sm" className="flex-1" onClick={() => {
          diet.setDay(date, false, []);
          if (diet.standards.length > 1) setFailing({ date, ids: new Set() });
        }}>
          <X className="w-3.5 h-3.5" />No
        </Button>
      </div>
    </div>
  );
}

function Streak({ stats, big }) {
  const { streak, best, met30, failed30 } = stats;
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span style={{ fontFamily: MONO, fontSize: big ? 22 : 17, color: streak ? 'var(--accent)' : INK(0.6) }}>{streak}</span>
        <span className="text-[12px]" style={{ color: INK(0.6) }}>
          {streak === 1 ? 'día seguido' : 'días seguidos'}
        </span>
      </div>
      <p className="mt-1" style={{ fontFamily: MONO, fontSize: 11, color: INK(0.45) }}>
        mejor {best} · {met30}/30 días · {failed30} {failed30 === 1 ? 'fallo' : 'fallos'}
      </p>
    </div>
  );
}

export function DietStandardsSheet({ diet, onClose }) {
  const [items, setItems] = useState(() => {
    const base = diet.standards.map(s => ({ id: s.id, text: s.text }));
    while (base.length < MAX_STANDARDS) base.push({ text: '' });
    return base;
  });
  const [saving, setSaving] = useState(false);
  const examples = ['Sin azúcar añadido', 'Sin alcohol entre semana', 'Cenar antes de las 22 h'];

  const save = async () => {
    setSaving(true);
    try { await diet.saveStandards(items); onClose(); } finally { setSaving(false); }
  };

  return (
    <Sheet onClose={onClose} label="Estándares de alimentación" header={
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 'var(--fs-title)', letterSpacing: 'var(--tracking-title)', color: INK(0.95) }}>Tus estándares</p>
          <p className="mt-0.5" style={{ fontFamily: MONO, fontSize: 11, color: INK(0.45) }}>hasta {MAX_STANDARDS} · solo los ves tú</p>
        </div>
        <IconButton icon={X} label="Cerrar" onClick={onClose} />
      </div>
    }>
      <div className="overflow-y-auto overscroll-contain px-5 pb-6">
        <p className="text-[12px] mb-4" style={{ color: INK(0.6) }}>
          Lo esencial para ti al comer. Cada día respondes si lo has cumplido; el grupo solo ve tu racha.
        </p>
        <div className="space-y-2.5">
          {items.map((it, i) => (
            <input key={it.id || `n${i}`} value={it.text} maxLength={60}
              placeholder={examples[i]}
              onChange={e => setItems(arr => arr.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
              className="w-full px-4 py-3 rounded-2xl text-[13px] outline-none"
              style={{ background: INK(0.06), color: INK(0.95), border: '1px solid transparent' }} />
          ))}
        </div>
        <Button className="w-full mt-5" onClick={save} disabled={saving || !items.some(i => i.text.trim())}>
          Guardar
        </Button>
      </div>
    </Sheet>
  );
}

// Bloque bajo la semana. view: 'both' (resumen + pregunta) | 'food' (detalle).
export default function DietPanel({ diet, view, onEdit }) {
  if (!diet.loaded || view === 'train') return null;

  if (!diet.active) {
    return (
      <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${INK(0.06)}` }}>
        <p className="text-[12px]" style={{ color: INK(0.9) }}>Disciplina alimentaria</p>
        <p className="text-[11px] mt-0.5" style={{ color: INK(0.45) }}>Define hasta 3 estándares y marca cada día si los cumples.</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={onEdit}>Definir estándares</Button>
      </div>
    );
  }

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

      <CheckIn diet={diet} />

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

// Fila para el detalle de un día: corregir o marcar días pasados.
export function DietDayRow({ diet, date }) {
  if (!diet?.active) return null;
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

export function DietSheetHost({ diet, sheet }) {
  return (
    <AnimatePresence>
      {sheet.open && <DietStandardsSheet diet={diet} onClose={sheet.hide} />}
    </AnimatePresence>
  );
}
