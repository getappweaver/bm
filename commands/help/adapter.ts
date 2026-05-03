import type { BmCommandAdapter } from '../../adapter';

import { handleHelpCommand } from './handler';

export const adaptHelpCommand: BmCommandAdapter = (params) =>
  handleHelpCommand(params);
