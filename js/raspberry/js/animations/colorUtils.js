/**
 * WS2812 LEDs use GRB (Green-Red-Blue) color order
 * This utility converts between RGB input and GRB output format
 */

/**
 * Convert RGB values to GRB pixel format for WS2812 LEDs
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {number} GRB pixel value
 */
export function rgbToGrb(r, g, b) {
  return (g << 16) | (r << 8) | b;
}

/**
 * Convert RGB color object to GRB pixel format
 * @param {Object} color - {r, g, b} color object
 * @param {number} intensity - Optional intensity multiplier (0-1)
 * @returns {number} GRB pixel value
 */
export function colorToGrb(color, intensity = 1.0) {
  const clamped = Math.max(0, Math.min(1, intensity));
  const r = Math.floor(color.r * clamped);
  const g = Math.floor(color.g * clamped);
  const b = Math.floor(color.b * clamped);
  return (g << 16) | (r << 8) | b;
}

/**
 * Convert a 24-bit RGB value to GRB
 * @param {number} rgbPixel - RGB pixel value (r << 16 | g << 8 | b)
 * @returns {number} GRB pixel value
 */
export function rgbPixelToGrb(rgbPixel) {
  const r = (rgbPixel >> 16) & 0xFF;
  const g = (rgbPixel >> 8) & 0xFF;
  const b = rgbPixel & 0xFF;
  return (g << 16) | (r << 8) | b;
}
