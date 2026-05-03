import type { BmCommandAdapter } from '../../adapter';

import { handleAcceptCommand } from './handler';

export const adaptAcceptCommand: BmCommandAdapter = (params) =>
  handleAcceptCommand(params);
