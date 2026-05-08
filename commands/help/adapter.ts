import { buildCommandHelp } from '@src/commands/help/build';
import { renderHelpText } from '@src/commands/help/renderers/text';
import { createHelpRepresentation } from '@src/commands/help/representation';

import type { BmCommandAdapter } from '../../adapter';

export const adaptHelpCommand: BmCommandAdapter = (params) => {
  const topic = params.rest[0]?.toLowerCase() ?? null;

  const result = buildCommandHelp({
    prefix: params.prefix,
    command: params.command,
    topic,
  });

  if (result.type === 'error') {
    return result.message;
  }

  return renderHelpText(
    createHelpRepresentation({
      command: params.identity.alias,
      subcommand: 'help',
      data: result.data,
    }),
    { prefix: params.prefix },
  );
};
