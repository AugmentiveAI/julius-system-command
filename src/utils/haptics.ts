export function hapticTap() {
  if (navigator.vibrate) navigator.vibrate(10);
}

export function hapticSuccess() {
  if (navigator.vibrate) navigator.vibrate([10, 50, 20]);
}
