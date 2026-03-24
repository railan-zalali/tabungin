import { MaterialCommunityIcons } from '@expo/vector-icons';

const ICON_ALIASES: Record<string, string> = {
  'shopping-bag': 'shopping',
};

const glyphMap = MaterialCommunityIcons.glyphMap as Record<string, number>;

export function resolveMaterialIcon(name?: string | null, fallback = 'tag'): string {
  const primaryCandidate = name ? ICON_ALIASES[name] ?? name : fallback;
  if (glyphMap[primaryCandidate]) {
    return primaryCandidate;
  }

  const fallbackCandidate = ICON_ALIASES[fallback] ?? fallback;
  if (glyphMap[fallbackCandidate]) {
    return fallbackCandidate;
  }

  return 'tag';
}
