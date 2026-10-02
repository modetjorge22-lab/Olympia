import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';

// Repetición animada de la carrera (line chart race).
//  · Las líneas se dibujan día a día con interpolación suave.
//  · Cámara dinámica: durante el play se acerca a la cabeza de la carrera
//    (ventana de días alrededor del instante actual) y ajusta el eje vertical
//    al pelotón; al terminar se aleja a la vista completa.
//  · Color inteligente: cada tramo de línea se pinta con la mezcla de colores
//    de las familias de actividad acumuladas hasta ese día, ponderada por minutos.
//  · Ranking en vivo con reordenación animada y destello al adelantar.

const MONO = '"JetBrains Mono", monospace';
const DURATION = 7000; // ms para recorrer toda la ventana a 1×
const W = 300, H = 210, PAD_L = 6, PAD_R = 30, PAD_T = 12, PAD_B = 18;

function readRGB(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = v.split(',').map(x => parseFloat(x));
  return parts.length === 3 && parts.every(n => !Number.isNaN(n)) ? parts : fallback;
}

export default function RaceReplay({ days, members, unit = 'h', onClose }) {
  const n = days.length;               // nº de días; los valores tienen n+1 puntos (0 = salida)
  const [t, setT] = useState(0);       // 0..n fraccional
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [flash, setFlash] = useState({}); // email → timestamp del último adelantamiento
  const cam = useRef(null);            // dominio de cámara suavizado
  const lastTs = useRef(0);
  const lastOrder = useRef([]);

  // Colores de familia del tema actual
  const palette = useMemo(() => ({
    fuerza: readRGB('--cat-fuerza', [74, 22, 38]),
    cardio: readRGB('--cat-cardio', [226, 178, 32]),
    deporte: readRGB('--cat-deporte', [72, 160, 100]),
    movilidad: readRGB('--cat-movilidad', [92, 156, 220]),
    otro: readRGB('--cat-otro', [120, 110, 105]),
    ink: readRGB('--ink', [42, 18, 26]),
  }), []);

  const blend = (cats) => {
    let tot = 0; const acc = [0, 0, 0];
    Object.entries(cats || {}).forEach(([k, m]) => {
      const c = palette[k] || palette.otro;
      acc[0] += c[0] * m; acc[1] += c[1] * m; acc[2] += c[2] * m; tot += m;
    });
    if (!tot) return `rgba(${palette.ink.join(',')},0.35)`;
    return `rgb(${acc.map(x => Math.round(x / tot)).join(',')})`;
  };

  const valAt = (vals, x) => {
    const i = Math.floor(x), f = x - i;
    if (i >= n) return vals[n];
    return vals[i] + (vals[i + 1] - vals[i]) * f;
  };

  // Bucle de animación
  useEffect(() => {
    if (!playing) return;
    let raf;
    const step = (ts) => {
      const dt = lastTs.current ? ts - lastTs.current : 16;
      lastTs.current = ts;
      setT(prev => {
        const nx = Math.min(n, prev + (dt / DURATION) * n * speed);
        if (nx >= n) setPlaying(false);
        return nx;
      });
      raf = requestAnimationFrame(step);
    };
    lastTs.current = 0;
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, n]);

  // Ranking actual y detección de adelantamientos
  const order = members
    .map(m => ({ m, v: valAt(m.values, t) }))
    .sort((a, b) => b.v - a.v);
  useEffect(() => {
    const ids = order.map(o => o.m.email);
    const prev = lastOrder.current;
    if (prev.length && playing) {
      ids.forEach((id, pos) => {
        const was = prev.indexOf(id);
        if (was > pos) setFlash(f => ({ ...f, [id]: Date.now() }));
      });
    }
    lastOrder.current = ids;
  }); // se evalúa en cada frame; solo actualiza estado cuando hay adelantamiento

  // Cámara: objetivo según el instante (zoom durante el play, completo al final)
  const finished = !playing && t >= n;
  const target = (() => {
    if (finished || n <= 7) {
      const maxV = Math.max(1, ...members.map(m => m.values[n]));
      return { x0: 0, x1: n, y0: 0, y1: maxV * 1.08 };
    }
    const span = Math.max(5, n * 0.4);
    const x1 = Math.min(n, Math.max(span, t + span * 0.12));
    const x0 = Math.max(0, x1 - span);
    const visible = members.flatMap(m => [valAt(m.values, Math.max(x0, 0)), valAt(m.values, t)]);
    const lo = Math.min(...visible), hi = Math.max(...visible, lo + 1);
    const pad = (hi - lo) * 0.18 + 0.3;
    return { x0, x1, y0: Math.max(0, lo - pad), y1: hi + pad };
  })();
  if (!cam.current) cam.current = { ...target };
  const k = playing ? 0.12 : 0.18; // suavizado de cámara
  const c = cam.current;
  ['x0', 'x1', 'y0', 'y1'].forEach(key => { c[key] += (target[key] - c[key]) * k; });

  const X = x => PAD_L + ((x - c.x0) / Math.max(0.001, c.x1 - c.x0)) * (W - PAD_L - PAD_R);
  const Y = v => H - PAD_B - ((v - c.y0) / Math.max(0.001, c.y1 - c.y0)) * (H - PAD_T - PAD_B);

  const fi = Math.floor(t);
  const dayIdx = Math.min(n - 1, Math.max(0, Math.ceil(t) - 1));
  const d = days[dayIdx];
  const dayLabel = d ? d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '';

  // Rejilla horizontal (4 niveles dentro del dominio visible)
  const grid = Array.from({ length: 4 }, (_, i) => c.y0 + ((c.y1 - c.y0) * (i + 1)) / 4);
  const fmt = v => (unit === 'h' ? `${v.toFixed(v < 10 ? 1 : 0)}h` : `${Math.round(v)}`);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[22px] leading-none" style={{ fontFamily: MONO, color: 'var(--accent)' }}>{dayLabel}</span>
        <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(var(--ink),0.07)' }} aria-label="Cerrar repetición">
          <X className="w-3.5 h-3.5" style={{ color: 'rgba(var(--ink),0.6)' }} />
        </button>
      </div>

      <div className="flex gap-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="flex-1" style={{ height: 210, overflow: 'hidden' }}>
          <defs>
            <clipPath id="race-clip"><rect x={0} y={0} width={W - PAD_R + 4} height={H} /></clipPath>
            {members.map(m => (
              <clipPath key={m.email} id={`race-av-${m.email.replace(/[^a-z0-9]/gi, '')}`}>
                <circle r={9} />
              </clipPath>
            ))}
          </defs>
          {grid.map((g, i) => (
            <g key={i}>
              <line x1={PAD_L} x2={W - PAD_R} y1={Y(g)} y2={Y(g)} stroke={`rgba(${palette.ink.join(',')},0.07)`} strokeDasharray="3 3" />
              <text x={W - PAD_R + 4} y={Y(g) + 3} fontSize="8" fontFamily="monospace" fill={`rgba(${palette.ink.join(',')},0.4)`}>{fmt(g)}</text>
            </g>
          ))}

          <g clipPath="url(#race-clip)">
            {/* Líneas por tramos con su mezcla de color en cada día */}
            {members.map((m, mi) => {
              const segs = [];
              for (let i = 1; i <= fi; i++) {
                segs.push(<line key={i} x1={X(i - 1)} y1={Y(m.values[i - 1])} x2={X(i)} y2={Y(m.values[i])}
                  stroke={blend(m.cats[i])} strokeWidth={mi === 0 ? 2.6 : 2} strokeLinecap="round" />);
              }
              if (t > fi) {
                const v = valAt(m.values, t);
                segs.push(<line key="tail" x1={X(fi)} y1={Y(m.values[fi])} x2={X(t)} y2={Y(v)}
                  stroke={blend(m.cats[Math.min(n, fi + 1)])} strokeWidth={mi === 0 ? 2.6 : 2} strokeLinecap="round" />);
              }
              return <g key={m.email}>{segs}</g>;
            })}

            {/* Cabezas: avatar + destello si acaba de adelantar */}
            {members.map(m => {
              const v = valAt(m.values, t);
              const color = blend(m.cats[Math.min(n, Math.max(0, Math.ceil(t)))]);
              const f = flash[m.email] && Date.now() - flash[m.email] < 700;
              const initials = m.name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
              const clipId = `race-av-${m.email.replace(/[^a-z0-9]/gi, '')}`;
              return (
                <g key={m.email} transform={`translate(${X(t)},${Y(v)})`}>
                  {f && <circle r={15} fill="none" stroke={color} strokeWidth={2} opacity={0.5}>
                    <animate attributeName="r" from="10" to="20" dur="0.7s" />
                    <animate attributeName="opacity" from="0.7" to="0" dur="0.7s" />
                  </circle>}
                  <circle r={10.5} fill={color} />
                  {m.avatar_url
                    ? <image href={m.avatar_url} x={-9} y={-9} width={18} height={18} clipPath={`url(#${clipId})`} preserveAspectRatio="xMidYMid slice" />
                    : <text textAnchor="middle" dy="0.35em" fontSize="7.5" fill="#fffdf5" fontWeight="600">{initials}</text>}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Ranking en vivo */}
        <div className="relative flex-shrink-0" style={{ width: 104, height: Math.max(order.length * 28, 60) }}>
          {order.map((o, pos) => (
            <div key={o.m.email} className="absolute left-0 right-0 flex items-center gap-1.5"
              style={{ top: pos * 28, height: 24, transition: 'top 0.45s cubic-bezier(0.3,0.9,0.3,1)' }}>
              <span className="text-[9px] w-2.5" style={{ fontFamily: MONO, color: 'rgba(var(--ink),0.45)' }}>{pos + 1}</span>
              <span className="rounded-full flex-shrink-0" style={{ width: 9, height: 9, background: blend(o.m.cats[Math.min(n, Math.max(0, Math.ceil(t)))]) }} />
              <span className="text-[10.5px] flex-1 truncate" style={{ color: 'rgba(var(--ink),0.9)' }}>{o.m.name.split(' ')[0]}</span>
              <span className="text-[9.5px]" style={{ fontFamily: MONO, color: 'var(--accent)' }}>{fmt(o.v)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-2.5 mt-2">
        <button onClick={() => { if (t >= n) { setT(0); cam.current = null; } setPlaying(p => !p); }}
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent)' }} aria-label={playing ? 'Pausar' : 'Reproducir'}>
          {playing
            ? <svg width="11" height="11" viewBox="0 0 12 12"><path d="M3 1.5h2.2v9H3zM6.8 1.5H9v9H6.8z" fill="var(--on-accent)" /></svg>
            : <svg width="11" height="11" viewBox="0 0 12 12"><path d="M3 1.5 L10 6 L3 10.5Z" fill="var(--on-accent)" /></svg>}
        </button>
        <input type="range" min={0} max={1000} value={Math.round((t / n) * 1000)}
          onChange={e => { setPlaying(false); setT((e.target.value / 1000) * n); }}
          className="flex-1" style={{ accentColor: 'var(--accent)' }} aria-label="Avanzar en la carrera" />
        {[1, 2].map(s => (
          <button key={s} onClick={() => setSpeed(s)} className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ fontFamily: MONO, ...(speed === s ? { background: 'rgba(var(--ink),0.1)', color: 'rgba(var(--ink),0.95)' } : { color: 'rgba(var(--ink),0.45)', border: '1px solid rgba(var(--ink),0.12)' }) }}>
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}
