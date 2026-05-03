import type { BmCommandAdapter } from '../../adapter';

import { handleUpdateCommand } from './handler';

export const adaptUpdateCommand: BmCommandAdapter = (params) =>
  handleUpdateCommand(params);
