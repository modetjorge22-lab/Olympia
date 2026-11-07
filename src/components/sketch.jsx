import React from 'react';

// Trazos "a mano" de Olympia — lenguaje visual propio de los calendarios:
// marco discontinuo que no cierra las esquinas y brochazo grafiti para
// los días entrenados.

// Marco de rayas discontinuas abierto: cuatro segmentos (uno por lado),
// recortados en los extremos para que delimiten sin cerrar.
export function DashedFrame({ color, opacity = 0.38, inset = '22%', thickness = 1 }) {
  // Por defecto en el color de acento (vino en claro, beige en oscuro).
  // thickness=2 marca el día actual: las mismas rayas, en negrita.
  const c = color || `rgba(var(--accent-rgb),${opacity})`;
  return (
    <>
      <span style={{ position: 'absolute', top: 0, left: inset, right: inset, borderTop: `${thickness}px dashed ${c}` }} />
      <span style={{ position: 'absolute', bottom: 0, left: inset, right: inset, borderTop: `${thickness}px dashed ${c}` }} />
      <span style={{ position: 'absolute', left: 0, top: inset, bottom: inset, borderLeft: `${thickness}px dashed ${c}` }} />
      <span style={{ position: 'absolute', right: 0, top: inset, bottom: inset, borderLeft: `${thickness}px dashed ${c}` }} />
    </>
  );
}
