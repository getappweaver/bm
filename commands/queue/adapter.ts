import type { BmCommandAdapter } from '../../adapter';

import { handleQueueCommand } from './handler';

export const adaptQueueCommand: BmCommandAdapter = (params) =>
  handleQueueCommand(params);
