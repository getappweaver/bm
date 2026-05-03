import type { BmCommandAdapter } from '../../adapter';

import { handleDraftsCommand } from './handler';

export const adaptDraftsCommand: BmCommandAdapter = (params) =>
  handleDraftsCommand(params);
