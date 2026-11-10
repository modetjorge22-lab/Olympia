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
      className={`o-press o-hit flex-shrink-0 rounded-full flex items-center justify-center ${className}`}
      style={{ width: size, height: size, background: INK(0.07), ...style }}
      {...rest}
    >
      <Icon style={{ width: size / 2, height: size / 2, color: INK(0.6) }} />
    </button>
  );
}

// Selector segmentado: contenedor ink .06 y píldora activa ink .1 que se
// desliza (transform en el compositor, 420 ms). options: [clave, etiqueta, Icono?]
export function Segmented({ value, onChange, options, label, className = '' }) {
  const idx = Math.max(0, options.findIndex(([k]) => k === value));
  return (
    <div role="radiogroup" aria-label={label} className={`relative grid p-1 rounded-full ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)`, background: INK(0.06) }}>
      <span aria-hidden="true" className="absolute top-1 bottom-1 left-1 rounded-full"
        style={{
          width: `calc((100% - 8px) / ${options.length})`,
          transform: `translateX(${idx * 100}%)`,
          transition: 'transform 420ms cubic-bezier(.32,.72,0,1)',
          background: INK(0.1),
        }} />
      {options.map(([key, text, Icon]) => (
        <button key={key} type="button" role="radio" aria-checked={value === key} onClick={() => onChange(key)}
          className="relative z-10 flex items-center justify-center gap-2 py-2 text-[12px]"
          style={{ color: value === key ? INK(0.95) : INK(0.5), transition: 'color 150ms ease-out' }}>
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {text}
        </button>
      ))}
    </div>
  );
}

// Línea de estado: el resultado (error, hecho) junto a lo que lo causa, 11 px,
// con icono y color --danger/--success, sin cajas de color (§6 «Estado en línea»).
export function StatusLine({ tone = 'error', icon: Icon, children, className = '' }) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`flex items-center gap-1.5 ${className}`}
      style={{ fontSize: 'var(--fs-meta)', color: tone === 'error' ? 'var(--danger)' : 'var(--success)' }}>
      {Icon && <Icon aria-hidden className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.7} />}
      <span>{children}</span>
    </p>
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
