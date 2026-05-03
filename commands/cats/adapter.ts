import type { BmCommandAdapter } from '../../adapter';

import { handleCatsCommand } from './handler';

export const adaptCatsCommand: BmCommandAdapter = (params) =>
  handleCatsCommand(params);
