import React from 'react';

// Piezas base del sistema de diseño de Olympia (design-system/README.md §6).
// Lo nuevo se construye con estas piezas; así una corrección llega a toda la app.

const INK = a => `rgba(var(--ink),${a})`;

// Botón primario (uno por pantalla) y secundario. Píldora, peso 400.
export function Button({ variant = 'primary', size = 'md', className = '', style, children, ...rest }) {
  const base = variant === 'primary'
    ? { background: 'var(--accent)', color: 'var(--on-accent)' }
    : variant === 'danger'
      ? { background: INK(0.06), color: 'var(--danger)' }
      : { background: INK(0.06), color: INK(0.75) };
  const pad = size === 'sm' ? 'px-3.5 py-2 text-[12px]' : 'px-5 py-3 text-[14px]';
  return (
    <button
      className={`o-press rounded-full inline-flex items-center justify-center gap-2 disabled:opacity-40 ${pad} ${className}`}
      style={{ ...base, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}

// Botón de icono: 32 px, aria-label obligatorio.
export function IconButton({ icon: Icon, label, size = 32, className = '', style, ...rest }) {
  return (
    <button
      aria-label={label}
      className={`o-press flex-shrink-0 rounded-full flex items-center justify-center ${className}`}
      style={{ width: size, height: size, background: INK(0.07), ...style }}
      {...rest}
    >
      <Icon style={{ width: size / 2, height: size / 2, color: INK(0.6) }} />
    </button>
  );
}

// Título de sección: DM Sans 13, tracking .14em, sin mayúsculas ni negrita.
export function SectionTitle({ children, right, className = 'mb-3', style }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <h3 style={{
        fontSize: 'var(--fs-section)', letterSpacing: 'var(--tracking-section)',
        fontWeight: 400, color: INK(0.95), ...style,
      }}>{children}</h3>
      {right}
    </div>
  );
}

// Etiqueta pequeña de grupo (sustituye a las micro-etiquetas en mayúsculas).
export function Eyebrow({ children, className = 'mb-2', style }) {
  return (
    <p className={className} style={{
      fontSize: 'var(--fs-caption)', letterSpacing: '0.06em', color: INK(0.45), ...style,
    }}>{children}</p>
  );
}

// Chip: acento .1 con texto acento, 10 px.
export function Chip({ children, className = '', style }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${className}`}
      style={{ background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)', fontSize: 'var(--fs-caption)', ...style }}>
      {children}
    </span>
  );
}
