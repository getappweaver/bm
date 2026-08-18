// ---------------------------------------------------------------------------
// plugins/bm/commands/ai/schemas.ts — Zod tool-call schema (codegen reads ToolCallSchema)
// ---------------------------------------------------------------------------

import { z } from 'zod';

import { knownMediaTypesText } from '../../format';
import { CreateBmInputSchema, UpdateBmInputSchema } from '../../types';

const CreateBmInputOverrideSchema = z.object({
  url: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  summary: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  category: z.string().min(1).optional(),
  tags: z.string().min(1).optional(),
  media_type: z.string().min(1).optional(),
  in_queue: z.boolean().optional(),
});

const BmListCallSchema = z.object({
  type: z.literal('list'),
  tags_all: z
    .array(z.string().min(1))
    .optional()
    .describe(
      'Bookmark must include every tag (AND). Match is case-insensitive; tags are stored comma-separated.',
    ),
  category: z
    .string()
    .min(1)
    .nullable()
    .optional()
    .describe(
      "Category filter: exact path, subtree under that prefix (path||'/%'), or any stored path where that slash-separated segment appears (e.g. 'nostr' matches 'tech/nostr/nips').",
    ),
  title_contains: z
    .string()
    .min(1)
    .nullable()
    .optional()
    .describe('Substring match on title (SQL LIKE, % and _ escaped).'),
  url_contains: z
    .string()
    .min(1)
    .nullable()
    .optional()
    .describe('Substring match on URL.'),
  in_queue: z
    .boolean()
    .optional()
    .describe(
      'If true, only bookmarks marked in active backlog; if false, only not in queue; omit for all.',
    ),
  consumed: z
    .boolean()
    .optional()
    .describe(
      'If false, only bookmarks not yet consumed (consumed_at is null); if true, only consumed; omit for all.',
    ),
  media_type: z
    .string()
    .min(1)
    .nullable()
    .optional()
    .describe(
      `Exact match on stored media_type (lowercase), e.g. ${knownMediaTypesText()}. Omit or null for all.`,
    ),
});

const BmContextCallSchema = z.object({
  type: z.literal('context'),
});

const BmCreateCallSchema = z.object({
  type: z.literal('create'),
  input: CreateBmInputSchema,
  original_prompt: z.string(),
});

const BmUpdateCallSchema = z.object({
  type: z.literal('update'),
  input: UpdateBmInputSchema,
  original_prompt: z.string(),
});

const BmDeleteCallSchema = z.object({
  type: z.literal('delete'),
  input: z.object({ id: z.number().int().positive() }),
  original_prompt: z.string(),
});

export const BmPublishedSearchCallSchema = z.object({
  type: z.literal('published_search'),
  title: z.string().min(1).nullable().optional(),
  tags_any: z.array(z.string().min(1)).min(1),
  category: z.string().min(1).nullable().optional(),
  media_type: z.string().min(1).nullable().optional(),
});

const BmPublishedSearchPageCallSchema = z.object({
  type: z.literal('published_search_page'),
  session_id: z.string().min(1),
  page: z.number().int().positive().optional(),
  direction: z.enum(['next', 'prev']).optional(),
});

const BmPublishedSearchResultsCallSchema = z.object({
  type: z.literal('published_search_results'),
  session_id: z.string().min(1),
  result_ids: z.array(z.number().int().positive()).optional(),
  page: z.number().int().positive().optional(),
});

const BmCreateFromPublishedSearchCallSchema = z.object({
  type: z.literal('create_from_published_search'),
  session_id: z.string().min(1),
  result_id: z.number().int().positive(),
  input_overrides: CreateBmInputOverrideSchema.optional(),
  original_prompt: z.string(),
});

export const BmToolCallSchema = z.discriminatedUnion('type', [
  BmListCallSchema,
  BmContextCallSchema,
  BmCreateCallSchema,
  BmUpdateCallSchema,
  BmDeleteCallSchema,
  BmPublishedSearchCallSchema,
  BmPublishedSearchPageCallSchema,
  BmPublishedSearchResultsCallSchema,
  BmCreateFromPublishedSearchCallSchema,
]);

export type BmToolCall = z.infer<typeof BmToolCallSchema>;
export type BmListCall = z.infer<typeof BmListCallSchema>;

export { BmToolCallSchema as ToolCallSchema };
export const skillDescription =
  'Bookmark management via local dm-bot CLI tools (list, published search, taxonomy context, create/update/delete drafts).';
