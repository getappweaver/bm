// ---------------------------------------------------------------------------
// plugins/bm/commands/add/handler.ts
// ---------------------------------------------------------------------------

import type { HandleBmCommandProps } from '../../command-context';

export function handleAddCommand(cmd: HandleBmCommandProps): string {
  const { identity, prefix } = cmd;
  const alias = identity.alias;

  return [
    `Bookmarks are added only through ${prefix}${alias} ai (drafts with full fields—category, tags, media type, queue).`,
    '',
    `Use: ${prefix}${alias} ai <prompt>`,
  ].join('\n');
}
