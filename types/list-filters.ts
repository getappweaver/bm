// ---------------------------------------------------------------------------
// plugins/bm/types/list-filters.ts — Bookmark list query filters (CLI + !bm list)
// ---------------------------------------------------------------------------

export type BmListFilters = {
  tags_all: string[] | null;
  category: string | null;
  title_contains: string | null;
  url_contains: string | null;
  /** If true, only rows with in_queue = 1; if false, only in_queue = 0; null = no filter. */
  in_queue: boolean | null;
  /** If false, only rows with consumed_at IS NULL; if true, only consumed; null = no filter. */
  consumed: boolean | null;
  /** Exact match on normalized (lowercase) media_type; null = no filter. */
  media_type: string | null;
};

export const BM_LIST_FILTERS_NONE: BmListFilters = {
  tags_all: null,
  category: null,
  title_contains: null,
  url_contains: null,
  in_queue: null,
  consumed: null,
  media_type: null,
};

type BmListFiltersPartial = {
  tags_all?: string[] | undefined;
  category?: string | undefined;
  title_contains?: string | undefined;
  url_contains?: string | undefined;
  in_queue?: boolean | undefined;
  consumed?: boolean | undefined;
  media_type?: string | undefined;
};

export function normalizeBmListFilters(
  partial: BmListFiltersPartial,
): BmListFilters {
  return {
    tags_all: partial.tags_all ?? null,
    category: partial.category ?? null,
    title_contains: partial.title_contains ?? null,
    url_contains: partial.url_contains ?? null,
    in_queue: partial.in_queue ?? null,
    consumed: partial.consumed ?? null,
    media_type: partial.media_type ?? null,
  };
}
