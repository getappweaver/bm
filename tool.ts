// ---------------------------------------------------------------------------
// plugins/bm/tool.ts — AI tool-call schema and parser for !bm ai
//
// When the user runs !bm ai <prompt>, the agent returns structured
// tool calls (e.g. list, create, update, delete). Define:
// - A Zod discriminated union (e.g. BmToolCallSchema) matching
//   the operations your plugin supports
// - buildSystemPrompt(userPrompt, context): system prompt that instructs the
//   model to output JSON/JSONL matching that schema
// - parseBmToolCalls(raw): parse model output and return
//   ParseSettledResult<YourToolCall>[]
//
// Wire these in ai.ts so handleBmAi can execute or draft the
// parsed calls.
// ---------------------------------------------------------------------------
import { z } from 'zod';

import type { ParseSettledResult } from '@src/tools/utils';
import { parseToolCalls } from '@src/tools/utils';

import { CreateBmInputSchema, UpdateBmInputSchema } from './types';

const BmListCallSchema = z.object({ type: z.literal('list') });

const BmCreateCallSchema = z.object({
  type: z.literal('create'),
  input: CreateBmInputSchema,
});

const BmUpdateCallSchema = z.object({
  type: z.literal('update'),
  input: UpdateBmInputSchema,
});

const BmDeleteCallSchema = z.object({
  type: z.literal('delete'),
  input: z.object({ id: z.number().int().positive() }),
});

const BmToolCallSchema = z.discriminatedUnion('type', [
  BmListCallSchema,
  BmCreateCallSchema,
  BmUpdateCallSchema,
  BmDeleteCallSchema,
]);

export type BmToolCall = z.infer<typeof BmToolCallSchema>;

export function buildSystemPrompt(userPrompt: string, context: string): string {
  const schema = z.toJSONSchema(BmToolCallSchema);

  return `You are helping the user manage bms. Current state:\n${context}\n\nUser request: "${userPrompt}"\n\nOutput one or more JSON objects matching this schema (one per line for multiple). No markdown.\n\n${JSON.stringify(schema, null, 2)}`;
}

export function parseBmToolCalls(
  raw: string,
): ParseSettledResult<BmToolCall>[] {
  return parseToolCalls({ raw, schema: BmToolCallSchema });
}
