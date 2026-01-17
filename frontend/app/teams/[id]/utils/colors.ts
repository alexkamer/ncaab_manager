/**
 * Ensure hex color has # prefix
 * @param hex - Hex color code (e.g., "#FF5733" or "FF5733")
 * @returns Hex color with # prefix (e.g., "#FF5733")
 */
export function ensureHexPrefix(hex: string | undefined): string | undefined {
  if (!hex) return undefined;
  return hex.startsWith('#') ? hex : `#${hex}`;
}

/**
 * Convert hex color to RGB with opacity
 * @param hex - Hex color code (e.g., "#FF5733" or "FF5733")
 * @param opacity - Opacity value between 0 and 1 (default: 0.65 for 65%)
 * @returns RGB color string with opacity (e.g., "rgba(255, 87, 51, 0.65)")
 */
export function hexToRgba(hex: string | undefined, opacity: number = 0.65): string {
  if (!hex) {
    // Return a neutral gray if no color is provided
    return `rgba(156, 163, 175, ${opacity})`;
  }

  // Remove # if present
  hex = hex.replace('#', '');

  // Parse hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Determine if a color is light or dark (for text contrast)
 * @param hex - Hex color code
 * @returns true if the color is light, false if dark
 */
export function isLightColor(hex: string | undefined): boolean {
  if (!hex) return true;

  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
