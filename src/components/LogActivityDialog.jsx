import React, { useState } from 'react';
import { X, Clock, TrendingUp } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);

  const dateStr = selectedDate
    ? selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(40,24,17,0.65)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[80vh] flex flex-col"
        style={{
          background: 'rgba(245,237,224,0.96)',
          border: '1px solid rgba(255,255,255,0.35)',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — sticky */}
        <div className="flex items-center justify-between p-5 pb-3 flex-shrink-0">
          <div>
            <h2 className="text-[16px] font-bold" style={{ color: TEXT_PRIMARY }}>Registrar actividad</h2>
            <p className="text-[13px] capitalize" style={{ color: TEXT_MUTED }}>{dateStr}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(42,26,17,0.1)' }}
          >
            <X className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-4">
          {/* Activity type selector */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider mb-2" style={{ color: TEXT_MUTED }}>Tipo de actividad</label>
            <div className="grid grid-cols-4 gap-1.5">
              {Object.entries(ACTIVITY_TYPES).map(([key, { emoji, label }]) => (
                <button
                  key={key}
                  onClick={() => handleActivityTypeChange(key)}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl border transition-all"
                  style={activityType === key ? {
                    background: '#8fa898',
                    border: '1px solid rgba(143,168,152,0.6)',
                    boxShadow: '0 2px 8px rgba(143,168,152,0.3)',
                  } : {
                    background: 'rgba(42,26,17,0.06)',
                    border: '1px solid rgba(42,26,17,0.1)',
                  }}
                >
                  <span className="text-base">{emoji}</span>
                  <span className="text-[8px] leading-tight text-center" style={{ color: activityType === key ? '#1c2620' : TEXT_MUTED }}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Training type */}
          {showTrainingType && (
            <div>
              <label className="block text-[11px] uppercase tracking-wider mb-2" style={{ color: TEXT_MUTED }}>
                ¿Cómo fue la sesión?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTrainingType('progress')}
                  className="px-4 py-3 rounded-xl border text-[13px] font-medium transition-all flex items-center justify-center gap-2"
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
                  <TrendingUp className="w-4 h-4" />
                  Progreso
                </button>
                <button
                  onClick={() => setTrainingType('consolidation')}
                  className="px-4 py-3 rounded-xl border text-[13px] font-medium transition-all flex items-center justify-center gap-2"
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
                  <span className="text-sm">🛡️</span>
                  Consolidación
                </button>
              </div>
            </div>
          )}

          {/* Progress note */}
          {showProgressNote && (
            <div>
              <label className="block text-[11px] uppercase tracking-wider mb-2" style={{ color: TEXT_MUTED }}>
                ¿En qué has progresado? 🔥
              </label>
              <textarea
                value={progressNote}
                onChange={(e) => setProgressNote(e.target.value)}
                placeholder="He subido a 100kg en press banca..."
                rows={2}
                className="w-full rounded-xl px-4 py-3 text-[13px] focus:outline-none transition-all resize-none"
                style={{
                  background: 'rgba(42,26,17,0.06)',
                  border: '1px solid rgba(139,92,246,0.25)',
                  color: TEXT_PRIMARY,
                }}
              />
            </div>
          )}

          {/* Duration */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider mb-2" style={{ color: TEXT_MUTED }}>Duración</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: TEXT_MUTED }} />
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="60 min"
                min="1"
                className="w-full rounded-xl pl-10 pr-4 py-3 text-[13px] focus:outline-none transition-all"
                style={{
                  background: 'rgba(42,26,17,0.06)',
                  border: '1px solid rgba(42,26,17,0.1)',
                  color: TEXT_PRIMARY,
                }}
              />
            </div>
            <div className="flex gap-2 mt-2">
              {[30, 45, 60, 90, 120].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setDurationMinutes(String(mins))}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                  style={durationMinutes === String(mins) ? {
                    background: '#8fa898',
                    color: '#1c2620',
                    border: '1px solid rgba(143,168,152,0.5)',
                  } : {
                    background: 'rgba(42,26,17,0.06)',
                    color: TEXT_MUTED,
                    border: '1px solid rgba(42,26,17,0.08)',
                  }}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider mb-2" style={{ color: TEXT_MUTED }}>Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Pecho y tríceps, circuito largo..."
              rows={2}
              className="w-full rounded-xl px-4 py-3 text-[13px] focus:outline-none transition-all resize-none"
              style={{
                background: 'rgba(42,26,17,0.06)',
                border: '1px solid rgba(42,26,17,0.1)',
                color: TEXT_PRIMARY,
              }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!activityType || !durationMinutes || loading}
            className="w-full font-semibold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-[14px] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: TEXT_PRIMARY,
              color: 'rgba(245,237,224,0.95)',
            }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {activityType && ACTIVITY_TYPES[activityType]?.emoji}
                Registrar actividad
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
