import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trophy, Check, Trash2, X } from 'lucide-react';
import { ACTIVITY_TYPES } from '@/hooks/useActivities';
import { iconFor, catColor } from '@/utils/activityIcons';

// Marcas personales — rediseño de "Metas" con el lenguaje actual de Olympia.
// Cada marca muestra: valor actual, cuánto ha mejorado desde el principio,
// una mini curva de su evolución y hace cuánto fue la última mejora.
// Al tocarla se despliega: registrar nueva marca, historial y eliminar.

const MONO = '"JetBrains Mono", monospace';
const INK = a => `rgba(var(--ink),${a})`;
const DAY = 86400000;

const fmtVal = v => (v == null ? '—' : Number.isInteger(+v) ? `${+v}` : `${(+v).toFixed(1)}`);
const ago = d => {
  if (!d) return null;
  const n = Math.floor((Date.now() - new Date(`${d}T12:00:00`).getTime()) / DAY);
  if (n <= 0) return 'hoy';
  if (n === 1) return 'ayer';
  if (n < 30) return `hace ${n} días`;
  const m = Math.floor(n / 30);
  return `hace ${m} ${m === 1 ? 'mes' : 'meses'}`;
};

function Sparkline({ points, color, w = 64, h = 22 }) {
  if (points.length < 2) return null;
  const min = Math.min(...points), max = Math.max(...points);
  const span = max - min || 1;
  const xy = points.map((v, i) => [(i / (points.length - 1)) * (w - 4) + 2, h - 2 - ((v - min) / span) * (h - 4)]);
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lx, ly] = xy[xy.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.2" fill={color} />
    </svg>
  );
}

function GoalRow({ goal, history, open, onToggle, onUpdateMark, onDelete, first }) {
  const [val, setVal] = useState('');
  const type = goal.activity_type;
  const Icon = type ? iconFor(type) : Trophy;
  const color = type ? catColor(type, 1) : 'var(--accent)';

  const points = history.length
    ? [history[0].old_value ?? history[0].new_value, ...history.map(h => h.new_value)].filter(v => v != null).map(Number)
    : (goal.current_value != null ? [Number(goal.current_value)] : []);
  const start = points[0];
  const lower = !!goal.lower_is_better;
  const cur = goal.current_value != null ? Number(goal.current_value) : null;
  // Mejora: positiva siempre que vaya en el buen sentido (más peso / menos tiempo)
  const gain = points.length > 1 && cur != null ? (lower ? start - cur : cur - start) : null;
  const target = goal.target_value != null ? Number(goal.target_value) : null;
  const toTarget = target != null && cur != null
    ? Math.max(0, Math.min(1, lower ? target / cur : cur / target)) : null;
  const reached = toTarget != null && (lower ? cur <= target : cur >= target);
  const last = history.length ? history[history.length - 1].date : goal.pb_date;
  const daysSince = last ? Math.floor((Date.now() - new Date(`${last}T12:00:00`).getTime()) / DAY) : null;
  const fresh = daysSince != null && daysSince <= 7 && history.length > 0;

  return (
    <div style={{ borderTop: first ? 'none' : `1px solid ${INK(0.06)}` }}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 py-3 text-left">
        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: type ? catColor(type, 0.16) : 'rgba(var(--accent-rgb),0.1)' }}>
          <Icon style={{ width: 16, height: 16, color, filter: type ? 'brightness(0.8)' : 'none' }} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[12.5px] truncate" style={{ color: INK(0.95) }}>{goal.title}</p>
            {fresh && (
              <span className="px-1.5 rounded-full text-[8.5px]" style={{ background: 'rgba(var(--accent-rgb),0.14)', color: 'var(--accent)' }}>
                nueva
              </span>
            )}
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: INK(0.45) }}>
            {last ? `Última mejora ${ago(last)}` : 'Aún sin mejoras'}
            {daysSince != null && daysSince > 45 && ' · ¿a por ella?'}
          </p>
        </div>
        <Sparkline points={points} color={color} />
        <div className="text-right flex-shrink-0" style={{ minWidth: 58 }}>
          <p className="text-[17px] leading-none" style={{ fontFamily: MONO, color: INK(0.95) }}>
            {fmtVal(goal.current_value)}<span className="text-[10px] ml-0.5" style={{ color: INK(0.45) }}>{goal.unit}</span>
          </p>
          {gain != null && gain !== 0 && (
            <p className="text-[10px] mt-1" style={{ fontFamily: MONO, color: gain > 0 ? 'var(--accent)' : INK(0.45) }}>
              {lower ? (gain > 0 ? '−' : '+') : (gain > 0 ? '+' : '−')}{fmtVal(Math.abs(gain))} {goal.unit}
            </p>
          )}
        </div>
      </button>
      {toTarget != null && (
        <div className="flex items-center gap-2 -mt-1 mb-3 ml-12">
          <div className="relative flex-1 h-1 rounded-full" style={{ background: INK(0.08) }}>
            <div className="absolute top-0 left-0 h-full rounded-full" style={{ width: `${toTarget * 100}%`, background: color, opacity: 0.85 }} />
          </div>
          <span className="text-[9.5px]" style={{ fontFamily: MONO, color: reached ? 'var(--accent)' : INK(0.45) }}>
            {reached ? '¡meta lograda!' : `meta ${fmtVal(target)} ${goal.unit}`}
          </span>
        </div>
      )}

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="pb-3 pl-12">
              {/* Nueva marca */}
              <div className="flex items-center gap-2">
                <input type="number" inputMode="decimal" value={val} onChange={e => setVal(e.target.value)}
                  placeholder={`Nueva marca${goal.unit ? ` (${goal.unit})` : ''}`}
                  className="flex-1 rounded-full px-3.5 py-2 text-[12px] focus:outline-none"
                  style={{ background: INK(0.05), border: `1px solid ${INK(0.1)}`, color: INK(0.95) }} />
                <button disabled={val === ''} onClick={() => { onUpdateMark(goal.id, val); setVal(''); }}
                  className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-30"
                  style={{ background: 'var(--accent)' }} aria-label="Guardar marca">
                  <Check className="w-4 h-4" style={{ color: 'var(--on-accent)' }} />
                </button>
              </div>

              {/* Historial */}
              {history.length > 0 && (
                <div className="mt-3">
                  {[...history].reverse().slice(0, 5).map(h => (
                    <div key={h.id} className="flex justify-between py-1 text-[10.5px]">
                      <span style={{ color: INK(0.45) }}>
                        {new Date(`${h.date}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </span>
                      <span style={{ fontFamily: MONO, color: INK(0.75) }}>
                        {h.old_value != null && <span style={{ color: INK(0.35) }}>{fmtVal(h.old_value)} → </span>}
                        {fmtVal(h.new_value)} {goal.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={() => onDelete(goal.id)} className="mt-2 flex items-center gap-1.5 text-[10.5px]"
                style={{ color: INK(0.4) }}>
                <Trash2 className="w-3 h-3" /> Eliminar marca
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function GoalsSection({ goals = [], prs = [], onCreate, onUpdateMark, onDelete, titleStyle, header }) {
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', value: '', unit: '', type: '', target: '', lower: false });

  const historyOf = useMemo(() => {
    const m = {};
    prs.forEach(p => { (m[p.goal_id] = m[p.goal_id] || []).push(p); });
    Object.values(m).forEach(l => l.sort((a, b) => (a.date || '').localeCompare(b.date || '')));
    return m;
  }, [prs]);

  const submit = async () => {
    if (!form.title.trim()) return;
    await onCreate({
      title: form.title.trim(),
      unit: form.unit.trim(),
      current_value: form.value !== '' ? Number(form.value) : null,
      activity_type: form.type || null,
      target_value: form.target !== '' ? Number(form.target) : null,
      lower_is_better: form.lower,
    });
    setForm({ title: '', value: '', unit: '', type: '', target: '', lower: false });
    setAdding(false);
  };

  const field = { background: INK(0.05), border: `1px solid ${INK(0.1)}`, color: INK(0.95) };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        {header ?? <h2 style={titleStyle}>Marcas personales</h2>}
        <button onClick={() => setAdding(v => !v)}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90"
          style={{
            background: 'var(--glass-bg)', backdropFilter: 'blur(24px) saturate(160%)',
            WebkitBackdropFilter: 'blur(24px) saturate(160%)', border: '1px solid var(--glass-border)',
          }}
          aria-label={adding ? 'Cancelar' : 'Nueva marca'}>
          {adding ? <X className="w-3.5 h-3.5" style={{ color: INK(0.7) }} /> : <Plus className="w-3.5 h-3.5" style={{ color: INK(0.7) }} />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {adding && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="py-3 space-y-2">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Press banca, 10K, dominadas…"
                className="w-full rounded-full px-4 py-2.5 text-[12px] focus:outline-none" style={field} />
              <div className="flex gap-2">
                <input type="number" inputMode="decimal" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  placeholder="Tu marca actual" className="flex-1 rounded-full px-4 py-2.5 text-[12px] focus:outline-none" style={field} />
                <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="kg, min, reps" className="w-[110px] rounded-full px-4 py-2.5 text-[12px] focus:outline-none" style={field} />
              </div>
              <div className="flex gap-2">
                <input type="number" inputMode="decimal" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
                  placeholder="Meta a batir (opcional)" className="flex-1 rounded-full px-4 py-2.5 text-[12px] focus:outline-none" style={field} />
                <div className="grid grid-cols-2 p-1 rounded-full" style={{ background: INK(0.05) }}>
                  {[[false, 'Más'], [true, 'Menos']].map(([v, l]) => (
                    <button key={l} onClick={() => setForm(f => ({ ...f, lower: v }))}
                      className="px-3 py-1 rounded-full text-[10.5px]"
                      style={form.lower === v ? { background: 'var(--surface)', color: INK(0.95), boxShadow: '0 1px 4px rgba(0,0,0,0.1)' } : { color: INK(0.5) }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[9.5px] -mt-1 px-2" style={{ color: INK(0.4) }}>
                {form.lower ? 'Menos es mejor — tiempos, ritmo por km…' : 'Más es mejor — kilos, repeticiones, distancia…'}
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {[['', 'General'], ...Object.entries(ACTIVITY_TYPES).map(([k, v]) => [k, v.label])].map(([k, l]) => {
                  const on = form.type === k;
                  const I = k ? iconFor(k) : Trophy;
                  return (
                    <button key={k || 'gen'} onClick={() => setForm(f => ({ ...f, type: k }))}
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
              <button onClick={submit} disabled={!form.title.trim()}
                className="w-full py-2.5 rounded-full text-[12.5px] disabled:opacity-40"
                style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
                Guardar marca
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {goals.length === 0 && !adding ? (
        <button onClick={() => setAdding(true)} className="w-full py-6 text-center">
          <p className="text-[12px]" style={{ color: INK(0.6) }}>Registra tu primera marca</p>
          <p className="text-[10.5px] mt-1" style={{ color: INK(0.4) }}>Tu mejor levantamiento, tu mejor tiempo… y bátela.</p>
        </button>
      ) : (
        goals.map((g, i) => (
          <GoalRow key={g.id} goal={g} first={i === 0}
            history={historyOf[g.id] || []}
            open={openId === g.id}
            onToggle={() => setOpenId(o => (o === g.id ? null : g.id))}
            onUpdateMark={onUpdateMark}
            onDelete={(id) => { setOpenId(null); onDelete(id); }}
          />
        ))
      )}
    </div>
  );
}
