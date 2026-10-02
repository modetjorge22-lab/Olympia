import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, Minus, Target, Check } from 'lucide-react';
import { ACTIVITY_TYPES } from '@/hooks/useActivities';
import { iconFor, catColor } from '@/utils/activityIcons';
import { objectiveProgress, formatObjectiveValue } from '@/utils/objectives';

// Objetivos de volumen — "X horas / X sesiones de <deporte> cada semana / mes".
// El progreso se calcula solo con las actividades registradas.
// readOnly → versión compacta para la ficha de miembro en Grupos.

const MONO = '"JetBrains Mono", monospace';
const INK = a => `rgba(var(--ink),${a})`;

function describe(o) {
  const what = o.activity_type ? (ACTIVITY_TYPES[o.activity_type]?.label || o.activity_type) : 'cualquier actividad';
  const unit = o.metric === 'hours' ? (Number(o.target) === 1 ? 'hora' : 'horas') : (Number(o.target) === 1 ? 'sesión' : 'sesiones');
  return `${o.target} ${unit} de ${what.toLowerCase()} ${o.period === 'week' ? 'a la semana' : 'al mes'}`;
}

function ObjectiveRow({ o, activities, onDelete, readOnly, first }) {
  const p = objectiveProgress(o, activities);
  const Icon = o.activity_type ? iconFor(o.activity_type) : Target;
  const color = o.activity_type ? catColor(o.activity_type, 1) : 'var(--accent)';
  const statusText = p.status === 'done' ? 'Conseguido'
    : p.status === 'on' ? 'A buen ritmo'
    : `Te faltan ${formatObjectiveValue(o.metric, p.target - p.value)}`;

  return (
    <div className="py-3" style={{ borderTop: first ? 'none' : `1px solid ${INK(0.06)}` }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: o.activity_type ? catColor(o.activity_type, 0.16) : 'rgba(var(--accent-rgb),0.1)' }}>
          {p.status === 'done'
            ? <Check style={{ width: 16, height: 16, color }} strokeWidth={2.4} />
            : <Icon style={{ width: 16, height: 16, color, filter: o.activity_type ? 'brightness(0.8)' : 'none' }} strokeWidth={2} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] truncate first-letter:uppercase" style={{ color: INK(0.92) }}>{describe(o)}</p>
          <p className="text-[10px] mt-0.5" style={{ color: INK(0.45) }}>
            {statusText}{p.status !== 'done' && p.daysLeft > 0 ? ` · quedan ${p.daysLeft} ${p.daysLeft === 1 ? 'día' : 'días'}` : ''}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[13px]" style={{ fontFamily: MONO, color: INK(0.95) }}>
            {formatObjectiveValue(o.metric, p.value)}
            <span style={{ color: INK(0.4) }}> / {formatObjectiveValue(o.metric, p.target)}</span>
          </p>
        </div>
        {!readOnly && (
          <button onClick={() => onDelete(o.id)} className="p-1.5 -mr-1.5" aria-label="Eliminar objetivo">
            <Trash2 className="w-3.5 h-3.5" style={{ color: INK(0.3) }} />
          </button>
        )}
      </div>
      {/* Barra de progreso — un solo color; la rayita marca dónde deberías ir hoy */}
      <div className="relative h-1.5 rounded-full mt-2.5 ml-12" style={{ background: INK(0.08) }}>
        <motion.div className="absolute top-0 left-0 h-full rounded-full"
          initial={{ width: 0 }} animate={{ width: `${p.pct * 100}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ background: color, opacity: 0.85 }} />
        {p.status !== 'done' && (
          <span className="absolute" style={{ left: `${p.elapsed * 100}%`, top: -3, bottom: -3, width: 1, background: INK(0.35) }} />
        )}
      </div>
    </div>
  );
}

export default function ObjectivesPanel({ objectives = [], activities = [], onCreate, onDelete, readOnly = false, header, available = true }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ type: '', metric: 'hours', period: 'week', target: 3 });

  const submit = async () => {
    if (!(form.target > 0)) return;
    await onCreate({ activity_type: form.type || null, metric: form.metric, period: form.period, target: form.target });
    setForm({ type: '', metric: 'hours', period: 'week', target: 3 });
    setAdding(false);
  };

  const seg = (opts, value, set) => (
    <div className="grid p-1 rounded-full" style={{ gridTemplateColumns: `repeat(${opts.length}, 1fr)`, background: INK(0.05) }}>
      {opts.map(([k, l]) => (
        <button key={k} onClick={() => set(k)} className="py-1.5 rounded-full text-[11px] transition-all"
          style={value === k ? { background: 'var(--surface)', color: INK(0.95), boxShadow: '0 1px 4px rgba(0,0,0,0.1)' } : { color: INK(0.5) }}>
          {l}
        </button>
      ))}
    </div>
  );

  const step = form.metric === 'hours' ? 0.5 : 1;

  return (
    <div>
      {!readOnly && (
        <div className="flex items-center justify-between mb-1">
          {header}
          <button onClick={() => setAdding(v => !v)} disabled={!available}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90 disabled:opacity-30"
            style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)', border: '1px solid var(--glass-border)' }}
            aria-label={adding ? 'Cancelar' : 'Nuevo objetivo'}>
            {adding ? <X className="w-3.5 h-3.5" style={{ color: INK(0.7) }} /> : <Plus className="w-3.5 h-3.5" style={{ color: INK(0.7) }} />}
          </button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {adding && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="py-3 space-y-2.5">
              {seg([['hours', 'Horas'], ['sessions', 'Sesiones']], form.metric, m => setForm(f => ({ ...f, metric: m, target: m === 'hours' ? 3 : 3 })))}
              {seg([['week', 'Cada semana'], ['month', 'Cada mes']], form.period, p => setForm(f => ({ ...f, period: p })))}

              <div className="flex items-center justify-between rounded-full px-2 py-1.5" style={{ background: INK(0.05) }}>
                <button onClick={() => setForm(f => ({ ...f, target: Math.max(step, +(f.target - step).toFixed(1)) }))}
                  className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--surface)' }} aria-label="Menos">
                  <Minus className="w-4 h-4" style={{ color: INK(0.6) }} />
                </button>
                <span className="text-[20px]" style={{ fontFamily: MONO, color: INK(0.95) }}>
                  {form.target}<span className="text-[11px] ml-1" style={{ color: INK(0.45) }}>{form.metric === 'hours' ? 'h' : 'sesiones'}</span>
                </span>
                <button onClick={() => setForm(f => ({ ...f, target: +(f.target + step).toFixed(1) }))}
                  className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--surface)' }} aria-label="Más">
                  <Plus className="w-4 h-4" style={{ color: INK(0.6) }} />
                </button>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {[['', 'Cualquiera'], ...Object.entries(ACTIVITY_TYPES).map(([k, v]) => [k, v.label])].map(([k, l]) => {
                  const on = form.type === k;
                  const I = k ? iconFor(k) : Target;
                  return (
                    <button key={k || 'any'} onClick={() => setForm(f => ({ ...f, type: k }))}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10.5px]"
                      style={on
                        ? { background: k ? catColor(k, 0.16) : 'rgba(var(--accent-rgb),0.12)', boxShadow: `inset 0 0 0 1px ${k ? catColor(k, 0.8) : 'var(--accent)'}`, color: INK(0.9) }
                        : { background: INK(0.05), color: INK(0.55) }}>
                      <I style={{ width: 12, height: 12, color: k ? catColor(k, 1) : 'var(--accent)' }} />
                      {l}
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] text-center first-letter:uppercase" style={{ color: INK(0.6) }}>
                {describe({ activity_type: form.type || null, metric: form.metric, period: form.period, target: form.target })}
              </p>
              <button onClick={submit} className="w-full py-2.5 rounded-full text-[12.5px]"
                style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
                Guardar objetivo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!available && !readOnly ? (
        <p className="text-[11px] py-5 text-center" style={{ color: INK(0.45) }}>
          Falta activar los objetivos en la base de datos.
        </p>
      ) : objectives.length === 0 && !adding ? (
        readOnly ? null : (
          <button onClick={() => setAdding(true)} className="w-full py-6 text-center">
            <p className="text-[12px]" style={{ color: INK(0.6) }}>Fija tu primer objetivo</p>
            <p className="text-[10.5px] mt-1" style={{ color: INK(0.4) }}>Por ejemplo, 3 sesiones de fuerza a la semana.</p>
          </button>
        )
      ) : (
        objectives.map((o, i) => (
          <ObjectiveRow key={o.id} o={o} activities={activities} onDelete={onDelete} readOnly={readOnly} first={i === 0} />
        ))
      )}
    </div>
  );
}
