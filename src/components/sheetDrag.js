import { useDragControls } from 'framer-motion';

// Física compartida de las hojas (principios de fluidez de Apple):
//  · El arrastre solo empieza desde la cabecera/asa → no compite con el scroll
//    del contenido.
//  · Cierre por proyección de momentum: se usa la velocidad al soltar para
//    estimar dónde acabaría la hoja (misma fórmula que el scroll de iOS) y se
//    cierra si esa posición proyectada pasa el umbral. Un tirón rápido cierra
//    aunque el recorrido sea corto; un arrastre lento y corto vuelve a su sitio.
//  · Traspaso de velocidad: al cerrar con un tirón, la salida continúa a la
//    velocidad del dedo (onDismissVelocity → transición de salida de la hoja).
//  · Resistencia progresiva hacia arriba (rubber-band) en lugar de tope seco.
//  · Muelle al abrir/volver: amortiguamiento ≈ 0,92 y respuesta ≈ 0,31 s
//    (Apple usa 0,8 / 0,3 para hojas), sin rebote gratuito.

const DECELERATION = 0.998;
const project = (velocity) => (velocity / 1000) * DECELERATION / (1 - DECELERATION);

export const SHEET_SPRING = { type: 'spring', damping: 34, stiffness: 380, mass: 0.9 };

export function useSheetDrag(onClose, { threshold = 140, onDismissVelocity } = {}) {
  const controls = useDragControls();

  const dragProps = {
    drag: 'y',
    dragControls: controls,
    dragListener: false,
    dragConstraints: { top: 0, bottom: 0 },
    dragElastic: { top: 0.06, bottom: 0.8 },
    dragTransition: { bounceStiffness: 420, bounceDamping: 36 },
    onDragEnd: (_, info) => {
      const projected = info.offset.y + project(info.velocity.y);
      if (projected > threshold) {
        onDismissVelocity?.(Math.max(0, info.velocity.y));
        onClose();
      }
    },
  };

  // Se aplica a la cabecera (asa + título): ahí empieza el arrastre
  const handleProps = {
    onPointerDown: (e) => controls.start(e),
    style: { touchAction: 'none', cursor: 'grab' },
  };

  return { dragProps, handleProps };
}
