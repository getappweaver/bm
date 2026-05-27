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
    runAgent,
    db,
    source,
    pool,
    masterPubkey,
    getWotScore,
    rest,
  } = cmd;

  const alias = identity.alias;

  if (!runAgent) {
    return `${prefix}${alias} ai requires an agent backend. Set backend and try again.`;
  }

  return handleBmAi({
    args: rest,
    command,
    db,
    identity,
    prefix,
    source,
    promptFn,
    runAgent,
    pool,
    masterPubkey,
    getWotScore,
  });
}
