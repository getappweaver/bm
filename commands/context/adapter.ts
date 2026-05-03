import type { BmCommandAdapter } from '../../adapter';

import { handleContextCommand } from './handler';

export const adaptContextCommand: BmCommandAdapter = (params) =>
  handleContextCommand(params);
