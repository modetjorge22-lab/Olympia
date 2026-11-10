// Háptico con causalidad (Apple: solo en momentos con significado: guardar,
// deshacer, completar). Un toque corto, nunca en interacciones de paso.
//  · Android: Vibration API.
//  · iOS: Safari no ofrece vibración, pero un <input type="checkbox" switch>
//    (Safari 17.4+) da un tic del sistema al conmutar. Es un recurso no
//    estándar: si deja de funcionar, simplemente no pasa nada.
// Falla siempre en silencio y respeta «reducir movimiento».

let iosSwitch = null;

function ensureIosSwitch() {
  if (iosSwitch || typeof document === 'undefined') return iosSwitch;
  const label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  iosSwitch = label;
  return iosSwitch;
}

export function haptic(ms = 10) {
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(ms);
      return;
    }
    if (/iP(hone|ad|od)/.test(navigator.userAgent)) ensureIosSwitch()?.click();
  } catch { /* sin háptico */ }
}
