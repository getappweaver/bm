import type { BmCommandAdapter } from '../../adapter';

import { handleDoneCommand } from './handler';

export const adaptDoneCommand: BmCommandAdapter = (params) =>
  handleDoneCommand(params);
