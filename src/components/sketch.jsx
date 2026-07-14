import React from 'react';

// Trazos "a mano" de Olympia — lenguaje visual propio de los calendarios:
// marco discontinuo que no cierra las esquinas y brochazo grafiti para
// los días entrenados.

// Marco de rayas discontinuas abierto: cuatro segmentos (uno por lado),
// recortados en los extremos para que delimiten sin cerrar.
export function DashedFrame({ color, opacity = 0.28, inset = '22%' }) {
  const c = color || `rgba(var(--ink),${opacity})`;
  return (
    <>
      <span style={{ position: 'absolute', top: 0, left: inset, right: inset, borderTop: `1px dashed ${c}` }} />
      <span style={{ position: 'absolute', bottom: 0, left: inset, right: inset, borderTop: `1px dashed ${c}` }} />
      <span style={{ position: 'absolute', left: 0, top: inset, bottom: inset, borderLeft: `1px dashed ${c}` }} />
      <span style={{ position: 'absolute', right: 0, top: inset, bottom: inset, borderLeft: `1px dashed ${c}` }} />
    </>
  );
}

// Brochazo tipo grafiti — trazo único e idéntico en todos los días:
// cabeza gruesa abajo a la izquierda que barre en diagonal y se afila.
// Sobresale 2px de la celda para el efecto "pintado por encima".
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
        d="M4 21 C 8 17.2, 13.5 12.5, 22.5 4.5 C 21.2 7.8, 19.5 9.8, 16.5 12.6 C 13 15.8, 8.5 19.2, 4 21 Z"
        style={{ fill: color }}
        opacity={opacity}
      />
    </svg>
  );
}
