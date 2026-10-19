export const radians = degrees => degrees * Math.PI / 180;
export const degrees = radians => radians * 180 / Math.PI;
export const horizontalFov = (vertical, aspect) => degrees(2 * Math.atan(Math.tan(radians(vertical) / 2) * aspect));
export const verticalFov = (horizontal, aspect) => degrees(2 * Math.atan(Math.tan(radians(horizontal) / 2) / aspect));
export const zoomFov = (vertical, zoom) => degrees(2 * Math.atan(Math.tan(radians(vertical) / 2) / zoom));
export function usaMultiplier(baseVertical, adsVertical, coefficient) {
  const base = Math.tan(radians(baseVertical) / 2);
  const ads = Math.tan(radians(adsVertical) / 2);
  const c = coefficient / 100;
  return c < 1e-8 ? ads / base : Math.atan(c * ads) / Math.atan(c * base);
}
export const referenceFraction = (coefficient, aspect) => coefficient / 100 / aspect;
// User reference: sensitivity 7 = 79 cm/360 at 800 DPI. Other values scale linearly.
export const sensitivityDegreesPerCount = sensitivity => (360 * 2.54 / (79 * 800)) * (sensitivity / 7);
export const sensitivityCm360 = (sensitivity, dpi) => sensitivity === 0 ? Infinity : (360 / sensitivityDegreesPerCount(sensitivity)) * 2.54 / dpi;
