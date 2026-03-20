// ---------------------------------------------------------------------------
// plugins/bm/types/list-filters.ts — Bookmark list query filters (CLI + !bm list)
// ---------------------------------------------------------------------------

export type BmListFilters = {
  tags_all: string[] | null;
  category: string | null;
  title_contains: string | null;
  url_contains: string | null;
  to_read: boolean | null;
};

export const BM_LIST_FILTERS_NONE: BmListFilters = {
  tags_all: null,
  category: null,
  title_contains: null,
  url_contains: null,
  to_read: null,
};

type BmListFiltersPartial = {
  tags_all?: string[] | undefined;
  category?: string | undefined;
  title_contains?: string | undefined;
  url_contains?: string | undefined;
  to_read?: boolean | undefined;
};

export function normalizeBmListFilters(
  partial: BmListFiltersPartial,
): BmListFilters {
  return {
    tags_all: partial.tags_all ?? null,
    category: partial.category ?? null,
    title_contains: partial.title_contains ?? null,
    url_contains: partial.url_contains ?? null,
    to_read: partial.to_read ?? null,
  };
}
