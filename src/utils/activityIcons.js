// Símbolos pequeños por tipo de actividad — sustituyen a los emojis en
// calendarios, detalle y alta. Iconos de línea (lucide) en el color de acento.
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
