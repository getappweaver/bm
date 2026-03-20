// ---------------------------------------------------------------------------
// plugins/bm/types/bookmark.ts — Stored bookmark row (bm_bookmarks) + CRUD inputs
// ---------------------------------------------------------------------------
import { z } from 'zod';

export const BmSchema = z.object({
  id: z.number(),
  url: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  description: z.string().nullable(),
  category: z.string().nullable(),
  tags: z.string().nullable(),
  to_read: z.boolean(),
  read_at: z.number().nullable(),
  created_at: z.number(),
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

/** Raw create payload from AI/CLI (may include explicit null on optional keys). */
const optionalStringOrNull = z.union([z.string(), z.null()]).optional();

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
  category: optionalStringOrNull.describe(
    "Slash-separated path inferred from topic, e.g. 'tech/nostr'; prefer labels that match the user's existing categories in context.",
  ),
  tags: optionalStringOrNull.describe(
    'Comma-separated keywords from the fetched content (concrete, lowercase).',
  ),
  to_read: z
    .union([z.boolean(), z.null()])
    .optional()
    .describe(
      'true = reading list; false or null = normal save unless the user asked otherwise.',
    ),
});

export type CreateBmInputRaw = z.infer<typeof CreateBmInputSchema>;

/** Normalized bookmark row input (no null placeholders; optional keys omitted when unset). */
export type CreateBmInput = {
  url: string;
  title: string;
  summary?: string;
  description?: string;
  category?: string;
  tags?: string;
  to_read?: boolean;
};

export function normalizeCreateBmInput(raw: CreateBmInputRaw): CreateBmInput {
  const out: CreateBmInput = { url: raw.url, title: raw.title };

  if (raw.summary != null && raw.summary.trim() !== '') {
    out.summary = raw.summary.trim();
  }

  if (raw.description != null && raw.description.trim() !== '') {
    out.description = raw.description.trim();
  }

  if (raw.category != null && raw.category.trim() !== '') {
    out.category = raw.category.trim();
  }

  if (raw.tags != null && raw.tags.trim() !== '') {
    out.tags = raw.tags.trim();
  }

  if (raw.to_read === true) {
    out.to_read = true;
  }

  return out;
}

export const UpdateBmInputSchema = z.object({
  id: z.number(),
  url: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  summary: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  to_read: z.boolean().optional(),
  read_at: z.number().nullable().optional(),
});

export type UpdateBmInput = z.infer<typeof UpdateBmInputSchema>;
