// ---------------------------------------------------------------------------
// plugins/bm/commands/context/handler.ts
// ---------------------------------------------------------------------------

import type { HandleBmCommandProps } from '../../command-context';
import { buildBmPluginContextText } from '../../context';

export function handleContextCommand(cmd: HandleBmCommandProps): string {
  const { db, rest, identity, prefix } = cmd;
  const alias = identity.alias;

  if (rest.length > 0) {
    return `Usage: ${prefix}${alias} context`;
  }

  return buildBmPluginContextText({ db });
}
