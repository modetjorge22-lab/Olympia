// Símbolos y familias de color por tipo de actividad — usados en calendarios,
// detalle y alta. Los colores viven en index.css (--cat-*) por tema.
import {
  Dumbbell, Footprints, Waves, Bike, CircleDot, Disc, Goal, Flower2,
  PersonStanding, Mountain, Swords, Flag, Activity,
} from 'lucide-react';

export const ACTIVITY_ICONS = {
  strength_training: Dumbbell,
  running: Footprints,
  swimming: Waves,
  cycling: Bike,
  tennis: CircleDot,
  padel: Disc,
  football: Goal,
  yoga: Flower2,
  pilates: PersonStanding,
  hiking: Mountain,
  martial_arts: Swords,
  golf: Flag,
  other: Activity,
};

export function iconFor(type) {
  return ACTIVITY_ICONS[type] || Activity;
}

// Familias: fuerza · cardio · deporte · movilidad · otro
const CATEGORY_OF = {
  strength_training: 'fuerza',
  running: 'cardio', cycling: 'cardio', swimming: 'cardio', hiking: 'cardio',
  tennis: 'deporte', padel: 'deporte', football: 'deporte', golf: 'deporte', martial_arts: 'deporte',
  yoga: 'movilidad', pilates: 'movilidad',
  other: 'otro',
};

export const CATEGORIES = [
  { key: 'fuerza', label: 'Fuerza' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'deporte', label: 'Deporte' },
  { key: 'movilidad', label: 'Movilidad' },
];

export function categoryOf(type) {
  return CATEGORY_OF[type] || 'otro';
}

// Color de familia con opacidad, p.ej. catColor('running', 0.4)
export function catColor(type, alpha = 1) {
  return `rgba(var(--cat-${categoryOf(type)}),${alpha})`;
}
