export const PRESET_COLORS = [
  "#378ADD",
  "#1D9E75",
  "#7F77DD",
  "#E24B4A",
  "#BA7517",
  "#EF9F27",
  "#534AB7",
  "#185FA5",
  "#0F6E56",
  "#D4537E",
  "#1599B5",
  "#888780",
] as const;

export function normalizeHexColor(color: string): string | null {
  const trimmed = color.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) return `#${trimmed.toUpperCase()}`;
  return null;
}

export function isSameColor(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  const na = normalizeHexColor(a);
  const nb = normalizeHexColor(b);
  return na !== null && nb !== null && na === nb;
}

export function isPresetColor(color: string | null): boolean {
  if (!color) return false;
  return PRESET_COLORS.some((preset) => isSameColor(preset, color));
}

export function isCustomColor(
  color: string | null,
  inheritColor: string,
): boolean {
  if (!color) return false;
  if (isSameColor(color, inheritColor)) return false;
  return !isPresetColor(color);
}

export function groupDisplayColor(
  groupColor: string | null | undefined,
  contextColor: string,
): string {
  return normalizeHexColor(groupColor ?? contextColor) ?? contextColor;
}

export function groupBadgeStyle(color: string): {
  backgroundColor: string;
  color: string;
} {
  const hex = normalizeHexColor(color) ?? color;
  return {
    backgroundColor: `${hex}1A`,
    color: hex,
  };
}
