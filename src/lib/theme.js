// Sistema de tema de Olympia — dos modos que invierten los roles:
//   dark  → lienzo vino, tinta/acento beige
//   light → lienzo beige, tinta/acento vino
// La mayoría de la UI usa variables CSS (definidas en index.css) que cambian
// con data-theme. Las gráficas SVG (recharts) no resuelven var(), así que
// reciben colores JS desde CHART[mode] vía useTheme().
import React, { createContext, useContext, useEffect, useState } from 'react';

const THEME_KEY = 'olympia_theme';

// Colores JS para gráficas recharts (atributos SVG, sin var())
export const CHART = {
  dark: {
    accent: '#f0e4d0',
    onAccent: '#2a121a',
    grid: 'rgba(245,237,224,0.08)',
    axis: 'rgba(245,237,224,0.18)',
    tick: 'rgba(245,237,224,0.45)',
    cursor: 'rgba(245,237,224,0.25)',
    ref: 'rgba(245,237,224,0.35)',
    refLabel: 'rgba(245,237,224,0.5)',
    raceFrom: { r: 245, g: 237, b: 224 }, // líder de la carrera
    raceTo: { r: 148, g: 122, b: 108 },   // colista
  },
  light: {
    accent: '#4a1626',
    onAccent: '#f5ede0',
    grid: 'rgba(42,18,26,0.08)',
    axis: 'rgba(42,18,26,0.2)',
    tick: 'rgba(42,18,26,0.45)',
    cursor: 'rgba(42,18,26,0.3)',
    ref: 'rgba(42,18,26,0.35)',
    refLabel: 'rgba(42,18,26,0.5)',
    raceFrom: { r: 74, g: 22, b: 38 },
    raceTo: { r: 205, g: 150, b: 160 },
  },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    try { localStorage.setItem(THEME_KEY, mode); } catch { /* noop */ }
  }, [mode]);

  const toggle = () => setMode(m => (m === 'dark' ? 'light' : 'dark'));

  // React.createElement en lugar de JSX porque este archivo es .js (no .jsx)
  return React.createElement(
    ThemeContext.Provider,
    { value: { mode, setMode, toggle, chart: CHART[mode] } },
    children
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  // Fallback seguro si algún componente se renderiza fuera del provider
  return ctx || { mode: 'dark', setMode: () => {}, toggle: () => {}, chart: CHART.dark };
}

// Tokens como strings CSS — válidos en estilos inline HTML (no en SVG attrs)
export const COLORS = {
  bg: 'var(--bg)',
  bgHeader: 'var(--header-bg)',

  textPrimary:   'rgba(var(--ink),0.95)',
  textSecondary: 'rgba(var(--ink),0.65)',
  textMuted:     'rgba(var(--ink),0.45)',
  textFaint:     'rgba(var(--ink),0.30)',

  accent: 'var(--accent)',
  accentSoft: 'rgba(var(--accent-rgb),0.14)',
  onAccent: 'var(--on-accent)',

  divider:     'rgba(var(--ink),0.12)',
  dividerSoft: 'rgba(var(--ink),0.08)',

  innerCellBg:     'rgba(var(--ink),0.08)',
  innerCellBorder: 'rgba(var(--ink),0.14)',
  todayBg:     'transparent',
  todayBorder: 'var(--accent)',

  dayActive: 'var(--accent)',
  dayActiveStrong: 'var(--accent-strong)',
  dayActiveText: 'var(--on-accent)',

  surface: 'var(--surface)',
  surfaceBorder: 'rgba(var(--ink),0.16)',
  surfaceShadow: '0 12px 40px rgba(0,0,0,0.5)',

  // Compat
  textOnBgPrimary:   'rgba(var(--ink),0.95)',
  textOnBgSecondary: 'rgba(var(--ink),0.65)',
  textOnBgMuted:     'rgba(var(--ink),0.45)',

  indigo: 'var(--info)',
  emerald: 'var(--success)',
  amber: 'var(--warning)',
  violet: '#8b5cf6',
  blue: '#3b82f6',
};

export const glassCard = {
  background: 'transparent',
  border: 'none',
  boxShadow: 'none',
};

export const surfaceCard = {
  background: 'var(--surface)',
  border: '1px solid rgba(var(--ink),0.16)',
  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
};
