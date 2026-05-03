import type { BmCommandAdapter } from '../../adapter';

import { handleSearchCommand } from './handler';

export const adaptSearchCommand: BmCommandAdapter = (params) =>
  handleSearchCommand(params);
