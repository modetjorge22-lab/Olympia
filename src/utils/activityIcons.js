// Símbolos y familias de color por tipo de actividad — usados en calendarios,
// detalle y alta. Los colores viven en index.css (--cat-*) por tema.
import React from 'react';
import {
  Dumbbell, Waves, Bike, CircleDot, Disc, Goal, Flower2,
  PersonStanding, Mountain, Swords, Flag, Activity,
} from 'lucide-react';

// Persona corriendo — dibujado a mano con el mismo trazo que lucide
// (lucide no trae este icono en la versión instalada).
export function RunnerIcon({ style, className, strokeWidth = 2 }) {
  return React.createElement('svg', {
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth,
    strokeLinecap: 'round', strokeLinejoin: 'round', style, className, 'aria-hidden': true,
  },
    React.createElement('circle', { cx: 15, cy: 4, r: 2 }),
    React.createElement('path', { d: 'M13.5 8 L10.5 14' }),
    React.createElement('path', { d: 'M7 10.5 L10.5 8.5 L14 10.5 L17 9.5' }),
    React.createElement('path', { d: 'M10.5 14 L14 16.5 L13 21' }),
    React.createElement('path', { d: 'M10.5 14 L8 18 L4.5 18.5' }),
  );
}

export const ACTIVITY_ICONS = {
  strength_training: Dumbbell,
  running: RunnerIcon,
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
