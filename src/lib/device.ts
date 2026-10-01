/** Phones and tablets, but not large touchscreens such as a museum kiosk. */
export function isMobileDevice() {
  const ua = navigator.userAgent;
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  const handheld = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i.test(ua) || iPadOS;
  const small = Math.min(window.screen.width, window.screen.height) < 700;
  return handheld || small;
}
