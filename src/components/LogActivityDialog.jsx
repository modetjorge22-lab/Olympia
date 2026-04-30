import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, TrendingUp, ChevronDown } from 'lucide-react';
import { ACTIVITY_TYPES } from '@/hooks/useActivities';

const TEXT_PRIMARY = '#2a1a11';
const TEXT_SECONDARY = '#6e5647';
const TEXT_MUTED = '#8c7364';

const TRACKABLE_TYPES = ['strength_training', 'running', 'swimming'];

export default function LogActivityDialog({ isOpen, onClose, onSubmit, selectedDate }) {
  const [activityType, setActivityType] = useState('');
  const [trainingType, setTrainingType] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [progressNote, setProgressNote] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [loading, setLoading] = useState(false);

  const dateStr = selectedDate
    ? selectedDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
    : '';

  const showTrainingType = TRACKABLE_TYPES.includes(activityType);
  const showProgressNote = trainingType === 'progress';

  const handleSubmit = async () => {
    if (!activityType || !durationMinutes) return;
    setLoading(true);
    try {
      await onSubmit({
        type: activityType,
        title: ACTIVITY_TYPES[activityType]?.label || activityType,
        training_type: showTrainingType ? (trainingType || null) : null,
        duration_minutes: parseInt(durationMinutes),
        date: selectedDate.toISOString().split('T')[0],
        description: notes || null,
        progress_note: showProgressNote ? (progressNote || null) : null,
        source: 'manual',
        completed: true,
      });
      setActivityType('');
      setTrainingType('');
      setDurationMinutes('');
      setNotes('');
      setProgressNote('');
      setShowNotes(false);
      onClose();
    } catch (err) {
      console.error('Error creating activity:', err);
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

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background: 'rgba(40,24,17,0.65)',
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
          background: '#f5ede0',
          border: '1px solid rgba(255,255,255,0.4)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header compacto */}
        <div className="flex items-center justify-between px-3.5 pt-3 pb-2 flex-shrink-0">
          <div>
            <h2 className="text-[13px] font-bold" style={{ color: TEXT_PRIMARY }}>Nueva actividad</h2>
            <p className="text-[10px] capitalize" style={{ color: TEXT_MUTED }}>{dateStr}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(42,26,17,0.08)' }}
          >
            <X className="w-3.5 h-3.5" style={{ color: TEXT_SECONDARY }} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-3.5 pb-3.5 space-y-3">
          {/* Activity type — más compacto */}
          <div>
            <label className="block text-[9px] uppercase tracking-wider mb-1" style={{ color: TEXT_MUTED }}>Actividad</label>
            <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
              {Object.entries(ACTIVITY_TYPES).map(([key, { emoji, label }]) => (
                <button
                  key={key}
                  onClick={() => handleActivityTypeChange(key)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all"
                  style={activityType === key ? {
                    background: '#8fa898',
                    border: '1px solid rgba(143,168,152,0.6)',
                    color: '#1c2620',
                  } : {
                    background: 'rgba(42,26,17,0.06)',
                    border: '1px solid rgba(42,26,17,0.08)',
                    color: TEXT_PRIMARY,
                  }}
                >
                  <span className="text-[13px]">{emoji}</span>
                  <span className="text-[10px] whitespace-nowrap font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration — input + chips en una sola fila */}
          <div>
            <label className="block text-[9px] uppercase tracking-wider mb-1" style={{ color: TEXT_MUTED }}>Duración</label>
            <div className="flex gap-1.5 items-center">
              <div className="relative flex-shrink-0" style={{ width: 86 }}>
                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: TEXT_MUTED }} />
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="60"
                  min="1"
                  className="w-full rounded-lg pl-8 pr-2 py-2 text-[12px] focus:outline-none"
                  style={{
                    background: 'rgba(42,26,17,0.06)',
                    border: '1px solid rgba(42,26,17,0.1)',
                    color: TEXT_PRIMARY,
                  }}
                />
              </div>
              <div className="flex gap-1 flex-1 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
                {[30, 45, 60, 90].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDurationMinutes(String(mins))}
                    className="flex-shrink-0 px-2 py-1.5 rounded-lg text-[10px] font-medium"
                    style={durationMinutes === String(mins) ? {
                      background: '#8fa898',
                      color: '#1c2620',
                    } : {
                      background: 'rgba(42,26,17,0.06)',
                      color: TEXT_MUTED,
                    }}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Training type — solo si aplica */}
          {showTrainingType && (
            <div>
              <label className="block text-[9px] uppercase tracking-wider mb-1" style={{ color: TEXT_MUTED }}>
                ¿Cómo fue?
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setTrainingType('progress')}
                  className="px-3 py-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5"
                  style={trainingType === 'progress' ? {
                    background: 'rgba(139,92,246,0.15)',
                    border: '1px solid rgba(139,92,246,0.35)',
                    color: '#6d28d9',
                  } : {
                    background: 'rgba(42,26,17,0.06)',
                    border: '1px solid rgba(42,26,17,0.1)',
                    color: TEXT_SECONDARY,
                  }}
                >
                  <TrendingUp className="w-3 h-3" />
                  Progreso
                </button>
                <button
                  onClick={() => setTrainingType('consolidation')}
                  className="px-3 py-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5"
                  style={trainingType === 'consolidation' ? {
                    background: 'rgba(143,168,152,0.25)',
                    border: '1px solid rgba(143,168,152,0.5)',
                    color: '#1c5838',
                  } : {
                    background: 'rgba(42,26,17,0.06)',
                    border: '1px solid rgba(42,26,17,0.1)',
                    color: TEXT_SECONDARY,
                  }}
                >
                  <span className="text-[11px]">🛡️</span>
                  Consolidación
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
                placeholder="100kg en press banca..."
                rows={1}
                className="w-full rounded-lg px-3 py-2 text-[12px] focus:outline-none resize-none"
                style={{
                  background: 'rgba(42,26,17,0.06)',
                  border: '1px solid rgba(139,92,246,0.25)',
                  color: TEXT_PRIMARY,
                }}
              />
            </div>
          )}

          {/* Notes — colapsado por defecto */}
          {!showNotes ? (
            <button
              onClick={() => setShowNotes(true)}
              className="text-[10px] flex items-center gap-1 transition-colors"
              style={{ color: TEXT_MUTED }}
            >
              <ChevronDown className="w-3 h-3" />
              Añadir notas
            </button>
          ) : (
            <div>
              <label className="block text-[9px] uppercase tracking-wider mb-1" style={{ color: TEXT_MUTED }}>Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Cómo te sentiste..."
                rows={2}
                className="w-full rounded-lg px-3 py-2 text-[12px] focus:outline-none resize-none"
                style={{
                  background: 'rgba(42,26,17,0.06)',
                  border: '1px solid rgba(42,26,17,0.1)',
                  color: TEXT_PRIMARY,
                }}
              />
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!activityType || !durationMinutes || loading}
            className="w-full font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-[13px] disabled:opacity-40 disabled:cursor-not-allowed mt-1"
            style={{
              background: TEXT_PRIMARY,
              color: 'rgba(245,237,224,0.95)',
            }}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {activityType && ACTIVITY_TYPES[activityType]?.emoji}
                Guardar
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
