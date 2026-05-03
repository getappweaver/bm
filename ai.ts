// ---------------------------------------------------------------------------
// plugins/bm/ai.ts — thin entry for codegen & CLI (implementation under commands/ai/)
// ---------------------------------------------------------------------------

import type { AiDefinition } from '@src/system/ai-definition';

import { agentInstructions } from './commands/ai/agent-instructions';
import { executeTool } from './commands/ai/execute-tool';
import {
  ToolCallSchema,
  type BmToolCall,
  skillDescription,
} from './commands/ai/schemas';
import { openDb } from './db';

export type { BmToolCall } from './commands/ai/schemas';
export { ToolCallSchema, skillDescription } from './commands/ai/schemas';

export { buildSystemPrompt } from './commands/ai/prompts';
export { parseBmToolCalls } from './commands/ai/parse-bm-tool-calls';

export type { HandleBmAiProps } from './commands/ai/handle-bm-ai';
export { handleBmAi } from './commands/ai/handle-bm-ai';

export { handleBmSummarize } from './commands/ai/handle-summarize';

export const aiDefinition = {
  toolCallSchema: ToolCallSchema,
  skillDescription,
  openDb,
  executeTool: (props) => {
    if (!props.pool || !props.masterPubkey || !props.getWotScore) {
      throw new Error(
        'bm aiDefinition.executeTool requires pool, masterPubkey, and getWotScore',
      );
    }

    return executeTool({
      ...props,
      pool: props.pool,
      masterPubkey: props.masterPubkey,
      getWotScore: props.getWotScore,
    });
  },
  agentInstructions,
} satisfies AiDefinition<
  typeof ToolCallSchema,
  BmToolCall,
  ReturnType<typeof openDb>
>;
