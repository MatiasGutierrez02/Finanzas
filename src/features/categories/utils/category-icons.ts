export const CATEGORY_ICON_FALLBACK = 'category';

export function resolveCategoryIcon(icon: string | null): string {
  return icon?.trim() || CATEGORY_ICON_FALLBACK;
}
