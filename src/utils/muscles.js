// Reconocimiento de grupos musculares en entrenos de fuerza.
// Dos niveles: conceptos compuestos (push/pull/full body reparten entre
// varios grupos) y términos exactos (curl → bíceps, sentadilla → piernas).

export const MUSCLE_GROUPS = [
  { key: 'pectorales', label: 'Pectorales' },
  { key: 'espalda', label: 'Espalda' },
  { key: 'piernas', label: 'Piernas' },
  { key: 'hombros', label: 'Hombros' },
  { key: 'core', label: 'Core' },
  { key: 'biceps', label: 'Bíceps' },
  { key: 'triceps', label: 'Tríceps' },
];

const ALL = MUSCLE_GROUPS.map(g => g.key);

// Cada entrada: palabras clave → grupos que activa. Un entreno puede activar
// varias entradas; las horas se reparten entre los grupos únicos resultantes.
const KEYWORD_MAP = [
  // ── Conceptos compuestos ──
  { kws: ['push', 'empuje'], groups: ['pectorales', 'hombros', 'triceps'] },
  { kws: ['pull', 'tiron', 'tirón'], groups: ['espalda', 'biceps'] },
  { kws: ['full body', 'fullbody', 'full-body', 'cuerpo completo'], groups: ALL },
  { kws: ['torso', 'upper'], groups: ['pectorales', 'espalda', 'hombros', 'biceps', 'triceps'] },
  { kws: ['brazo', 'arms'], groups: ['biceps', 'triceps'] },

  // ── Términos exactos ──
  { kws: ['pecho', 'pectoral', 'banca', 'bench', 'aperturas', 'contractor'], groups: ['pectorales'] },
  { kws: ['espalda', 'dominada', 'remo', 'jalon', 'jalón', 'pullover', 'back'], groups: ['espalda'] },
  { kws: ['pierna', 'sentadilla', 'squat', 'peso muerto', 'deadlift', 'gluteo', 'glúteo', 'femoral', 'cuadriceps', 'cuádriceps', 'leg', 'zancada', 'gemelo', 'hip thrust', 'prensa'], groups: ['piernas'] },
  { kws: ['hombro', 'militar', 'shoulder', 'ohp', 'deltoide', 'laterales'], groups: ['hombros'] },
  { kws: ['core', 'abs', 'abdominal', 'plancha', 'plank', 'oblicuo'], groups: ['core'] },
  { kws: ['bicep', 'bícep', 'curl'], groups: ['biceps'] },
  { kws: ['tricep', 'trícep', 'fondos', 'frances', 'francés', 'dips'], groups: ['triceps'] },
];

// Devuelve las claves de grupo detectadas en el texto (sin duplicados).
export function detectMuscleGroups(text) {
  const t = (text || '').toLowerCase();
  if (!t.trim()) return [];
  const out = new Set();
  KEYWORD_MAP.forEach(({ kws, groups }) => {
    if (kws.some(k => t.includes(k))) groups.forEach(g => out.add(g));
  });
  return [...out];
}

export function muscleLabel(key) {
  return MUSCLE_GROUPS.find(g => g.key === key)?.label || key;
}
