import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, FileText, ChevronDown } from 'lucide-react';
import { ACTIVITY_TYPES, TRAINING_TYPES } from '@/hooks/useActivities';

export default function LogActivityDialog({ isOpen, onClose, onSubmit, selectedDate }) {
  const [activityType, setActivityType] = useState('');
  const [trainingType, setTrainingType] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const dateStr = selectedDate
    ? selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  const handleSubmit = async () => {
    if (!activityType || !durationMinutes) return;

    setLoading(true);
    try {
      await onSubmit({
        type: activityType,
        title: ACTIVITY_TYPES[activityType]?.label || activityType,
        training_type: trainingType || null,
        duration_minutes: parseInt(durationMinutes),
        date: selectedDate.toISOString().split('T')[0],
        description: notes || null,
        source: 'manual',
        completed: true,
      });
      // Reset form
      setActivityType('');
      setTrainingType('');
      setDurationMinutes('');
      setNotes('');
      onClose();
    } catch (err) {
      console.error('Error creating activity:', err);
    } finally {
      setLoading(false);
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
          className="bg-surface-2 border border-white/5 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-3">
            <div>
              <h2 className="text-lg font-bold text-zinc-100">Registrar actividad</h2>
              <p className="text-sm text-zinc-500 capitalize">{dateStr}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-4 flex items-center justify-center hover:bg-surface-3 transition-colors"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          </div>

          <div className="px-5 pb-5 space-y-5">
            {/* Activity type selector */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Tipo de actividad</label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(ACTIVITY_TYPES).map(([key, { emoji, label }]) => (
                  <button
                    key={key}
                    onClick={() => setActivityType(key)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                      activityType === key
                        ? 'bg-brand-500/15 border-brand-500/40 scale-95'
                        : 'bg-surface-3 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <span className="text-xl">{emoji}</span>
                    <span className="text-[10px] text-zinc-400 leading-tight text-center">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Training type (only for strength) */}
            {activityType === 'strength_training' && (
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Tipo de entrenamiento</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(TRAINING_TYPES).map(([key, { label, color }]) => (
                    <button
                      key={key}
                      onClick={() => setTrainingType(key)}
                      className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        trainingType === key
                          ? 'bg-brand-500/15 border-brand-500/40 text-zinc-100'
                          : 'bg-surface-3 border-white/5 text-zinc-400 hover:border-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Duration */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Duración (minutos)</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="60"
                  min="1"
                  className="w-full bg-surface-3 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition-all"
                />
              </div>
              {/* Quick duration buttons */}
              <div className="flex gap-2 mt-2">
                {[30, 45, 60, 90].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setDurationMinutes(String(mins))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      durationMinutes === String(mins)
                        ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30'
                        : 'bg-surface-3 text-zinc-500 border border-white/5'
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Notas (opcional)</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Pecho y tríceps, 10km..."
                  rows={2}
                  className="w-full bg-surface-3 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition-all resize-none"
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!activityType || !durationMinutes || loading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
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
