// ---------------------------------------------------------------------------
// plugins/bm/types.ts — Types and Zod schemas for the bm plugin
//
// Replace with your entity shape and validation. Define at least:
// - Main entity type (e.g. Bm) and Zod schema
// - Create/Update input schemas for OpenCode tools and commands
// - If using draft/confirm: CreateBmDraft and UpdateBmInput
//   so drafts.ts and opencode.ts type-check.
// ---------------------------------------------------------------------------
import { z } from 'zod';

// Minimal stub so the plugin loads. Replace with your real entity and schemas.
export const BmSchema = z.object({
  id: z.number(),
  data: z.string(),
  created_at: z.number(),
});

export type Bm = z.infer<typeof BmSchema>;

export const CreateBmInputSchema = z.object({
  data: z.string().min(1).describe('Content or payload for the new bm item'),
});

export type CreateBmInput = z.infer<typeof CreateBmInputSchema>;

export const UpdateBmInputSchema = z.object({
  id: z.number(),
  data: z.string().min(1).optional(),
});

export type UpdateBmInput = z.infer<typeof UpdateBmInputSchema>;

// Stub for draft flow. Replace with your draft shape (e.g. tree, nested fields).
export interface CreateBmDraft {
  data: string;
}

export const CreateBmDraftSchema: z.ZodType<CreateBmDraft> = z.object({
  data: z.string().min(1),
});
