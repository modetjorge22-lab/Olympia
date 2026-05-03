// Paleta de la app — glass beige sobre fondo vino
export const COLORS = {
  // Fondo — vino tinto profundo
  bg: '#3a1820',
  bgHeader: '#3a1820',

  // Cards beige glass opaco
  cardBg: 'rgba(245,237,224,0.92)',
  cardBorder: 'rgba(255,255,255,0.35)',
  cardShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.6)',

  // Texto sobre card beige (oscuro)
  textPrimary:   '#2a1a11',  // títulos
  textSecondary: '#6e5647',  // subtítulos
  textMuted:     '#8c7364',  // labels / hints
  textFaint:     'rgba(42,26,17,0.35)', // días vacíos

  // Texto sobre fondo vino (claro)
  textOnBgPrimary:   'rgba(245,237,224,0.92)',
  textOnBgSecondary: 'rgba(245,237,224,0.65)',
  textOnBgMuted:     'rgba(245,237,224,0.4)',

  // Verde salvia suave para días activos
  dayActive: '#8fa898',
  dayActiveStrong: '#7a9583',
  dayActiveText: '#1c2620',

  // Fondo de elementos dentro de card beige
  innerCellBg: 'rgba(42,26,17,0.07)',
  innerCellBorder: 'rgba(42,26,17,0.1)',
  todayBg: 'rgba(42,26,17,0.14)',
  todayBorder: 'rgba(42,26,17,0.22)',

  // Acentos (se mantienen como antes)
  indigo: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  violet: '#8b5cf6',
  blue: '#3b82f6',

  // Card glass común usado en JSX
  // (mantiene backward compat para código que importe glassCard)
};

export const glassCard = {
  background: COLORS.cardBg,
  border: `1px solid ${COLORS.cardBorder}`,
  boxShadow: COLORS.cardShadow,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
};
