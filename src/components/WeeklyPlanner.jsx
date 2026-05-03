import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Plus, X, Trash2, Check, Clock, TrendingUp } from 'lucide-react';
import { ACTIVITY_TYPES } from '@/hooks/useActivities';
import { getActivitySummary, getPlanSummary, DAY_PALETTE } from '@/utils/dayDisplay';

const TEXT_PRIMARY = '#2a1a11';
const TEXT_SECONDARY = '#6e5647';
const TEXT_MUTED = '#8c7364';

const TRACKABLE_TYPES = ['strength_training', 'running', 'swimming'];

const glassCard = {
 background: 'rgba(245,237,224,0.92)',
 border: '1px solid rgba(255,255,255,0.35)',
 boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.6)',
 backdropFilter: 'blur(20px)',
 WebkitBackdropFilter: 'blur(20px)',
};

const DAY_INITIAL = ['D', 'L', 'M', 'X', 'J', 'V', 'S']; // Domingo … Sábado

function toDateStr(d) {
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function WeeklyPlanner({ plans, onAddPlan, onRemovePlan, onCompletePlan, onSyncToCalendar, activitiesByDate = {} }) {
 const [selectedDay, setSelectedDay] = useState(null);
 const [weekOffset, setWeekOffset] = useState(0);
 const [completing, setCompleting] = useState(null); // plan que se está completando
 const [planDuration, setPlanDuration] = useState(60); // minutos por defecto al planificar
 const [planNote, setPlanNote] = useState(''); // descripción opcional del entreno
 const [addError, setAddError] = useState(''); // error visible en el modal
 const [adding, setAdding] = useState(false); // evita doble-click mientras guarda
 const sheetRef = useRef(null);

 const weekDays = useMemo(() => {
 const today = new Date();
 today.setHours(0, 0, 0, 0);
 const start = new Date(today);
 start.setDate(today.getDate() + weekOffset * 7);
 return Array.from({ length: 7 }, (_, i) => {
 const d = new Date(start);
 d.setDate(start.getDate() + i);
 return d;
 });
 }, [weekOffset]);

 const plansByDate = useMemo(() => {
 const map = {};
 plans.forEach(p => {
 const ds = p.date.slice(0, 10);
 if (!map[ds]) map[ds] = [];
 map[ds].push(p);
 });
 return map;
 }, [plans]);

 const today = new Date();
 today.setHours(0, 0, 0, 0);

 useEffect(() => {
 function handleClick(e) {
 if (selectedDay && !completing && sheetRef.current && !sheetRef.current.contains(e.target)) {
 setSelectedDay(null);
 }
 }
 document.addEventListener('mousedown', handleClick);
 return () => document.removeEventListener('mousedown', handleClick);
 }, [selectedDay, completing]);

 const handleSelectActivity = async (type) => {
 if (!selectedDay || adding) return;
 setAddError('');
 setAdding(true);
 try {
 const result = await onAddPlan({
 date: toDateStr(selectedDay),
 activity_type: type,
 duration_minutes: planDuration,
 notes: planNote.trim() || null,
 });
 if (!result) {
 setAddError('No se pudo guardar el plan. Comprueba la consola del navegador.');
 return;
 }
 // Éxito → cerramos y reseteamos
 setSelectedDay(null);
 setPlanNote('');
 } catch (e) {
 console.error('handleSelectActivity error:', e);
 setAddError('Error inesperado al guardar el plan.');
 } finally {
 setAdding(false);
 }
 };

 // Limpia el error y la nota cuando se abre/cambia el día
 useEffect(() => {
 setAddError('');
 setPlanNote('');
 }, [selectedDay]);

 const weekLabel = weekOffset === 0 ? 'Próximos 7 días' : weekOffset === 1 ? 'Días 8–14' : `+${weekOffset * 7} días`;
 const totalPlanned = weekDays.reduce((sum, d) => sum + (plansByDate[toDateStr(d)]?.length || 0), 0);

 return (
 <div className="rounded-2xl p-4 relative" style={glassCard}>
 {/* Header */}
 <div className="flex items-center justify-between mb-3">
 <div className="flex items-center gap-2.5">
 <div className="w-7 h-7 rounded-lg flex items-center justify-center"
 style={{ background: 'rgba(42,26,17,0.1)', border: '1px solid rgba(42,26,17,0.14)' }}>
 <Calendar className="w-3.5 h-3.5" style={{ color: TEXT_PRIMARY }} />
 </div>
 <div>
 <h2 className="text-[13px] font-bold" style={{ color: TEXT_PRIMARY }}>Planificador</h2>
 <p className="text-[10px]" style={{ color: TEXT_MUTED }}>
 {weekLabel} · {totalPlanned} {totalPlanned === 1 ? 'sesión' : 'sesiones'}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-1 rounded-lg p-0.5"
 style={{ background: 'rgba(42,26,17,0.07)', border: '1px solid rgba(42,26,17,0.1)' }}>
 <button
 onClick={() => setWeekOffset(w => Math.max(0, w - 1))}
 disabled={weekOffset === 0}
 className="w-6 h-6 rounded flex items-center justify-center"
 style={{ color: TEXT_SECONDARY, opacity: weekOffset === 0 ? 0.3 : 1, cursor: weekOffset === 0 ? 'default' : 'pointer' }}>
 <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
 <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>
 </button>
 <span className="text-[10px] font-semibold px-1.5 min-w-[14px] text-center" style={{ color: TEXT_PRIMARY }}>
 {weekOffset === 0 ? '·' : `+${weekOffset}`}
 </span>
 <button onClick={() => setWeekOffset(w => w + 1)}
 className="w-6 h-6 rounded flex items-center justify-center" style={{ color: TEXT_SECONDARY }}>
 <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
 <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>
 </button>
 </div>
 </div>

 {/* 7-day strip */}
 <div className="grid grid-cols-7 gap-[5px]">
 {weekDays.map((d, i) => {
 const ds = toDateStr(d);
 const dayPlans = plansByDate[ds] || [];
 const completedActs = activitiesByDate[ds] || [];
 const isCompleted = completedActs.length > 0;
 const isToday = d.getTime() === today.getTime();
 const isPast = d < today;
 const hasPlan = !isCompleted && dayPlans.length > 0;
 const firstEmoji = isCompleted
 ? (ACTIVITY_TYPES[completedActs[0].type]?.emoji || '🏅')
 : hasPlan
 ? (ACTIVITY_TYPES[dayPlans[0].activity_type]?.emoji || '🏅')
 : null;

 // Resumen para colgar bajo el día
 const summary = isCompleted
 ? getActivitySummary(completedActs[0], ACTIVITY_TYPES)
 : hasPlan
 ? getPlanSummary(dayPlans[0], ACTIVITY_TYPES)
 : null;
 const palette = isCompleted ? DAY_PALETTE.completed : hasPlan ? DAY_PALETTE.planned : null;
 const totalCount = isCompleted ? completedActs.length : dayPlans.length;

 return (
 <div key={i} className="flex flex-col items-center gap-1">
 <span className="text-[9px] font-medium uppercase" style={{ color: TEXT_MUTED }}>
 {DAY_INITIAL[d.getDay()]}
 </span>
 <button
 onClick={() => {
 // Si el día ya tiene actividades reales, sincronizamos con el calendario
 // principal en lugar de abrir el modal de plan. La planificación
 // (modal) sólo se abre para días sin actividad.
 if (isCompleted && onSyncToCalendar) {
 onSyncToCalendar(d);
 } else {
 setSelectedDay(d);
 }
 }}
 className="w-full aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all"
 style={
 isCompleted ? {
 background: DAY_PALETTE.completed.bg,
 boxShadow: DAY_PALETTE.completed.glow,
 } : hasPlan ? {
 background: DAY_PALETTE.planned.bg,

 boxShadow: DAY_PALETTE.planned.glow,
 } : isToday ? {
 background: 'rgba(42,26,17,0.14)',
 border: '1px solid rgba(42,26,17,0.22)',
 } : isPast ? {
 background: 'rgba(42,26,17,0.04)',
 } : {
 background: 'rgba(42,26,17,0.07)',
 }
 }
 >
 <span className="text-[11px] font-semibold leading-none"
 style={{
 color: isCompleted ? DAY_PALETTE.completed.text
 : hasPlan ? DAY_PALETTE.planned.text
 : isToday ? TEXT_PRIMARY
 : isPast ? 'rgba(42,26,17,0.35)'
 : 'rgba(42,26,17,0.55)'
 }}>
 {d.getDate()}
 </span>
 {firstEmoji && <span className="text-[10px] leading-none mt-0.5">{firstEmoji}</span>}
 {totalCount > 1 && (
 <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
 style={{ background: '#fff', border: '1px solid rgba(42,26,17,0.15)' }}>
 <span className="text-[7px] font-bold" style={{ color: TEXT_PRIMARY }}>{totalCount}</span>
 </div>
 )}
 </button>

 {/* Resumen colgante con barras discontinuas */}
 {summary && palette && (
 <DaySummary summary={summary} palette={palette} extraCount={totalCount - 1} />
 )}
 </div>
 );
 })}
 </div>

 <p className="text-[9px] mt-3 text-center" style={{ color: TEXT_MUTED }}>
 Pulsa un día sin actividad para planificar
 </p>

 {/* Day picker — portal al body para escapar de stacking contexts */}
 {selectedDay && !completing && createPortal(
 <div
 className="fixed inset-0 z-[100] flex items-center justify-center"
 style={{
 background: 'rgba(40,24,17,0.65)',
 paddingTop: 'max(16px, env(safe-area-inset-top))',
 paddingBottom: 'max(96px, calc(env(safe-area-inset-bottom) + 96px))',
 paddingLeft: 12,
 paddingRight: 12,
 }}
 onClick={() => setSelectedDay(null)}
 >
 <div
 ref={sheetRef}
 className="rounded-2xl p-4 w-full max-w-sm"
 style={{
 maxHeight: '100%',
 overflowY: 'auto',
 background: '#f5ede0',
 border: '1px solid rgba(255,255,255,0.4)',
 boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
 }}
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex items-center justify-between mb-2">
 <p className="text-[12px] font-semibold capitalize" style={{ color: TEXT_PRIMARY }}>
 {selectedDay.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
 </p>
 <button onClick={() => setSelectedDay(null)} className="w-6 h-6 rounded-full flex items-center justify-center"
 style={{ background: 'rgba(42,26,17,0.08)' }}>
 <X className="w-3 h-3" style={{ color: TEXT_SECONDARY }} />
 </button>
 </div>

 {/* Existing plans */}
 {(plansByDate[toDateStr(selectedDay)] || []).length > 0 && (
 <div className="space-y-1 mb-2">
 {plansByDate[toDateStr(selectedDay)].map(p => {
 const info = ACTIVITY_TYPES[p.activity_type] || { emoji: '🏅', label: p.activity_type };
 const canComplete = selectedDay <= today && !(activitiesByDate[toDateStr(selectedDay)] || []).length;
 return (
 <div key={p.id} className="flex items-center justify-between rounded-lg px-2 py-1.5"
 style={{ background: 'rgba(42,26,17,0.06)', border: '1px solid rgba(42,26,17,0.08)' }}>
 <div className="flex items-center gap-2 min-w-0 flex-1">
 <span className="text-[12px]">{info.emoji}</span>
 <div className="min-w-0 flex-1">
 <div className="flex items-center gap-1.5">
 <span className="text-[11px] truncate" style={{ color: TEXT_PRIMARY }}>
 {p.notes ? p.notes : info.label}
 </span>
 {p.duration_minutes ? (
 <span className="text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0"
 style={{ background: 'rgba(140,121,180,0.35)', color: '#3d2d6d' }}>
 {p.duration_minutes < 60 ? `${p.duration_minutes}min` : `${Math.floor(p.duration_minutes/60)}h${p.duration_minutes%60 ? p.duration_minutes%60 : ''}`}
 </span>
 ) : null}
 </div>
 {p.notes && (
 <span className="text-[9px]" style={{ color: TEXT_MUTED }}>{info.label}</span>
 )}
 </div>
 </div>
 <div className="flex items-center gap-1 flex-shrink-0">
 {canComplete && (
 <button
 onClick={() => setCompleting(p)}
 className="px-2 py-1 rounded text-[10px] font-semibold flex items-center gap-1"
 style={{ background: '#8fa898', color: '#1c2620' }}
 >
 <Check className="w-2.5 h-2.5" />
 Completar
 </button>
 )}
 <button onClick={() => onRemovePlan(p.id)} className="p-1 rounded hover:bg-red-500/10">
 <Trash2 className="w-3 h-3" style={{ color: TEXT_MUTED }} />
 </button>
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* Note input */}
 <p className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: TEXT_MUTED }}>Nota (opcional)</p>
 <input
 type="text"
 value={planNote}
 onChange={(e) => setPlanNote(e.target.value)}
 placeholder="Ej: Push, Legs, intervalos 5x1km…"
 maxLength={40}
 className="w-full mb-3 px-2.5 py-1.5 rounded-lg text-[11px] outline-none"
 style={{
 background: 'rgba(42,26,17,0.06)',
 border: '1px solid rgba(42,26,17,0.12)',
 color: TEXT_PRIMARY,
 }}
 />

 {/* Duration picker */}
 <p className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: TEXT_MUTED }}>Duración planificada</p>
 <div className="flex gap-1 mb-3">
 {[30, 45, 60, 90, 120].map(mins => (
 <button
 key={mins}
 onClick={() => setPlanDuration(mins)}
 className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
 style={planDuration === mins ? {
 background: '#9c8bbf',
 color: '#1f1840',
 border: '1px solid #6e5a98',
 } : {
 background: 'rgba(42,26,17,0.06)',
 color: TEXT_MUTED,
 border: '1px solid rgba(42,26,17,0.1)',
 }}
 >
 {mins < 60 ? `${mins}m` : mins === 60 ? '1h' : mins === 120 ? '2h' : `${mins}m`}
 </button>
 ))}
 </div>

 {/* Add — single horizontal scroll row, compact */}
 <p className="text-[9px] uppercase tracking-wider mb-1.5" style={{ color: TEXT_MUTED }}>Añadir actividad</p>
 <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
 {Object.entries(ACTIVITY_TYPES).map(([key, { emoji, label }]) => (
 <button
 key={key}
 onClick={() => handleSelectActivity(key)}
 disabled={adding}
 className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all"
 style={{
 background: 'rgba(42,26,17,0.06)',
 border: '1px solid rgba(42,26,17,0.1)',
 opacity: adding ? 0.5 : 1,
 cursor: adding ? 'wait' : 'pointer',
 }}
 >
 <span className="text-[13px]">{emoji}</span>
 <span className="text-[10px] whitespace-nowrap" style={{ color: TEXT_PRIMARY }}>{label}</span>
 </button>
 ))}
 </div>

 {/* Error banner */}
 {addError && (
 <div className="mt-3 rounded-lg px-3 py-2 text-[11px]"
 style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)', color: '#991b1b' }}>
 {addError}
 </div>
 )}
 </div>
 </div>,
 document.body
 )}

 {/* Complete plan dialog (overlay) */}
 {completing && (
 <CompletePlanDialog
 plan={completing}
 onCancel={() => setCompleting(null)}
 onConfirm={async (data) => {
 await onCompletePlan(completing, data);
 setCompleting(null);
 setSelectedDay(null);
 }}
 />
 )}
 </div>
 );
}

function DaySummary({ summary, palette, extraCount = 0 }) {
 if (!summary?.name) return null;
 const lineStyle = {
 width: 1,
 borderLeft: `1px dashed ${palette.line}`,
 alignSelf: 'stretch',
 };
 return (
 <div className="flex w-full" style={{ marginTop: 3 }}>
 <div style={lineStyle} />
 <div
 className="flex-1 flex flex-col justify-center"
 style={{ paddingTop: 3, paddingBottom: 3, paddingLeft: 2, paddingRight: 2, textAlign: 'center', lineHeight: 1.15, minWidth: 0 }}
 >
 <p style={{
 fontSize: 8.5,
 fontWeight: 600,
 color: palette.textOnSummary,
 overflow: 'hidden',
 textOverflow: 'ellipsis',
 whiteSpace: 'nowrap',
 }}>
 {summary.name}
 </p>
 {summary.duration && (
 <p style={{
 fontSize: 8,
 fontWeight: 500,
 color: palette.textOnSummary,
 opacity: 0.78,
 }}>
 {summary.duration}
 </p>
 )}
 {extraCount > 0 && (
 <p style={{
 fontSize: 7.5,
 color: palette.textOnSummary,
 opacity: 0.6,
 }}>
 +{extraCount}
 </p>
 )}
 </div>
 <div style={lineStyle} />
 </div>
 );
}

function CompletePlanDialog({ plan, onCancel, onConfirm }) {
 const [duration, setDuration] = useState(plan.duration_minutes ? String(plan.duration_minutes) : '60');
 const [trainingType, setTrainingType] = useState('');
 const [notes, setNotes] = useState('');
 const [progressNote, setProgressNote] = useState('');
 const [loading, setLoading] = useState(false);

 const showTrainingType = TRACKABLE_TYPES.includes(plan.activity_type);
 const showProgressNote = trainingType === 'progress';
 const info = ACTIVITY_TYPES[plan.activity_type] || { emoji: '🏅', label: plan.activity_type };

 const handleSubmit = async () => {
 if (!duration) return;
 setLoading(true);
 try {
 await onConfirm({
 duration_minutes: parseInt(duration),
 training_type: showTrainingType ? (trainingType || null) : null,
 description: notes || null,
 progress_note: showProgressNote ? (progressNote || null) : null,
 });
 } finally {
 setLoading(false);
 }
 };

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
 onClick={onCancel}
 >
 <div
 className="rounded-2xl w-full max-w-sm flex flex-col"
 style={{
 maxHeight: '100%',
 background: '#f5ede0',
 border: '1px solid rgba(255,255,255,0.35)',
 boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
 }}
 onClick={(e) => e.stopPropagation()}
 >
 <div className="flex items-center justify-between p-5 pb-3 flex-shrink-0">
 <div className="flex items-center gap-2.5">
 <span className="text-2xl">{info.emoji}</span>
 <div>
 <h2 className="text-[15px] font-bold" style={{ color: TEXT_PRIMARY }}>Completar {info.label}</h2>
 <p className="text-[12px]" style={{ color: TEXT_MUTED }}>
 {new Date(plan.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
 </p>
 </div>
 </div>
 <button onClick={onCancel} className="w-8 h-8 rounded-full flex items-center justify-center"
 style={{ background: 'rgba(42,26,17,0.1)' }}>
 <X className="w-4 h-4" style={{ color: TEXT_SECONDARY }} />
 </button>
 </div>

 <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-4">
 {/* Duration */}
 <div>
 <label className="block text-[11px] uppercase tracking-wider mb-2" style={{ color: TEXT_MUTED }}>Duración</label>
 <div className="relative">
 <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: TEXT_MUTED }} />
 <input
 type="number" value={duration} onChange={e => setDuration(e.target.value)}
 placeholder="60 min" min="1"
 className="w-full rounded-xl pl-10 pr-4 py-3 text-[13px] focus:outline-none"
 style={{ background: 'rgba(42,26,17,0.06)', border: '1px solid rgba(42,26,17,0.1)', color: TEXT_PRIMARY }}
 />
 </div>
 <div className="flex gap-2 mt-2">
 {[30, 45, 60, 90, 120].map(mins => (
 <button key={mins} onClick={() => setDuration(String(mins))}
 className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium"
 style={duration === String(mins) ? {
 background: '#8fa898', color: '#1c2620', border: '1px solid rgba(143,168,152,0.5)',
 } : {
 background: 'rgba(42,26,17,0.06)', color: TEXT_MUTED, border: '1px solid rgba(42,26,17,0.08)',
 }}>
 {mins}m
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
 <button onClick={() => setTrainingType('progress')}
 className="px-4 py-3 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2"
 style={trainingType === 'progress' ? {
 background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)', color: '#6d28d9',
 } : {
 background: 'rgba(42,26,17,0.06)', border: '1px solid rgba(42,26,17,0.1)', color: TEXT_SECONDARY,
 }}>
 <TrendingUp className="w-4 h-4" /> Progreso
 </button>
 <button onClick={() => setTrainingType('consolidation')}
 className="px-4 py-3 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2"
 style={trainingType === 'consolidation' ? {
 background: 'rgba(143,168,152,0.25)', border: '1px solid rgba(143,168,152,0.5)', color: '#1c5838',
 } : {
 background: 'rgba(42,26,17,0.06)', border: '1px solid rgba(42,26,17,0.1)', color: TEXT_SECONDARY,
 }}>
 <span className="text-sm">🛡️</span> Consolidación
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
 <textarea value={progressNote} onChange={e => setProgressNote(e.target.value)}
 placeholder="He subido a 100kg en press banca..." rows={2}
 className="w-full rounded-xl px-4 py-3 text-[13px] focus:outline-none resize-none"
 style={{ background: 'rgba(42,26,17,0.06)', border: '1px solid rgba(139,92,246,0.25)', color: TEXT_PRIMARY }}
 />
 </div>
 )}

 {/* Notes */}
 <div>
 <label className="block text-[11px] uppercase tracking-wider mb-2" style={{ color: TEXT_MUTED }}>Notas</label>
 <textarea value={notes} onChange={e => setNotes(e.target.value)}
 placeholder="Cómo te has sentido..." rows={2}
 className="w-full rounded-xl px-4 py-3 text-[13px] focus:outline-none resize-none"
 style={{ background: 'rgba(42,26,17,0.06)', border: '1px solid rgba(42,26,17,0.1)', color: TEXT_PRIMARY }}
 />
 </div>

 {/* Submit */}
 <button onClick={handleSubmit} disabled={!duration || loading}
 className="w-full font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-[14px] disabled:opacity-40"
 style={{ background: TEXT_PRIMARY, color: 'rgba(245,237,224,0.95)' }}>
 {loading ? (
 <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
 ) : (
 <><Check className="w-4 h-4" /> Marcar como completada</>
 )}
 </button>
 </div>
 </div>
 </div>,
 document.body
 );
}
