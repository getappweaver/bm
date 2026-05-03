// ---------------------------------------------------------------------------
// plugins/bm/commands/ai/parse-bm-tool-calls.ts
// ---------------------------------------------------------------------------

import type { ParseSettledResult } from '@src/tools/utils';
import { parseToolCalls } from '@src/tools/utils';

import { BmToolCallSchema, type BmToolCall } from './schemas';

export function parseBmToolCalls(
  raw: string,
): ParseSettledResult<BmToolCall>[] {
  return parseToolCalls({ raw, schema: BmToolCallSchema });
}
