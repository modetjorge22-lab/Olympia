// Paleta de la app — lienzo único vino, tinta beige por opacidades,
// beige sólido como acento (el rol del naranja en Strava).
export const COLORS = {
  // Fondo — vino casi negro (lienzo único de toda la app)
  bg: '#2a121a',
  bgHeader: '#2a121a',

  // Tinta beige sobre vino — jerarquía por opacidad
  textPrimary:   'rgba(245,237,224,0.95)', // títulos y datos
  textSecondary: 'rgba(245,237,224,0.65)', // subtítulos
  textMuted:     'rgba(245,237,224,0.45)', // labels / hints
  textFaint:     'rgba(245,237,224,0.30)', // días vacíos

  // Acento — beige sólido para resaltar (datos clave, días completados,
  // botón principal, PRs). Texto oscuro encima.
  accent: '#f0e4d0',
  accentSoft: 'rgba(240,228,208,0.14)',   // áreas de gráfica, halos
  onAccent: '#2a121a',

  // Separadores — sustituyen a los marcos de cards
  divider:     'rgba(245,237,224,0.12)',
  dividerSoft: 'rgba(245,237,224,0.08)',

  // Elementos interactivos sutiles sobre el fondo
  innerCellBg:     'rgba(245,237,224,0.08)',
  innerCellBorder: 'rgba(245,237,224,0.14)',
  todayBg:     'transparent',
  todayBorder: '#f0e4d0',

  // Días activos (calendario / planificador): beige sólido + texto vino
  dayActive: '#f0e4d0',
  dayActiveStrong: '#f5ede0',
  dayActiveText: '#2a121a',

  // Superficie elevada — modales, dropdowns, sheets (vino más claro)
  surface: '#3a1c28',
  surfaceBorder: 'rgba(245,237,224,0.16)',
  surfaceShadow: '0 12px 40px rgba(0,0,0,0.5)',

  // Compat con código antiguo (texto sobre fondo vino)
  textOnBgPrimary:   'rgba(245,237,224,0.95)',
  textOnBgSecondary: 'rgba(245,237,224,0.65)',
  textOnBgMuted:     'rgba(245,237,224,0.45)',

  // Acentos funcionales (se mantienen)
  indigo: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  violet: '#8b5cf6',
  blue: '#3b82f6',
};

// Antes: card beige glass. Ahora las secciones viven directamente sobre
// el fondo — sin marco. Se mantiene el export por compatibilidad.
export const glassCard = {
  background: 'transparent',
  border: 'none',
  boxShadow: 'none',
};

// Superficie elevada para modales/popovers (única excepción al lienzo plano)
export const surfaceCard = {
  background: COLORS.surface,
  border: `1px solid ${COLORS.surfaceBorder}`,
  boxShadow: COLORS.surfaceShadow,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
};
