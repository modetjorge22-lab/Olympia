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

// Paleta unificada para los días — sobre fondo vino, beige como acento.
// Completado = beige sólido con texto vino; planificado = contorno beige suave.
export const DAY_PALETTE = {
  completed: {
    bg: '#f0e4d0',
    bgExpanded: '#f7efe1',
    text: '#2a121a',
    textOnSummary: 'rgba(245,237,224,0.8)',
    line: 'rgba(245,237,224,0.35)',
    glow: '0 1px 4px rgba(0,0,0,0.35)',
  },
  planned: {
    bg: 'transparent',
    bgExpanded: 'rgba(245,237,224,0.08)',
    text: 'rgba(245,237,224,0.85)',
    textOnSummary: 'rgba(245,237,224,0.65)',
    line: 'rgba(245,237,224,0.3)',
    // Contorno beige sin afectar al layout (box-shadow inset)
    glow: 'inset 0 0 0 1.5px rgba(240,228,208,0.45)',
  },
  // Día en que se batió una marca personal — beige más brillante con halo
  pr: {
    bg: '#f5ede0',
    bgExpanded: '#faf4e8',
    text: '#2a121a',
    textOnSummary: 'rgba(245,237,224,0.85)',
    line: 'rgba(240,228,208,0.5)',
    glow: '0 2px 12px rgba(240,228,208,0.35)',
  },
};
