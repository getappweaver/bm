import type { BmCommandAdapter } from '../../adapter';

import { handleNextCommand } from './handler';

export const adaptNextCommand: BmCommandAdapter = (params) =>
  handleNextCommand(params);
