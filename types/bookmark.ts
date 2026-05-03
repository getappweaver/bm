// ---------------------------------------------------------------------------
// plugins/bm/types/bookmark.ts — Stored bookmark row (bm_bookmarks) + CRUD inputs
// ---------------------------------------------------------------------------
import { z } from 'zod';

/** Stored row: taxonomy + media + queue are always defined (DB NOT NULL). */
export const BmSchema = z.object({
  id: z.number(),
  url: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  description: z.string().nullable(),
  category: z.string().min(1),
  tags: z.string().min(1),
  media_type: z.string().min(1),
  in_queue: z.boolean(),
  consumed_at: z.number().nullable(),
  created_at: z.number(),
  nostr_naddr: z.string().nullable(),
  published_at: z.number().nullable(),
});

export type Bm = z.infer<typeof BmSchema>;

export type BmTagCount = {
  tag: string;
  count: number;
};

export type BmCategoryCount = {
  category: string;
  count: number;
};

export type BmMediaTypeCount = {
  media_type: string;
  count: number;
};

/** Optional string fields: omit key, or pass string, or explicit null (clears). */
const optionalStringOrNull = z.union([z.string(), z.null()]).optional();

const tagsCommaMinOne = z
  .string()
  .min(1)
  .describe(
    'Comma-separated keywords (lowercase in storage). At least one tag required.',
  )
  .refine(
    (s) =>
      s
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0).length >= 1,
    { message: 'At least one comma-separated tag is required' },
  );

const tagsCommaMinOneOptional = z
  .string()
  .min(1)
  .refine(
    (s) =>
      s
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0).length >= 1,
    { message: 'At least one comma-separated tag is required' },
  );

export const CreateBmInputSchema = z.object({
  url: z
    .string()
    .min(1)
    .describe(
      'Target URL or URI. Fetch http/https resources before filling other fields when your environment allows it.',
    ),
  title: z
    .string()
    .min(1)
    .describe(
      'Title taken from the fetched document (markdown heading, HTML title, or first substantive line)—not a raw path segment unless there is no better option.',
    ),
  summary: optionalStringOrNull.describe(
    'Page summary in your own words—ONLY include this field when the user clearly asked for a summary (e.g. "summarize", "tl;dr", "overview of the page"). Otherwise omit it entirely.',
  ),
  description: optionalStringOrNull.describe(
    'Optional extra notes, quotes, or user-facing commentary—distinct from summary.',
  ),
  category: z
    .string()
    .min(1)
    .refine((s) => s.trim().length > 0, {
      message: 'category must be non-empty after trim',
    })
    .describe(
      "Slash-separated path inferred from topic, e.g. 'tech/nostr'; prefer labels that match the user's existing categories in context. Required on every create.",
    ),
  tags: tagsCommaMinOne,
  media_type: z
    .string()
    .min(1)
    .refine((s) => s.trim().length > 0, {
      message: 'media_type must be non-empty after trim',
    })
    .describe(
      'Primary kind of resource: free lowercase label (e.g. read, watch, listen, activity). Prefer existing media types from context when they fit; invent a new label only when needed. Required on every create.',
    ),
  in_queue: z
    .boolean()
    .describe(
      'true = active backlog (save for later); false = reference-only. Required on every create.',
    ),
});

export const ImportBmInputSchema = CreateBmInputSchema.extend({
  nostr_naddr: z.string().min(1).optional(),
  published_at: z.number().int().nonnegative().optional(),
});

export type CreateBmInputRaw = z.infer<typeof CreateBmInputSchema>;
export type ImportBmInputRaw = z.infer<typeof ImportBmInputSchema>;

/** Normalized create payload: required taxonomy, media, queue; optional summary/description. */
export type CreateBmInput = {
  url: string;
  title: string;
  category: string;
  tags: string;
  media_type: string;
  in_queue: boolean;
  summary?: string;
  description?: string;
};

export type ImportBmInput = CreateBmInput & {
  nostr_naddr?: string;
  published_at?: number;
};

/** Create / update: trim; no silent default (AI and drafts must supply real taxonomy). */
export function normalizeCategoryForCreate(raw: string): string {
  const t = raw.trim();

  if (t === '') {
    throw new Error('category must be non-empty after trim');
  }

  return t;
}

/** Create / update: canonical stored tags string; at least one token. */
export function normalizeTagsForCreate(raw: string): string {
  const tokens = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);

  if (tokens.length === 0) {
    throw new Error('tags must contain at least one token');
  }

  return [...new Set(tokens)].sort((a, b) => a.localeCompare(b)).join(', ');
}

/** Create / update / row read: trim, lowercase; DB column is NOT NULL — no default label. */
export function normalizeMediaTypeForCreate(raw: string): string {
  const t = raw.trim().toLowerCase();

  if (t === '') {
    throw new Error('media_type must be non-empty after trim');
  }

  return t;
}

/** Optional list/tool filter: null means “do not filter by media_type”. */
export function normalizeMediaTypeFilter(
  raw: string | null | undefined,
): string | null {
  if (raw == null) {
    return null;
  }

  const t = raw.trim().toLowerCase();

  return t === '' ? null : t;
}

export function normalizeCreateBmInput(raw: CreateBmInputRaw): CreateBmInput {
  const out: CreateBmInput = {
    url: raw.url,
    title: raw.title,
    category: normalizeCategoryForCreate(raw.category),
    tags: normalizeTagsForCreate(raw.tags),
    media_type: normalizeMediaTypeForCreate(raw.media_type),
    in_queue: raw.in_queue,
  };

  if (raw.summary != null && raw.summary.trim() !== '') {
    out.summary = raw.summary.trim();
  }

  if (raw.description != null && raw.description.trim() !== '') {
    out.description = raw.description.trim();
  }

  return out;
}

export function normalizeImportBmInput(raw: ImportBmInputRaw): ImportBmInput {
  const out: ImportBmInput = {
    ...normalizeCreateBmInput(raw),
  };

  if (raw.nostr_naddr != null && raw.nostr_naddr.trim() !== '') {
    out.nostr_naddr = raw.nostr_naddr.trim();
  }

  if (raw.published_at != null) {
    out.published_at = raw.published_at;
  }

  return out;
}

export const UpdateBmInputSchema = z.object({
  id: z.number(),
  url: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  summary: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  category: z
    .string()
    .min(1)
    .refine((s) => s.trim().length > 0, {
      message: 'category must be non-empty after trim',
    })
    .optional(),
  tags: tagsCommaMinOneOptional.optional(),
  media_type: z
    .string()
    .min(1)
    .refine((s) => s.trim().length > 0, {
      message: 'media_type must be non-empty after trim',
    })
    .optional(),
  in_queue: z.boolean().optional(),
  consumed_at: z.number().nullable().optional(),
});

export type UpdateBmInput = z.infer<typeof UpdateBmInputSchema>;
