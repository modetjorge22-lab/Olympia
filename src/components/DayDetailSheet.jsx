import React from 'react';
import { Pencil, Trash2, Check, Plus, Trophy, TrendingUp, Shield } from 'lucide-react';
import { ACTIVITY_TYPES } from '@/hooks/useActivities';
import { iconFor, catColor } from '@/utils/activityIcons';
import { detectMuscleGroups, muscleLabel } from '@/utils/muscles';
import { Sheet, SheetTitle, IconButton } from '@/components/ui';

// Detalle de un día (inspirado en Activity Details de Bevel): resumen del día,
// tarjeta por actividad con sus métricas y acciones, planes pendientes y
// marcas batidas. Se abre al tocar un día en la semana o en el calendario.

const MONO = '"JetBrains Mono", monospace';
const INK = a => `rgba(var(--ink),${a})`;

const fmt = m => {
  if (!m) return '0 min';
  const h = Math.floor(m / 60), r = m % 60;
  return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`;
};

function Chip({ children }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px]"
      style={{ background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)' }}>{children}</span>
  );
}

function ActivityCard({ act, onEdit, onDelete }) {
  const Icon = iconFor(act.type);
  const info = ACTIVITY_TYPES[act.type] || { label: act.type };
  const muscles = act.type === 'strength_training'
    ? (Array.isArray(act.muscle_groups) && act.muscle_groups.length
      ? act.muscle_groups
      : detectMuscleGroups(`${act.title || ''} ${act.description || ''} ${act.progress_note || ''}`))
    : [];
  const result = act.match_result?.result;

  return (
    <div className="rounded-3xl p-4" style={{ background: INK(0.04), border: `1px solid ${INK(0.06)}` }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: catColor(act.type, 0.16), boxShadow: `inset 0 0 0 1px ${catColor(act.type, 0.5)}` }}>
          <Icon style={{ width: 18, height: 18, color: catColor(act.type, 1), filter: 'brightness(0.85)' }} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px]" style={{ color: INK(0.5) }}>{info.label}{act.source === 'strava' ? ' · Strava' : ''}</p>
          <p className="text-[14px] truncate" style={{ color: INK(0.95) }}>
            {act.description || info.label}
          </p>
        </div>
        {/* Editar y eliminar separados (12 px) y con zona de toque de 44 px:
            eliminar se puede deshacer, pero no debe tocarse por error. */}
        <div className="flex items-center gap-3">
          <IconButton icon={Pencil} label={`Editar ${info.label}`} onClick={() => onEdit(act)} />
          <IconButton icon={Trash2} label={`Eliminar ${info.label}`} onClick={() => onDelete(act.id)}
            style={{ background: 'transparent' }} />
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="rounded-2xl px-3 py-2" style={{ background: INK(0.04) }}>
          <p className="text-[9.5px]" style={{ color: INK(0.45) }}>Duración</p>
          <p className="text-[17px]" style={{ fontFamily: MONO, color: INK(0.95) }}>{fmt(act.duration_minutes)}</p>
        </div>
        <div className="rounded-2xl px-3 py-2" style={{ background: INK(0.04) }}>
          <p className="text-[9.5px]" style={{ color: INK(0.45) }}>
            {result ? 'Resultado' : act.training_type ? 'Sesión' : 'Tipo'}
          </p>
          <p className="text-[13px] mt-0.5 flex items-center gap-1" style={{ color: INK(0.9) }}>
            {result ? (result === 'win' ? 'Victoria' : result === 'loss' ? 'Derrota' : 'Empate')
              : act.training_type === 'progress' ? <><TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} /> Progreso</>
              : act.training_type === 'consolidation' ? <><Shield className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} /> Consolidación</>
              : info.label}
          </p>
        </div>
      </div>

      {muscles.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {muscles.map(m => <Chip key={m}>{muscleLabel(m)}</Chip>)}
        </div>
      )}
      {act.progress_note && (
        <p className="text-[11.5px] mt-3 italic leading-snug" style={{ color: INK(0.6) }}>“{act.progress_note}”</p>
      )}
    </div>
  );
}

export default function DayDetailSheet({
  date, activities = [], plans = [], prs = [],
  onClose, onEdit, onDelete, onCompletePlan, onRemovePlan, onDeletePr, onAdd, dietRow = null,
}) {
  if (!date) return null;
  const totalMin = activities.reduce((s, a) => s + (a.duration_minutes || 0), 0);
  const isFuture = date > new Date();
  const rawTitle = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

  return (
    <Sheet onClose={onClose} maxHeight="88dvh" label={title} header={
          <SheetTitle
            title={title}
            subtitle={activities.length
              ? `${activities.length} ${activities.length === 1 ? 'actividad' : 'actividades'} · ${fmt(totalMin)}`
              : plans.length ? `${plans.length} planificad${plans.length === 1 ? 'a' : 'as'}` : 'Sin actividad'}
            onClose={onClose} />
      }>

        <div className="overflow-y-auto overscroll-contain flex-1 px-5 pb-4 space-y-3">
          {dietRow && <div className="pb-3" style={{ borderBottom: '1px solid rgba(var(--ink),0.12)' }}>{dietRow}</div>}
          {activities.map(a => (
            <ActivityCard key={a.id} act={a} onEdit={onEdit} onDelete={onDelete} />
          ))}

          {/* Planificadas — marco discontinuo */}
          {plans.map(p => {
            const Icon = iconFor(p.activity_type);
            const info = ACTIVITY_TYPES[p.activity_type] || { label: p.activity_type };
            return (
              <div key={p.id} className="rounded-3xl p-4"
                style={{ border: '1.5px dashed rgba(var(--accent-rgb),0.45)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ border: '1px dashed rgba(var(--accent-rgb),0.6)' }}>
                    <Icon style={{ width: 17, height: 17, color: 'var(--accent)', opacity: 0.75 }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px]" style={{ color: INK(0.5) }}>Planificado · {info.label}</p>
                    <p className="text-[14px] truncate" style={{ color: INK(0.9) }}>{p.notes || info.label}</p>
                  </div>
                  {p.duration_minutes > 0 && (
                    <span className="text-[12px]" style={{ fontFamily: MONO, color: INK(0.6) }}>{fmt(p.duration_minutes)}</span>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  {!isFuture && (
                    <button onClick={() => onCompletePlan(p)}
                      className="o-press flex-1 py-2.5 rounded-full text-[12px] flex items-center justify-center gap-1.5"
                      style={{ background: 'rgba(var(--accent-rgb),0.12)', color: 'var(--accent)' }}>
                      <Check className="w-3.5 h-3.5" /> Marcar como hecha
                    </button>
                  )}
                  <button onClick={() => onRemovePlan(p.id)}
                    className={`o-press ${isFuture ? 'flex-1' : ''} px-4 py-2.5 rounded-full text-[12px]`}
                    style={{ background: INK(0.06), color: INK(0.55) }}>
                    Quitar
                  </button>
                </div>
              </div>
            );
          })}

          {/* Marcas batidas ese día */}
          {prs.map(pr => (
            <div key={pr.id} className="rounded-3xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'rgba(var(--accent-rgb),0.08)' }}>
              <Trophy className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px]" style={{ color: INK(0.9) }}>Marca personal · {pr.goal_title}</p>
                <p className="text-[12px]" style={{ fontFamily: MONO, color: 'var(--accent)' }}>
                  {pr.old_value != null ? `${pr.old_value} → ` : ''}{pr.new_value} {pr.unit}
                </p>
              </div>
              <IconButton icon={Trash2} label="Eliminar marca" onClick={() => onDeletePr(pr.id)}
                style={{ background: 'transparent' }} />
            </div>
          ))}

          {!activities.length && !plans.length && !prs.length && (
            <p className="text-center text-[12px] py-6" style={{ color: INK(0.45) }}>
              {isFuture ? 'Nada planificado para este día.' : 'No registraste actividad este día.'}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 px-5 pt-2 pb-4" style={{ borderTop: `1px solid ${INK(0.06)}` }}>
          <button onClick={() => onAdd(date)}
            className="o-press w-full py-3.5 rounded-full flex items-center justify-center gap-2 text-[14px]"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}>
            <Plus className="w-4 h-4" /> {isFuture ? 'Planificar actividad' : 'Añadir actividad'}
          </button>
        </div>
    </Sheet>
  );
}
