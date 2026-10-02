// Mezcla de colores por familia de actividad, ponderada por minutos.
// Lee los colores --cat-* del tema activo (se deben releer al cambiar de tema).

function readRGB(name, fallback) {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = v.split(',').map(x => parseFloat(x));
  return parts.length === 3 && parts.every(n => !Number.isNaN(n)) ? parts : fallback;
}

export function readPalette() {
  return {
    fuerza: readRGB('--cat-fuerza', [74, 22, 38]),
    cardio: readRGB('--cat-cardio', [226, 178, 32]),
    deporte: readRGB('--cat-deporte', [72, 160, 100]),
    movilidad: readRGB('--cat-movilidad', [92, 156, 220]),
    otro: readRGB('--cat-otro', [120, 110, 105]),
    ink: readRGB('--ink', [42, 18, 26]),
  };
}

// cats: { fuerza: minutos, cardio: minutos, … }
export function blendCats(cats, palette) {
  let tot = 0; const acc = [0, 0, 0];
  Object.entries(cats || {}).forEach(([k, m]) => {
    const c = palette[k] || palette.otro;
    acc[0] += c[0] * m; acc[1] += c[1] * m; acc[2] += c[2] * m; tot += m;
  });
  if (!tot) return `rgba(${palette.ink.join(',')},0.35)`;
  return `rgb(${acc.map(x => Math.round(x / tot)).join(',')})`;
}
