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

// Paleta unificada para los días — usa tokens de tema (var CSS), así funciona
// en modo oscuro (acento beige) y claro (acento vino) sin cambios.
// Completado = acento sólido con texto invertido; planificado = contorno suave.
export const DAY_PALETTE = {
  completed: {
    bg: 'var(--accent)',
    bgExpanded: 'var(--accent-strong)',
    text: 'var(--on-accent)',
    textOnSummary: 'rgba(var(--ink),0.8)',
    line: 'rgba(var(--ink),0.35)',
    glow: '0 1px 4px rgba(0,0,0,0.25)',
  },
  planned: {
    bg: 'transparent',
    bgExpanded: 'rgba(var(--ink),0.08)',
    text: 'rgba(var(--ink),0.85)',
    textOnSummary: 'rgba(var(--ink),0.65)',
    line: 'rgba(var(--ink),0.3)',
    // Contorno sin afectar al layout (box-shadow inset)
    glow: 'inset 0 0 0 1.5px rgba(var(--accent-rgb),0.45)',
  },
  // Día en que se batió una marca personal — acento intenso con halo
  pr: {
    bg: 'var(--accent-strong)',
    bgExpanded: 'var(--accent-strong)',
    text: 'var(--on-accent)',
    textOnSummary: 'rgba(var(--ink),0.85)',
    line: 'rgba(var(--accent-rgb),0.5)',
    glow: '0 2px 12px rgba(var(--accent-rgb),0.35)',
  },
};
