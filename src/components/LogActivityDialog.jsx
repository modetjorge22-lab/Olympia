import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, TrendingUp, Calendar as CalendarIcon, Trophy } from 'lucide-react';
import { ACTIVITY_TYPES } from '@/hooks/useActivities';

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

  // Estado para marcas batidas: { [goalId]: newValue (string) }
  const [prBeaten, setPrBeaten] = useState({});

  useEffect(() => {
    if (isOpen && selectedDate) setDateInput(formatLocalDate(selectedDate));
  }, [isOpen, selectedDate]);

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

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background: 'var(--scrim)',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(96px, calc(env(safe-area-inset-bottom) + 96px))',
        paddingLeft: 12,
        paddingRight: 12,
      }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl w-full max-w-sm flex flex-col"
        style={{
          maxHeight: '100%',
          background: 'var(--surface)',
          border: '1px solid rgba(var(--ink),0.16)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 pt-3 pb-2 flex-shrink-0">
          <h2 className="text-[13px] font-bold" style={{ color: TEXT_PRIMARY }}>
            {editActivity ? 'Editar actividad' : prefillPlan ? 'Marcar como realizada' : (mode === 'planned' ? 'Planificar actividad' : 'Nueva actividad')}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(var(--ink),0.08)' }}
          >
            <X className="w-3.5 h-3.5" style={{ color: TEXT_SECONDARY }} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-3.5 pb-3.5 space-y-3">
          {/* Toggle Realizada / Planificada — oculto al editar */}
          {!editActivity && !prefillPlan && (
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setMode('realized')}
              className="px-3 py-2 rounded-lg text-[12px] font-semibold transition-all"
              style={mode === 'realized' ? {
                background: ACCENT, color: ON_ACCENT,
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              } : {
                background: 'transparent', color: TEXT_MUTED,
                border: '1px solid rgba(var(--ink),0.14)',
              }}
            >Realizada</button>
            <button
              onClick={() => setMode('planned')}
              className="px-3 py-2 rounded-lg text-[12px] font-semibold transition-all"
              style={mode === 'planned' ? {
                background: 'transparent', color: TEXT_PRIMARY,
                boxShadow: 'inset 0 0 0 1.5px rgba(var(--accent-rgb),0.6)',
              } : {
                background: 'transparent', color: TEXT_MUTED,
                border: '1px solid rgba(var(--ink),0.14)',
              }}
            >Planificada</button>
          </div>
          )}

          {/* Date picker */}
          <div>
            <label className="block text-[9px] uppercase tracking-wider mb-1" style={{ color: TEXT_MUTED }}>Fecha</label>
            <div className="relative">
              <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: TEXT_MUTED }} />
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="w-full rounded-lg pl-8 pr-3 py-2 text-[12px] focus:outline-none"
                style={{ background: 'rgba(var(--ink),0.07)', border: '1px solid rgba(var(--ink),0.12)', color: TEXT_PRIMARY }}
              />
            </div>
            {dateInput && (
              <p className="text-[10px] mt-1 capitalize" style={{ color: TEXT_MUTED }}>
                {parseLocalDate(dateInput).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>

          {/* Activity type */}
          <div>
            <label className="block text-[9px] uppercase tracking-wider mb-1" style={{ color: TEXT_MUTED }}>Actividad</label>
            <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
              {Object.entries(ACTIVITY_TYPES).map(([key, { emoji, label }]) => (
                <button
                  key={key}
                  onClick={() => handleActivityTypeChange(key)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all"
                  style={activityType === key ? {
                    background: ACCENT, border: '1px solid rgba(var(--accent-rgb),0.7)', color: ON_ACCENT,
                  } : {
                    background: 'rgba(var(--ink),0.07)', border: '1px solid rgba(var(--ink),0.08)', color: TEXT_PRIMARY,
                  }}
                >
                  <span className="text-[13px]">{emoji}</span>
                  <span className="text-[10px] whitespace-nowrap font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-[9px] uppercase tracking-wider mb-1" style={{ color: TEXT_MUTED }}>Duración</label>
            <div className="flex gap-1.5 items-center">
              <div className="relative flex-shrink-0" style={{ width: 86 }}>
                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: TEXT_MUTED }} />
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="60" min="1"
                  className="w-full rounded-lg pl-8 pr-2 py-2 text-[12px] focus:outline-none"
                  style={{ background: 'rgba(var(--ink),0.07)', border: '1px solid rgba(var(--ink),0.12)', color: TEXT_PRIMARY }}
                />
              </div>
              <div className="flex gap-1 flex-1 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                {[30, 45, 60, 90].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDurationMinutes(String(mins))}
                    className="flex-shrink-0 px-2 py-1.5 rounded-lg text-[10px] font-medium"
                    style={durationMinutes === String(mins) ? {
                      background: ACCENT, color: ON_ACCENT,
                    } : { background: 'rgba(var(--ink),0.07)', color: TEXT_MUTED }}
                  >{mins}m</button>
                ))}
              </div>
            </div>
          </div>

          {/* Resultado — solo para pádel realizado */}
          {mode === 'realized' && activityType === 'padel' && (
            <div>
              <label className="block text-[9px] uppercase tracking-wider mb-1" style={{ color: TEXT_MUTED }}>Resultado</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[['win','Victoria','var(--success)','rgba(52,211,153,0.15)'],['draw','Empate','rgba(var(--ink),0.75)','rgba(var(--ink),0.1)'],['loss','Derrota','var(--danger)','rgba(248,113,113,0.15)']].map(([val, label, color, bg]) => (
                  <button key={val} onClick={() => setMatchResult(v => v === val ? null : val)}
                    className="py-2 rounded-lg text-[11px] font-semibold transition-all"
                    style={matchResult === val ? { background: bg, border: `1px solid ${color}`, color } : { background: 'rgba(var(--ink),0.07)', border: '1px solid rgba(var(--ink),0.12)', color: TEXT_MUTED }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Training type — solo si aplica y es Realizada */}
          {showTrainingType && (
            <div>
              <label className="block text-[9px] uppercase tracking-wider mb-1" style={{ color: TEXT_MUTED }}>¿Cómo fue?</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setTrainingType('progress')}
                  className="px-3 py-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5"
                  style={trainingType === 'progress' ? {
                    background: ACCENT, border: '1px solid ' + ACCENT, color: ON_ACCENT,
                  } : { background: 'rgba(var(--ink),0.07)', border: '1px solid rgba(var(--ink),0.12)', color: TEXT_SECONDARY }}
                >
                  <TrendingUp className="w-3 h-3" /> Progreso
                </button>
                <button
                  onClick={() => setTrainingType('consolidation')}
                  className="px-3 py-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5"
                  style={trainingType === 'consolidation' ? {
                    background: 'rgba(var(--ink),0.14)', border: '1px solid rgba(var(--ink),0.3)', color: TEXT_PRIMARY,
                  } : { background: 'rgba(var(--ink),0.07)', border: '1px solid rgba(var(--ink),0.12)', color: TEXT_SECONDARY }}
                >
                  <span className="text-[11px]">🛡️</span> Consolidación
                </button>
              </div>
            </div>
          )}

          {/* Progress note */}
          {showProgressNote && (
            <div>
              <label className="block text-[9px] uppercase tracking-wider mb-1" style={{ color: TEXT_MUTED }}>
                ¿En qué progresaste? 🔥
              </label>
              <textarea
                value={progressNote}
                onChange={(e) => setProgressNote(e.target.value)}
                rows={1}
                className="w-full rounded-lg px-3 py-2 text-[12px] focus:outline-none resize-none"
                style={{ background: 'rgba(var(--ink),0.07)', border: '1px solid rgba(196,181,253,0.4)', color: TEXT_PRIMARY }}
              />
            </div>
          )}

          {/* ── ¿Superaste una marca? ── */}
          {showPrSection && !editActivity && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Trophy className="w-3 h-3" style={{ color: ACCENT }} />
                <label className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: ACCENT }}>
                  ¿Superaste alguna marca?
                </label>
              </div>
              <div className="space-y-1.5">
                {relevantGoals.map(goal => {
                  const isSelected = goal.id in prBeaten;
                  return (
                    <div key={goal.id} className="rounded-lg overflow-hidden"
                      style={{ border: isSelected ? '1px solid rgba(var(--accent-rgb),0.45)' : '1px solid rgba(var(--ink),0.12)' }}>
                      <button
                        onClick={() => togglePr(goal.id)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left"
                        style={{ background: isSelected ? 'rgba(var(--accent-rgb),0.1)' : 'rgba(var(--ink),0.05)' }}
                      >
                        <div>
                          <p className="text-[12px] font-medium" style={{ color: TEXT_PRIMARY }}>{goal.title}</p>
                          {goal.current_value != null && (
                            <p className="text-[10px]" style={{ color: TEXT_MUTED }}>
                              Marca actual: {goal.current_value} {goal.unit}
                            </p>
                          )}
                        </div>
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={isSelected ? { background: ACCENT } : { border: '1.5px solid rgba(var(--ink),0.3)' }}
                        >
                          {isSelected && <span className="text-[10px] font-bold" style={{ color: ON_ACCENT }}>✓</span>}
                        </div>
                      </button>
                      {isSelected && (
                        <div className="px-3 pb-2 pt-1" style={{ background: 'rgba(var(--accent-rgb),0.06)' }}>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={prBeaten[goal.id]}
                              onChange={(e) => setPrBeaten(prev => ({ ...prev, [goal.id]: e.target.value }))}
                              placeholder="Nueva marca"
                              className="flex-1 rounded-md px-2 py-1.5 text-[12px] focus:outline-none"
                              style={{ background: 'rgba(var(--ink),0.07)', border: '1px solid rgba(var(--accent-rgb),0.35)', color: TEXT_PRIMARY }}
                            />
                            <span className="text-[11px]" style={{ color: TEXT_MUTED }}>{goal.unit}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-[9px] uppercase tracking-wider mb-1" style={{ color: TEXT_MUTED }}>Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-[12px] focus:outline-none resize-none"
              style={{ background: 'rgba(var(--ink),0.07)', border: '1px solid rgba(var(--ink),0.12)', color: TEXT_PRIMARY }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!activityType || !durationMinutes || !dateInput || loading}
            className="w-full font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-[13px] disabled:opacity-40 disabled:cursor-not-allowed mt-1"
            style={{ background: ACCENT, color: ON_ACCENT }}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
            ) : (
              <>
                {activityType && ACTIVITY_TYPES[activityType]?.emoji}
                {editActivity ? 'Guardar cambios' : prefillPlan ? 'Marcar como hecha' : (mode === 'planned' ? 'Planificar' : 'Guardar')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
