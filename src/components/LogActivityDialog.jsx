import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, TrendingUp, Trophy, Minus, Plus, Shield } from 'lucide-react';
import { iconFor } from '@/utils/activityIcons';
import { ACTIVITY_TYPES } from '@/hooks/useActivities';
import { MUSCLE_GROUPS, detectMuscleGroups, muscleLabel } from '@/utils/muscles';

const TEXT_PRIMARY = 'rgba(var(--ink),0.95)';
const TEXT_SECONDARY = 'rgba(var(--ink),0.65)';
const TEXT_MUTED = 'rgba(var(--ink),0.45)';
const ACCENT = 'var(--accent)';
const ON_ACCENT = 'var(--on-accent)';

const TRACKABLE_TYPES = ['strength_training', 'running', 'swimming'];

function formatLocalDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function LogActivityDialog({ isOpen, onClose, onSubmit, onSubmitPlan, selectedDate, goals = [], onPrBeaten, editActivity = null, onUpdate, prefillPlan = null }) {
  const [mode, setMode] = useState('realized'); // 'realized' | 'planned'
  const [activityType, setActivityType] = useState('');
  const [trainingType, setTrainingType] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [progressNote, setProgressNote] = useState('');
  const [dateInput, setDateInput] = useState(selectedDate ? formatLocalDate(selectedDate) : '');
  const [loading, setLoading] = useState(false);
  const [matchResult, setMatchResult] = useState(null); // 'win' | 'loss' | 'draw'
  const [muscleGroups, setMuscleGroups] = useState([]); // respuesta manual si no se reconoce

  // Estado para marcas batidas: { [goalId]: newValue (string) }
  const [prBeaten, setPrBeaten] = useState({});

  useEffect(() => {
    if (isOpen && selectedDate) setDateInput(formatLocalDate(selectedDate));
  }, [isOpen, selectedDate]);

  // Abierta desde un día futuro → por defecto, planificar
  useEffect(() => {
    if (!isOpen || editActivity || prefillPlan || !selectedDate) return;
    const t = new Date(); t.setHours(23, 59, 59, 999);
    setMode(selectedDate > t ? 'planned' : 'realized');
  }, [isOpen, selectedDate, editActivity, prefillPlan]);

  // Resetear prBeaten cuando cambia el tipo de actividad
  useEffect(() => { setPrBeaten({}); }, [activityType]);

  // Modo edición: precargar los campos con la actividad existente
  useEffect(() => {
    if (isOpen && editActivity) {
      setMode('realized');
      setActivityType(editActivity.type || '');
      setDurationMinutes(editActivity.duration_minutes != null ? String(editActivity.duration_minutes) : '');
      setDateInput(editActivity.date || '');
      setNotes(editActivity.description || '');
      setTrainingType(editActivity.training_type || '');
      setMatchResult(editActivity.match_result?.result || null);
      setMuscleGroups(Array.isArray(editActivity.muscle_groups) ? editActivity.muscle_groups : []);
    }
  }, [isOpen, editActivity]);

  // Convertir planificado en realizado: precargar campos desde el plan
  useEffect(() => {
    if (isOpen && prefillPlan && !editActivity) {
      setMode('realized');
      setActivityType(prefillPlan.activity_type || '');
      setDurationMinutes(''); // minutos vacíos: se rellenan con los reales al completar
      setDateInput(prefillPlan.date || '');
      setNotes(prefillPlan.notes || '');
    }
  }, [isOpen, prefillPlan, editActivity]);

  const showTrainingType = mode === 'realized' && TRACKABLE_TYPES.includes(activityType);
  const showProgressNote = mode === 'realized' && trainingType === 'progress';

  // Metas relevantes para el tipo de actividad seleccionado
  const relevantGoals = goals.filter(g =>
    !g.activity_type || g.activity_type === activityType
  );
  const showPrSection = mode === 'realized' && activityType && relevantGoals.length > 0;

  const resetForm = () => {
    setActivityType('');
    setTrainingType('');
    setDurationMinutes('');
    setNotes('');
    setProgressNote('');
    setMode('realized');
    setPrBeaten({});
    setMatchResult(null);
    setMuscleGroups([]);
  };

  // Al cerrar, limpiamos el formulario para no arrastrar datos entre aperturas
  useEffect(() => { if (!isOpen) resetForm(); }, [isOpen]);

  const handleSubmit = async () => {
    if (!activityType || !durationMinutes || !dateInput) return;
    setLoading(true);
    try {
      if (editActivity) {
        await onUpdate(editActivity.id, {
          type: activityType,
          title: ACTIVITY_TYPES[activityType]?.label || activityType,
          training_type: showTrainingType ? (trainingType || null) : null,
          duration_minutes: parseInt(durationMinutes),
          date: dateInput,
          description: notes || null,
          match_result: matchResult ? { result: matchResult } : null,
          muscle_groups: muscleGroups.length > 0 ? muscleGroups : null,
          manually_edited: true,
        });
      } else if (mode === 'planned') {
        if (!onSubmitPlan) { console.error('LogActivityDialog: falta onSubmitPlan'); return; }
        await onSubmitPlan({
          date: dateInput,
          activity_type: activityType,
          duration_minutes: parseInt(durationMinutes),
          notes: notes || null,
        });
      } else {
        await onSubmit({
          type: activityType,
          title: ACTIVITY_TYPES[activityType]?.label || activityType,
          training_type: showTrainingType ? (trainingType || null) : null,
          duration_minutes: parseInt(durationMinutes),
          date: dateInput,
          description: notes || null,
          progress_note: showProgressNote ? (progressNote || null) : null,
          match_result: matchResult ? { result: matchResult } : null,
          muscle_groups: muscleGroups.length > 0 ? muscleGroups : null,
          source: 'manual',
          completed: true,
        });

        // Procesar marcas batidas
        const beatenEntries = Object.entries(prBeaten).filter(([, v]) => v !== '' && v != null);
        if (beatenEntries.length > 0 && onPrBeaten) {
          await onPrBeaten(
            beatenEntries.map(([goalId, newValue]) => ({ goalId, newValue })),
            dateInput
          );
        }
      }
      resetForm();
      onClose();
    } catch (err) {
      console.error('Error al guardar:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivityTypeChange = (type) => {
    setActivityType(type);
    if (!TRACKABLE_TYPES.includes(type)) {
      setTrainingType('');
      setProgressNote('');
    }
  };

  const togglePr = (goalId) => {
    setPrBeaten(prev => {
      const next = { ...prev };
      if (goalId in next) delete next[goalId];
      else next[goalId] = '';
      return next;
    });
  };

  if (!isOpen) return null;

  // Días seleccionables en la tira de fecha: 7 atrás y 14 adelante
  const dayChips = (() => {
    const base = new Date(); base.setHours(0, 0, 0, 0);
    return Array.from({ length: 22 }, (_, i) => { const d = new Date(base); d.setDate(base.getDate() - 7 + i); return d; });
  })();
  const DOW_SHORT = ['D','L','M','X','J','V','S'];
  const todayStr = formatLocalDate(new Date());
  const dur = parseInt(durationMinutes) || 0;
  const fieldStyle = { background: 'rgba(var(--ink),0.06)', border: '1px solid rgba(var(--ink),0.1)', color: TEXT_PRIMARY };
  const Label = ({ children }) => (
    <p className="text-[11px] mb-2" style={{ color: TEXT_MUTED, letterSpacing: '0.04em' }}>{children}</p>
  );

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: 'var(--scrim)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg flex flex-col"
        style={{
          maxHeight: '92dvh',
          background: 'var(--surface)',
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          boxShadow: '0 -12px 40px rgba(0,0,0,0.35)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        initial={{ y: '100%' }} animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => { if (info.offset.y > 120) onClose(); }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Asa + cabecera */}
        <div className="flex-shrink-0 pt-2.5 px-5">
          <div className="mx-auto mb-3 rounded-full" style={{ width: 36, height: 4, background: 'rgba(var(--ink),0.18)' }} />
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px]" style={{ color: TEXT_PRIMARY, letterSpacing: '0.04em' }}>
              {editActivity ? 'Editar actividad' : prefillPlan ? 'Completar plan' : (mode === 'planned' ? 'Planificar' : 'Registrar actividad')}
            </h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(var(--ink),0.07)' }} aria-label="Cerrar">
              <X className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
            </button>
          </div>

          {/* Segmentado Hecha / Planificada */}
          {!editActivity && !prefillPlan && (
            <div className="grid grid-cols-2 p-1 rounded-full mb-4"
              style={{ background: 'rgba(var(--ink),0.06)', border: '1px solid var(--glass-border)' }}>
              {[['realized', 'Hecha'], ['planned', 'Planificada']].map(([k, l]) => (
                <button key={k} onClick={() => setMode(k)}
                  className="py-1.5 rounded-full text-[12px] transition-all"
                  style={mode === k
                    ? { background: 'var(--surface)', color: TEXT_PRIMARY, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }
                    : { color: TEXT_MUTED }}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1 px-5 pb-4 space-y-5">
          {/* Tipo de actividad — rejilla de símbolos */}
          <div>
            <Label>Actividad</Label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(ACTIVITY_TYPES).map(([key, { label }]) => {
                const Icon = iconFor(key);
                const on = activityType === key;
                return (
                  <button key={key} onClick={() => handleActivityTypeChange(key)}
                    className="flex flex-col items-center gap-1.5 py-2.5 rounded-2xl transition-all active:scale-95"
                    style={on
                      ? { background: 'rgba(var(--accent-rgb),0.12)', boxShadow: 'inset 0 0 0 1.5px var(--accent)' }
                      : { background: 'rgba(var(--ink),0.05)' }}>
                    <Icon style={{ width: 18, height: 18, color: on ? 'var(--accent)' : TEXT_SECONDARY }} strokeWidth={on ? 2.2 : 1.7} />
                    <span className="text-[9.5px] leading-tight text-center px-1" style={{ color: on ? TEXT_PRIMARY : TEXT_MUTED }}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fecha — tira de días deslizable */}
          <div>
            <div className="flex items-center justify-between">
              <Label>Fecha</Label>
              <label className="relative text-[10px] -mt-2" style={{ color: TEXT_MUTED }}>
                Otra fecha
                <input type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)}
                  className="absolute inset-0 opacity-0" />
              </label>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}
              ref={el => {
                if (el && !el.dataset.scrolled) {
                  const sel = el.querySelector('[data-sel="1"]');
                  if (sel) el.scrollLeft = sel.offsetLeft - el.clientWidth / 2 + sel.clientWidth / 2;
                  el.dataset.scrolled = '1';
                }
              }}>
              {dayChips.map(d => {
                const ds = formatLocalDate(d);
                const on = ds === dateInput;
                const isToday = ds === todayStr;
                return (
                  <button key={ds} data-sel={on ? '1' : '0'} onClick={() => setDateInput(ds)}
                    className="flex-shrink-0 flex flex-col items-center justify-center rounded-2xl transition-all"
                    style={{
                      width: 44, height: 54,
                      ...(on ? { background: 'var(--accent)', color: ON_ACCENT }
                        : { background: 'rgba(var(--ink),0.05)', color: TEXT_SECONDARY }),
                    }}>
                    <span className="text-[9px]" style={{ opacity: 0.75 }}>{isToday ? 'Hoy' : DOW_SHORT[d.getDay()]}</span>
                    <span className="text-[14px]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
            {dateInput && (
              <p className="text-[10px] mt-1.5 capitalize" style={{ color: TEXT_MUTED }}>
                {parseLocalDate(dateInput).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>

          {/* Duración — número grande con pasos */}
          <div>
            <Label>Duración</Label>
            <div className="flex items-center justify-between rounded-2xl px-2 py-2" style={{ background: 'rgba(var(--ink),0.05)' }}>
              <button onClick={() => setDurationMinutes(String(Math.max(0, dur - 5)))}
                className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--surface)' }} aria-label="Menos 5 minutos">
                <Minus className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
              </button>
              <div className="flex items-baseline gap-1">
                <input type="number" inputMode="numeric" value={durationMinutes} placeholder="0"
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-16 text-center bg-transparent focus:outline-none text-[26px]"
                  style={{ fontFamily: '"JetBrains Mono", monospace', color: TEXT_PRIMARY }} />
                <span className="text-[11px]" style={{ color: TEXT_MUTED }}>min</span>
              </div>
              <button onClick={() => setDurationMinutes(String(dur + 5))}
                className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'var(--surface)' }} aria-label="Más 5 minutos">
                <Plus className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
              </button>
            </div>
            <div className="flex gap-1.5 mt-2">
              {[30, 45, 60, 90, 120].map(m => (
                <button key={m} onClick={() => setDurationMinutes(String(m))}
                  className="flex-1 py-1.5 rounded-full text-[10px] transition-all"
                  style={dur === m
                    ? { background: 'rgba(var(--accent-rgb),0.14)', color: 'var(--accent)', boxShadow: 'inset 0 0 0 1px var(--accent)' }
                    : { background: 'rgba(var(--ink),0.05)', color: TEXT_MUTED }}>
                  {m < 60 ? `${m}m` : m % 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m / 60}h`}
                </button>
              ))}
            </div>
          </div>

          {/* Resultado — pádel realizado */}
          {mode === 'realized' && activityType === 'padel' && (
            <div>
              <Label>Resultado</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {[['win','Victoria'],['draw','Empate'],['loss','Derrota']].map(([val, label]) => (
                  <button key={val} onClick={() => setMatchResult(v => v === val ? null : val)}
                    className="py-2 rounded-full text-[11px] transition-all"
                    style={matchResult === val
                      ? { background: 'rgba(var(--accent-rgb),0.14)', color: 'var(--accent)', boxShadow: 'inset 0 0 0 1px var(--accent)' }
                      : { background: 'rgba(var(--ink),0.05)', color: TEXT_MUTED }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ¿Cómo fue? */}
          {showTrainingType && (
            <div>
              <Label>¿Cómo fue la sesión?</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {[['progress', 'Progreso', TrendingUp], ['consolidation', 'Consolidación', Shield]].map(([k, l, Icon]) => (
                  <button key={k} onClick={() => setTrainingType(t => t === k ? '' : k)}
                    className="py-2.5 rounded-2xl text-[11px] flex items-center justify-center gap-1.5 transition-all"
                    style={trainingType === k
                      ? { background: 'rgba(var(--accent-rgb),0.14)', color: 'var(--accent)', boxShadow: 'inset 0 0 0 1px var(--accent)' }
                      : { background: 'rgba(var(--ink),0.05)', color: TEXT_SECONDARY }}>
                    <Icon className="w-3.5 h-3.5" /> {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showProgressNote && (
            <div>
              <Label>¿En qué progresaste?</Label>
              <textarea value={progressNote} onChange={(e) => setProgressNote(e.target.value)} rows={1}
                placeholder="He subido a 100 kg en press banca"
                className="w-full rounded-2xl px-3.5 py-2.5 text-[12px] focus:outline-none resize-none" style={fieldStyle} />
            </div>
          )}

          {/* Notas / nombre del entreno */}
          <div>
            <Label>{activityType === 'strength_training' ? 'Qué entrenaste' : 'Notas'}</Label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder={activityType === 'strength_training' ? 'Push: banca, militar, fondos' : 'Cómo te has sentido…'}
              className="w-full rounded-2xl px-3.5 py-2.5 text-[12px] focus:outline-none resize-none" style={fieldStyle} />
          </div>

          {/* Grupos musculares — sólo fuerza realizada */}
          {mode === 'realized' && activityType === 'strength_training' && (() => {
            const detected = detectMuscleGroups(`${notes} ${progressNote}`);
            if (detected.length > 0) {
              return (
                <div className="flex flex-wrap items-center gap-1 -mt-3">
                  <span className="text-[10px] mr-1" style={{ color: TEXT_MUTED }}>Detectado</span>
                  {detected.map(k => (
                    <span key={k} className="px-2 py-0.5 rounded-full text-[10px]"
                      style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)' }}>{muscleLabel(k)}</span>
                  ))}
                </div>
              );
            }
            return (
              <div>
                <Label>¿Qué grupo muscular entrenaste?</Label>
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLE_GROUPS.map(g => {
                    const on = muscleGroups.includes(g.key);
                    return (
                      <button key={g.key} type="button"
                        onClick={() => setMuscleGroups(prev => on ? prev.filter(k => k !== g.key) : [...prev, g.key])}
                        className="px-3 py-1.5 rounded-full text-[10.5px] transition-all"
                        style={on
                          ? { background: 'rgba(var(--accent-rgb),0.14)', color: 'var(--accent)', boxShadow: 'inset 0 0 0 1px var(--accent)' }
                          : { background: 'rgba(var(--ink),0.05)', color: TEXT_MUTED }}>
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ¿Superaste alguna marca? */}
          {showPrSection && !editActivity && (
            <div>
              <Label>¿Superaste alguna marca?</Label>
              <div className="space-y-1.5">
                {relevantGoals.map(goal => {
                  const isSelected = goal.id in prBeaten;
                  return (
                    <div key={goal.id} className="rounded-2xl overflow-hidden"
                      style={{ background: isSelected ? 'rgba(var(--accent-rgb),0.08)' : 'rgba(var(--ink),0.05)',
                        boxShadow: isSelected ? 'inset 0 0 0 1px rgba(var(--accent-rgb),0.5)' : 'none' }}>
                      <button onClick={() => togglePr(goal.id)} className="w-full flex items-center justify-between px-3.5 py-2.5 text-left">
                        <div>
                          <p className="text-[12px]" style={{ color: TEXT_PRIMARY }}>{goal.title}</p>
                          {goal.current_value != null && (
                            <p className="text-[10px]" style={{ fontFamily: '"JetBrains Mono", monospace', color: TEXT_MUTED }}>
                              Actual {goal.current_value} {goal.unit}
                            </p>
                          )}
                        </div>
                        <Trophy className="w-4 h-4" style={{ color: isSelected ? 'var(--accent)' : 'rgba(var(--ink),0.25)' }} />
                      </button>
                      {isSelected && (
                        <div className="px-3.5 pb-2.5 flex items-center gap-2">
                          <input type="number" value={prBeaten[goal.id]} placeholder="Nueva marca"
                            onChange={(e) => setPrBeaten(prev => ({ ...prev, [goal.id]: e.target.value }))}
                            className="flex-1 rounded-xl px-3 py-1.5 text-[12px] focus:outline-none" style={fieldStyle} />
                          <span className="text-[11px]" style={{ color: TEXT_MUTED }}>{goal.unit}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Botón fijo */}
        <div className="flex-shrink-0 px-5 pt-2 pb-4" style={{ borderTop: '1px solid rgba(var(--ink),0.06)' }}>
          <button onClick={handleSubmit}
            disabled={!activityType || !durationMinutes || !dateInput || loading}
            className="w-full py-3.5 rounded-full flex items-center justify-center gap-2 text-[14px] disabled:opacity-40 transition-transform active:scale-[0.98]"
            style={{ background: ACCENT, color: ON_ACCENT }}>
            {loading ? (
              <div className="w-4 h-4 border-2 rounded-full animate-spin"
                style={{ borderColor: 'rgba(var(--accent-rgb),0.3)', borderTopColor: 'var(--on-accent)' }} />
            ) : (
              editActivity ? 'Guardar cambios' : prefillPlan ? 'Marcar como hecha' : (mode === 'planned' ? 'Planificar' : 'Guardar actividad')
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
