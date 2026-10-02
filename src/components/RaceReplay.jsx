import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { readPalette, blendCats } from '@/utils/blendColors';

// Repetición animada de la carrera (line chart race).
//  · Las líneas se dibujan día a día con interpolación suave.
//  · Color inteligente: cada tramo de línea se pinta con la mezcla de colores
//    de las familias de actividad acumuladas hasta ese día, ponderada por minutos.
//  · Ranking en vivo con reordenación animada y destello al adelantar.

const MONO = '"JetBrains Mono", monospace';
const DURATION = 7000; // ms para recorrer toda la ventana a 1×
const W = 300, H = 210, PAD_L = 6, PAD_R = 30, PAD_T = 12, PAD_B = 18;

export default function RaceReplay({ days, members, unit = 'h', onClose }) {
  const n = days.length;               // nº de días; los valores tienen n+1 puntos (0 = salida)
  const [t, setT] = useState(0);       // 0..n fraccional
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [flash, setFlash] = useState({}); // email → timestamp del último adelantamiento
  const lastTs = useRef(0);
  const lastOrder = useRef([]);

  // Colores de familia del tema actual y mezcla ponderada por minutos
  const palette = useMemo(() => readPalette(), []);
  const blend = (cats) => blendCats(cats, palette);

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

  // Vista fija completa (sin zoom): eje X = toda la ventana, eje Y hasta el máximo final
  const maxV = Math.max(1, ...members.map(m => m.values[n]));
  const c = { x0: 0, x1: n, y0: 0, y1: maxV * 1.08 };

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

      </div>

      <div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 230, overflow: 'hidden' }}>
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

        {/* Ranking en vivo — debajo, sin restar ancho a la gráfica */}
        <div className="relative mt-3" style={{ height: order.length * 26 }}>
          {order.map((o, pos) => (
            <div key={o.m.email} className="absolute left-0 right-0 flex items-center gap-1.5"
              style={{ top: pos * 26, height: 22, transition: 'top 0.45s cubic-bezier(0.3,0.9,0.3,1)' }}>
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
        <button onClick={() => { if (t >= n) setT(0); setPlaying(p => !p); }}
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

// Ventana que se abre al pulsar ▶ — mismo formato que la ficha de miembro,
// para no alterar la gráfica de la pantalla.
export function RaceReplaySheet({ title, onClose, ...props }) {
  return createPortal(
    <motion.div className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: 'var(--scrim)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}>
      <motion.div className="w-full max-w-lg"
        style={{
          background: 'var(--surface)', borderTopLeftRadius: 28, borderTopRightRadius: 28,
          boxShadow: '0 -12px 40px rgba(0,0,0,0.35)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
        }}
        initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        onClick={e => e.stopPropagation()}>
        <div className="pt-2.5 px-5">
          <div className="mx-auto mb-3 rounded-full" style={{ width: 36, height: 4, background: 'rgba(var(--ink),0.18)' }} />
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px]" style={{ letterSpacing: '0.08em', color: 'rgba(var(--ink),0.95)' }}>{title}</p>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(var(--ink),0.07)' }} aria-label="Cerrar">
              <X className="w-4 h-4" style={{ color: 'rgba(var(--ink),0.6)' }} />
            </button>
          </div>
          <RaceReplay {...props} />
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
