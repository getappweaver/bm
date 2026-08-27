// ---------------------------------------------------------------------------
// plugins/bm/commands/ai/handler.ts
// ---------------------------------------------------------------------------

import type { WebNodeRoot } from '@src/web/ui-schema';

import type { HandleBmCommandProps } from '../../command-context';

import { handleBmAi } from './handle-bm-ai';

export async function handleAiCommand(
  cmd: HandleBmCommandProps,
): Promise<string | WebNodeRoot> {
  const {
    command,
    identity,
    prefix,
    promptFn,
    agent,
    db,
    source,
    pool,
    masterPubkey,
    getWotScore,
    rest,
  } = cmd;

  return handleBmAi({
    args: rest,
    command,
    db,
    identity,
    prefix,
    source,
    promptFn,
    agent,
    pool,
    masterPubkey,
    getWotScore,
  });
}
