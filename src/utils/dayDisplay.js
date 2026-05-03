// Formato de duración compacto para mostrar bajo cada día
export function formatDuration(min) {
  if (!min || min <= 0) return '';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${m}`;
}

// Devuelve { name, duration } para resumir una actividad bajo el día
export function getActivitySummary(act, activityTypes) {
  const desc = (act.description || '').trim();
  const label = activityTypes[act.type]?.label || act.type || '';
  return {
    name: desc || label,
    duration: formatDuration(act.duration_minutes || 0),
  };
}

// Devuelve { name, duration } para resumir un plan bajo el día
export function getPlanSummary(plan, activityTypes) {
  const notes = (plan.notes || '').trim();
  const label = activityTypes[plan.activity_type]?.label || plan.activity_type || '';
  return {
    name: notes || label,
    duration: formatDuration(plan.duration_minutes || 0),
  };
}

// Paleta unificada para los marcos de actividad
export const DAY_PALETTE = {
  completed: {
    bg: '#8fa898',
    bgExpanded: '#7a9583',
    text: '#1c2620',
    textOnSummary: '#3a5043',
    line: 'rgba(108,138,118,0.7)',
    glow: '0 1px 4px rgba(143,168,152,0.25)',
  },
  planned: {
    bg: '#9c8bbf',
    bgExpanded: '#8576a8',
    text: '#1f1840',
    textOnSummary: '#3d2d6d',
    line: 'rgba(110,90,152,0.7)',
    glow: '0 1px 4px rgba(140,121,180,0.35)',
  },
};
