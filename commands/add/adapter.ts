import type { BmCommandAdapter } from '../../adapter';

import { handleAddCommand } from './handler';

export const adaptAddCommand: BmCommandAdapter = (params) =>
  handleAddCommand(params);
