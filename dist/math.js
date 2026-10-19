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
// Affine BF6 model: nonzero minimum (offset 4/3), anchored to the user's 7 = 79 cm at 800 DPI.
// Compatible with measured yaw ≈ 0.00173623 * sensitivity + 0.00231498 deg/count:
// https://sensitivitymatch.com/mouse-sensitivity-converter/cs2-to-battlefield-6/
const sensitivityOffset = 4 / 3;
export const sensitivityDegreesPerCount = sensitivity => (360 * 2.54 / (79 * 800)) * ((sensitivity + sensitivityOffset) / (7 + sensitivityOffset));
export const sensitivityCm360 = (sensitivity, dpi) => 79 * (800 / dpi) * ((7 + sensitivityOffset) / (sensitivity + sensitivityOffset));
