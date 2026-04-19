import React from 'react';

/**
 * Logo Olympia — símbolo de infinito con tensión.
 * Un bucle fino (izquierdo, ~el pasado) y uno grueso (derecho, ~el empuje hacia adelante).
 *
 * Props:
 *   size    — alto del símbolo en px (aspect ratio 2:1)
 *   color   — color principal del trazo (bucle grueso)
 *   subtle  — opacidad/tono del bucle fino (se calcula desde color)
 */
export default function InfinityMark({ size = 24, color = 'rgba(245,237,224,0.92)' }) {
  const width = size * 2;
  const height = size;

  // El bucle fino usa el mismo color pero con menor opacidad visual
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 88 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Olympia"
      style={{ display: 'block' }}
    >
      {/* Bucle izquierdo — fino, sutil (representa el pasado/base) */}
      <path
        d="M44 22 C 34 10, 22 10, 22 22 C 22 34, 34 34, 44 22"
        stroke={color}
        strokeOpacity="0.55"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Bucle derecho — grueso, intenso (representa el empuje adelante) */}
      <path
        d="M44 22 C 54 10, 66 10, 66 22 C 66 34, 54 34, 44 22"
        stroke={color}
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
