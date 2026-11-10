import React, { useState, useEffect } from 'react';
import { TrendingUp, Trophy, Minus, Plus, Shield, AlertCircle } from 'lucide-react';
import { iconFor, catColor } from '@/utils/activityIcons';
import { ACTIVITY_TYPES } from '@/hooks/useActivities';
import { MUSCLE_GROUPS, detectMuscleGroups, muscleLabel } from '@/utils/muscles';
import { Sheet, SheetTitle, Segmented, StatusLine, useToast } from '@/components/ui';
import { haptic } from '@/lib/haptics';

const TEXT_PRIMARY = 'rgba(var(--ink),0.95)';
const TEXT_SECONDARY = 'rgba(var(--ink),0.65)';
const TEXT_MUTED = 'rgba(var(--ink),0.45)';
const ACCENT = 'var(--accent)';
const ON_ACCENT = 'var(--on-accent)';
const MONO = 'var(--font-mono)';

const TRACKABLE_TYPES = ['strength_training', 'running', 'swimming'];
const MAX_MINUTES = 1440;

function formatLocalDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const fmtShort = m => (m < 60 ? `${m}m` : m % 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m / 60}h`);

function Label({ children, htmlFor }) {
  const Tag = htmlFor ? 'label' : 'p';
  return (
    <Tag htmlFor={htmlFor} className="block text-[11px] mb-2" style={{ color: TEXT_MUTED, letterSpacing: '0.04em' }}>{children}</Tag>
  );
}

// Opción seleccionable (resultado, tipo de sesión, grupo muscular, duración).
const optionStyle = on => (on
  ? { background: 'rgba(var(--accent-rgb),0.14)', color: 'var(--accent)', boxShadow: 'inset 0 0 0 1px var(--accent)' }
  : { background: 'rgba(var(--ink),0.05)', color: TEXT_MUTED });

// `recent`: últimas sesiones distintas del usuario ([{ type, duration_minutes }])
// para repetir una actividad habitual con un toque.
export default function LogActivityDialog({ isOpen, onClose, onSubmit, onSubmitPlan, selectedDate, goals = [], onPrBeaten, editActivity = null, onUpdate, prefillPlan = null, recent = [] }) {
  const toast = useToast();
  const [mode, setMode] = useState('realized'); // 'realized' | 'planned'
  const [activityType, setActivityType] = useState('');
  const [trainingType, setTrainingType] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [progressNote, setProgressNote] = useState('');
  const [dateInput, setDateInput] = useState(selectedDate ? formatLocalDate(selectedDate) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  // Con cambios sin guardar, tocar fuera no cierra la hoja (no se pierde lo escrito)
  const [dirty, setDirty] = useState(false);
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
    setError(false);
    setDirty(false);
  };

  // Al cerrar, limpiamos el formulario para no arrastrar datos entre aperturas
  useEffect(() => { if (!isOpen) resetForm(); }, [isOpen]);

  const todayStr = formatLocalDate(new Date());
  const dur = parseInt(durationMinutes) || 0;
  const durOk = dur > 0 && dur <= MAX_MINUTES;
  const canFlipMode = !editActivity && !prefillPlan;

  // Una actividad hecha no puede estar en el futuro: elegir un día futuro pasa
  // a «Planificada», y volver a «Hecha» con un día futuro lo trae a hoy.
  const pickDate = (ds) => {
    setDateInput(ds);
    if (canFlipMode && ds) setMode(ds > todayStr ? 'planned' : mode);
  };
  const pickMode = (m) => {
    setMode(m);
    if (m === 'realized' && dateInput > todayStr) setDateInput(todayStr);
  };

  const handleSubmit = async () => {
    if (!activityType || !durOk || !dateInput || loading) return;
    setLoading(true);
    setError(false);
    try {
      let message = 'Actividad guardada';
      if (editActivity) {
        await onUpdate(editActivity.id, {
          type: activityType,
          title: ACTIVITY_TYPES[activityType]?.label || activityType,
          training_type: showTrainingType ? (trainingType || null) : null,
          duration_minutes: dur,
          date: dateInput,
          description: notes || null,
          match_result: matchResult ? { result: matchResult } : null,
          muscle_groups: muscleGroups.length > 0 ? muscleGroups : null,
          manually_edited: true,
        });
        message = 'Cambios guardados';
      } else if (mode === 'planned') {
        if (!onSubmitPlan) throw new Error('LogActivityDialog: falta onSubmitPlan');
        await onSubmitPlan({
          date: dateInput,
          activity_type: activityType,
          duration_minutes: dur,
          notes: notes || null,
        });
        message = 'Plan guardado';
      } else {
        const saved = await onSubmit({
          type: activityType,
          title: ACTIVITY_TYPES[activityType]?.label || activityType,
          training_type: showTrainingType ? (trainingType || null) : null,
          duration_minutes: dur,
          date: dateInput,
          description: notes || null,
          progress_note: showProgressNote ? (progressNote || null) : null,
          match_result: matchResult ? { result: matchResult } : null,
          muscle_groups: muscleGroups.length > 0 ? muscleGroups : null,
          source: 'manual',
          completed: true,
        });
        // Si WHOOP ya había importado la sesión, se ha enlazado con ella: se dice.
        if (saved?.whoop_id) message = 'Guardada y enlazada con tu sesión de WHOOP';

        // Procesar marcas batidas
        const beatenEntries = Object.entries(prBeaten).filter(([, v]) => v !== '' && v != null);
        if (beatenEntries.length > 0 && onPrBeaten) {
          await onPrBeaten(
            beatenEntries.map(([goalId, newValue]) => ({ goalId, newValue })),
            dateInput
          );
        }
      }
      haptic();
      toast({ message });
      resetForm();
      onClose();
    } catch (err) {
      console.error('Error al guardar:', err);
      setError(true);
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
  const fieldStyle = { background: 'rgba(var(--ink),0.06)', border: '1px solid rgba(var(--ink),0.1)', color: TEXT_PRIMARY };
  const title = editActivity ? 'Editar actividad' : prefillPlan ? 'Completar plan' : (mode === 'planned' ? 'Planificar' : 'Registrar actividad');
  const showRecent = canFlipMode && recent.length > 0;

  return (
    <Sheet onClose={onClose} maxHeight="92dvh" label={title} dismissOnScrim={!dirty} header={<>
          <SheetTitle title={title} onClose={onClose} className="mb-3" />

          {/* Segmentado Hecha / Planificada */}
          {canFlipMode && (
            <Segmented className="mb-4" label="Tipo de registro" value={mode} onChange={pickMode}
              options={[['realized', 'Hecha'], ['planned', 'Planificada']]} />
          )}
      </>}>

        <div className="overflow-y-auto overscroll-contain flex-1 px-5 pb-4 space-y-5"
          onClickCapture={() => setDirty(true)} onInputCapture={() => setDirty(true)}>

          {/* Repetir — las últimas sesiones distintas, con un toque */}
          {showRecent && (
            <div>
              <Label>Repetir</Label>
              <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5" style={{ scrollbarWidth: 'none' }}>
                {recent.map(r => {
                  const Icon = iconFor(r.type);
                  const on = activityType === r.type && dur === r.duration_minutes;
                  return (
                    <button key={r.type} type="button" aria-pressed={on}
                      onClick={() => { handleActivityTypeChange(r.type); setDurationMinutes(String(r.duration_minutes)); }}
                      className="o-press flex-shrink-0 flex items-center gap-2 pl-2.5 pr-3.5 rounded-full transition-ui duration-150"
                      style={{ height: 40, ...(on
                        ? { background: catColor(r.type, 0.18), boxShadow: `inset 0 0 0 1.5px ${catColor(r.type, 0.85)}` }
                        : { background: 'rgba(var(--ink),0.05)' }) }}>
                      <Icon style={{ width: 15, height: 15, color: catColor(r.type, 1), filter: 'brightness(0.85)' }} strokeWidth={1.7} />
                      <span className="text-[12px]" style={{ color: TEXT_PRIMARY }}>{ACTIVITY_TYPES[r.type]?.label || r.type}</span>
                      <span className="text-[11px]" style={{ fontFamily: MONO, color: TEXT_MUTED }}>{fmtShort(r.duration_minutes)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tipo de actividad — rejilla de símbolos */}
          <div>
            <Label>Actividad</Label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(ACTIVITY_TYPES).map(([key, { label }]) => {
                const Icon = iconFor(key);
                const on = activityType === key;
                return (
                  <button key={key} type="button" aria-pressed={on} onClick={() => handleActivityTypeChange(key)}
                    className="o-press relative flex flex-col items-center gap-1.5 py-2.5 rounded-2xl"
                    style={on
                      ? (mode === 'planned'
                        // Planificada → mismo lenguaje que el día planificado: rayas en su color
                        ? { background: `radial-gradient(circle, ${catColor(key, 0.14)} 0%, transparent 80%)`, border: `1.5px dashed ${catColor(key, 0.95)}` }
                        // Hecha → halo y marco continuo en su color, como el día completado
                        : { background: catColor(key, 0.18), boxShadow: `inset 0 0 0 1.5px ${catColor(key, 0.85)}`, border: '1.5px solid transparent' })
                      : { background: 'rgba(var(--ink),0.05)', border: '1.5px solid transparent' }}>
                    <span className="absolute top-1.5 right-1.5 rounded-full" style={{ width: 5, height: 5, background: catColor(key, 0.9) }} />
                    <Icon style={{ width: 18, height: 18, color: on ? catColor(key, 1) : TEXT_SECONDARY, filter: on ? 'brightness(0.8)' : 'none' }} strokeWidth={on ? 2.2 : 1.7} />
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
              <label className="relative text-[11px] -mt-2 py-1.5 pl-3" style={{ color: TEXT_SECONDARY }}>
                Otra fecha
                <input type="date" value={dateInput} onChange={(e) => pickDate(e.target.value)}
                  aria-label="Otra fecha" className="absolute inset-0 opacity-0" />
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
                  <button key={ds} type="button" aria-pressed={on} data-sel={on ? '1' : '0'} onClick={() => pickDate(ds)}
                    aria-label={d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    className="o-press flex-shrink-0 flex flex-col items-center justify-center rounded-2xl"
                    style={{
                      width: 44, height: 54,
                      ...(on ? { background: 'var(--accent)', color: ON_ACCENT }
                        : { background: 'rgba(var(--ink),0.05)', color: TEXT_SECONDARY }),
                    }}>
                    <span className="text-[9px]" style={{ opacity: 0.75 }}>{isToday ? 'Hoy' : DOW_SHORT[d.getDay()]}</span>
                    <span className="text-[14px]" style={{ fontFamily: MONO }}>{d.getDate()}</span>
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
            <Label htmlFor="log-duration">Duración</Label>
            <div className="flex items-center justify-between rounded-2xl px-2 py-2" style={{ background: 'rgba(var(--ink),0.05)' }}>
              <button type="button" disabled={dur <= 5} onClick={() => setDurationMinutes(String(Math.max(5, dur - 5)))}
                className="o-press w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-40" style={{ background: 'var(--surface)' }} aria-label="Menos 5 minutos">
                <Minus className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
              </button>
              <div className="flex items-baseline gap-1">
                <input id="log-duration" type="number" inputMode="numeric" min="1" max={MAX_MINUTES} value={durationMinutes} placeholder="0"
                  onChange={(e) => setDurationMinutes(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                  className="w-16 text-center bg-transparent focus:outline-none text-[26px]"
                  style={{ fontFamily: MONO, color: TEXT_PRIMARY }} />
                <span className="text-[11px]" style={{ color: TEXT_MUTED }}>min</span>
              </div>
              <button type="button" disabled={dur >= MAX_MINUTES} onClick={() => setDurationMinutes(String(Math.min(MAX_MINUTES, dur + 5)))}
                className="o-press w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-40" style={{ background: 'var(--surface)' }} aria-label="Más 5 minutos">
                <Plus className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
              </button>
            </div>
            <div className="flex gap-1.5 mt-2">
              {[30, 45, 60, 90, 120].map(m => (
                <button key={m} type="button" aria-pressed={dur === m} onClick={() => setDurationMinutes(String(m))}
                  className="o-press flex-1 py-2.5 rounded-full text-[11px] transition-ui duration-150"
                  style={{ fontFamily: MONO, ...optionStyle(dur === m) }}>
                  {fmtShort(m)}
                </button>
              ))}
            </div>
            {dur > MAX_MINUTES && (
              <StatusLine icon={AlertCircle} className="mt-2">Como mucho, 24 h por actividad.</StatusLine>
            )}
          </div>

          {/* Resultado — pádel realizado */}
          {mode === 'realized' && activityType === 'padel' && (
            <div>
              <Label>Resultado</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {[['win','Victoria'],['draw','Empate'],['loss','Derrota']].map(([val, label]) => (
                  <button key={val} type="button" aria-pressed={matchResult === val} onClick={() => setMatchResult(v => v === val ? null : val)}
                    className="o-press py-2.5 rounded-full text-[11px] transition-ui duration-150"
                    style={optionStyle(matchResult === val)}>
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
                  <button key={k} type="button" aria-pressed={trainingType === k} onClick={() => setTrainingType(t => t === k ? '' : k)}
                    className="o-press py-2.5 rounded-2xl text-[11px] flex items-center justify-center gap-1.5 transition-ui duration-150"
                    style={trainingType === k ? optionStyle(true) : { background: 'rgba(var(--ink),0.05)', color: TEXT_SECONDARY }}>
                    <Icon className="w-3.5 h-3.5" /> {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showProgressNote && (
            <div>
              <Label htmlFor="log-progress">¿En qué progresaste?</Label>
              <textarea id="log-progress" value={progressNote} onChange={(e) => setProgressNote(e.target.value)} rows={1}
                placeholder="He subido a 100 kg en press banca"
                className="w-full rounded-2xl px-3.5 py-2.5 text-[12px] focus:outline-none resize-none" style={fieldStyle} />
            </div>
          )}

          {/* Notas / nombre del entreno */}
          <div>
            <Label htmlFor="log-notes">{activityType === 'strength_training' ? 'Qué entrenaste' : 'Notas'}</Label>
            <textarea id="log-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
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
                      <button key={g.key} type="button" aria-pressed={on}
                        onClick={() => setMuscleGroups(prev => on ? prev.filter(k => k !== g.key) : [...prev, g.key])}
                        className="o-press px-3.5 py-2.5 rounded-full text-[11px] transition-ui duration-150"
                        style={optionStyle(on)}>
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
                      <button type="button" aria-pressed={isSelected} onClick={() => togglePr(goal.id)} className="w-full flex items-center justify-between px-3.5 py-3 text-left">
                        <div>
                          <p className="text-[12px]" style={{ color: TEXT_PRIMARY }}>{goal.title}</p>
                          {goal.current_value != null && (
                            <p className="text-[10px]" style={{ fontFamily: MONO, color: TEXT_MUTED }}>
                              Actual {goal.current_value} {goal.unit}
                            </p>
                          )}
                        </div>
                        <Trophy className="w-4 h-4" style={{ color: isSelected ? 'var(--accent)' : 'rgba(var(--ink),0.25)' }} />
                      </button>
                      {isSelected && (
                        <div className="px-3.5 pb-2.5 flex items-center gap-2">
                          <input type="number" inputMode="decimal" value={prBeaten[goal.id]} placeholder="Nueva marca"
                            aria-label={`Nueva marca de ${goal.title}`}
                            onChange={(e) => setPrBeaten(prev => ({ ...prev, [goal.id]: e.target.value }))}
                            className="flex-1 rounded-2xl px-3 py-2 text-[12px] focus:outline-none" style={fieldStyle} />
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
          {error && (
            <StatusLine icon={AlertCircle} className="mb-2 justify-center">
              No se ha guardado. Vuelve a intentarlo.
            </StatusLine>
          )}
          <button type="button" onClick={handleSubmit}
            disabled={!activityType || !durOk || !dateInput || loading}
            aria-busy={loading}
            className="o-press w-full py-3.5 rounded-full flex items-center justify-center gap-2 text-[14px] disabled:opacity-40"
            style={{ background: ACCENT, color: ON_ACCENT }}>
            {loading ? (
              <div className="w-4 h-4 border-2 rounded-full animate-spin"
                style={{ borderColor: 'rgba(var(--accent-rgb),0.3)', borderTopColor: 'var(--on-accent)' }} />
            ) : (
              error ? 'Reintentar' : editActivity ? 'Guardar cambios' : prefillPlan ? 'Marcar como hecha' : (mode === 'planned' ? 'Planificar' : 'Guardar actividad')
            )}
          </button>
        </div>
    </Sheet>
  );
}
