import React from 'react';

// Trazos "a mano" de Olympia — lenguaje visual propio de los calendarios:
// marco discontinuo que no cierra las esquinas y brochazo grafiti para
// los días entrenados.

// Marco de rayas discontinuas abierto: cuatro segmentos (uno por lado),
// recortados en los extremos para que delimiten sin cerrar.
export function DashedFrame({ color, opacity = 0.38, inset = '22%' }) {
  // Por defecto en el color de acento (vino en claro, beige en oscuro)
  const c = color || `rgba(var(--accent-rgb),${opacity})`;
  return (
    <>
      <span style={{ position: 'absolute', top: 0, left: inset, right: inset, borderTop: `1px dashed ${c}` }} />
      <span style={{ position: 'absolute', bottom: 0, left: inset, right: inset, borderTop: `1px dashed ${c}` }} />
      <span style={{ position: 'absolute', left: 0, top: inset, bottom: inset, borderLeft: `1px dashed ${c}` }} />
      <span style={{ position: 'absolute', right: 0, top: inset, bottom: inset, borderLeft: `1px dashed ${c}` }} />
    </>
  );
}

// Garabato de rotulador — doble trazada en diagonal, compacta y con energía,
// idéntica en todos los días. Sobresale 2px de la celda: "pintado por encima".
export function BrushMark({ color = 'var(--accent)', opacity = 0.92 }) {
  return (
    <svg
      viewBox="0 0 26 26"
      style={{
        position: 'absolute',
        inset: -2,
        width: 'calc(100% + 4px)',
        height: 'calc(100% + 4px)',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <path
        d="M5 8.5 L15.5 5 L6.5 14.5 L18 11.5 L9 21.5 L20.5 18"
        fill="none"
        style={{ stroke: color }}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={opacity}
      />
    </svg>
  );
}
