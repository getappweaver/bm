// ---------------------------------------------------------------------------
// plugins/bm/commands/help/handler.ts
// ---------------------------------------------------------------------------

import type { HandleBmCommandProps } from '../../command-context';

export function handleHelpCommand({
  identity,
  prefix,
  helpText,
}: HandleBmCommandProps): string {
  const alias = identity.alias;

  return helpText(alias, prefix).join('\n');
}
