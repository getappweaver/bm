import type { BmCommandAdapter } from '../../adapter';

import { handleDeclineCommand } from './handler';

export const adaptDeclineCommand: BmCommandAdapter = (params) =>
  handleDeclineCommand(params);
