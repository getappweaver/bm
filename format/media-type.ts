// ---------------------------------------------------------------------------
// plugins/bm/format/media-type.ts — canonical media type list + display labels
// ---------------------------------------------------------------------------

/**
 * Canonical media types showcased in prompts and UI. Storage stays free-form
 * (any lowercase label is accepted — see types/bookmark.ts); this list is the
 * shared source for prompt examples, filter help text, and renderer labels so
 * new types are promoted in one place.
 */
export const KNOWN_MEDIA_TYPES = [
  'read',
  'watch',
  'listen',
  'app',
  'game',
  'code',
] as const;

export type KnownMediaType = (typeof KNOWN_MEDIA_TYPES)[number];

const MEDIA_TYPE_EMOJI: Record<KnownMediaType, string> = {
  read: '📖',
  watch: '🎥',
  listen: '🎧',
  app: '📱',
  game: '🕹️',
  code: '💻',
};

/** Display label: known types get an emoji prefix, unknown stay plain text. */
export function mediaTypeLabel(mediaType: string): string {
  const normalized = mediaType.trim().toLowerCase();
  const emoji = MEDIA_TYPE_EMOJI[normalized as KnownMediaType];

  return emoji ? `${emoji} ${mediaType}` : mediaType;
}

/** Comma-joined canonical list for prompt/help prose (e.g. "read, watch, listen, app"). */
export function knownMediaTypesText(): string {
  return KNOWN_MEDIA_TYPES.join(', ');
}
