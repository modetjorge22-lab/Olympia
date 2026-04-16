import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, FileText, TrendingUp } from 'lucide-react';
import { ACTIVITY_TYPES, TRAINING_TYPES } from '@/hooks/useActivities';

// Activities that support progress/consolidation tracking
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

  // Reset training type when switching activity
  const handleActivityTypeChange = (type) => {
    setActivityType(type);
    if (!TRACKABLE_TYPES.includes(type)) {
      setTrainingType('');
      setProgressNote('');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="bg-surface-1 border border-white/[0.04] rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-3">
            <div>
              <h2 className="text-[16px] font-bold text-zinc-100">Registrar actividad</h2>
              <p className="text-[13px] text-zinc-500 capitalize">{dateStr}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center hover:bg-surface-4 transition-colors"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          <div className="px-5 pb-5 space-y-4">
            {/* Activity type selector */}
            <div>
              <label className="block text-[12px] text-zinc-500 uppercase tracking-wider mb-2">Tipo de actividad</label>
              <div className="grid grid-cols-4 gap-1.5">
                {Object.entries(ACTIVITY_TYPES).map(([key, { emoji, label }]) => (
                  <button
                    key={key}
                    onClick={() => handleActivityTypeChange(key)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${
                      activityType === key
                        ? 'bg-brand-500/15 border-brand-500/30'
                        : 'bg-surface-2 border-white/[0.04] hover:border-white/[0.08]'
                    }`}
                  >
                    <span className="text-lg">{emoji}</span>
                    <span className={`text-[9px] leading-tight text-center ${activityType === key ? 'text-brand-400' : 'text-zinc-500'}`}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Training type (for trackable activities) */}
            {showTrainingType && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-[12px] text-zinc-500 uppercase tracking-wider mb-2">
                  ¿Cómo fue la sesión?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTrainingType('progress')}
                    className={`px-4 py-3 rounded-xl border text-[13px] font-medium transition-all flex items-center justify-center gap-2 ${
                      trainingType === 'progress'
                        ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                        : 'bg-surface-2 border-white/[0.04] text-zinc-400 hover:border-white/[0.08]'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Progreso
                  </button>
                  <button
                    onClick={() => setTrainingType('consolidation')}
                    className={`px-4 py-3 rounded-xl border text-[13px] font-medium transition-all flex items-center justify-center gap-2 ${
                      trainingType === 'consolidation'
                        ? 'bg-brand-500/15 border-brand-500/30 text-brand-300'
                        : 'bg-surface-2 border-white/[0.04] text-zinc-400 hover:border-white/[0.08]'
                    }`}
                  >
                    <span className="text-sm">🛡️</span>
                    Consolidación
                  </button>
                </div>
              </motion.div>
            )}

            {/* Progress note (only when progress is selected) */}
            {showProgressNote && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-[12px] text-zinc-500 uppercase tracking-wider mb-2">
                  ¿En qué has progresado? 🔥
                </label>
                <textarea
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  placeholder="He subido a 100kg en press banca, he bajado de 5:00/km en carrera..."
                  rows={2}
                  className="w-full bg-surface-2 border border-violet-500/20 rounded-xl px-4 py-3 text-[13px] text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/40 transition-all resize-none"
                />
              </motion.div>
            )}

            {/* Duration */}
            <div>
              <label className="block text-[12px] text-zinc-500 uppercase tracking-wider mb-2">Duración</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="60 min"
                  min="1"
                  className="w-full bg-surface-2 border border-white/[0.04] rounded-xl pl-10 pr-4 py-3 text-[13px] text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition-all"
                />
              </div>
              <div className="flex gap-2 mt-2">
                {[30, 45, 60, 90, 120].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDurationMinutes(String(mins))}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                      durationMinutes === String(mins)
                        ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                        : 'bg-surface-2 text-zinc-600 border border-white/[0.04]'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[12px] text-zinc-500 uppercase tracking-wider mb-2">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Pecho y tríceps, circuito largo..."
                rows={2}
                className="w-full bg-surface-2 border border-white/[0.04] rounded-xl px-4 py-3 text-[13px] text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition-all resize-none"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!activityType || !durationMinutes || loading}
              className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-[14px]"
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
