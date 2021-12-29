import './index.scss';

import { ScheduledReportsPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new ScheduledReportsPlugin();
}
export { ScheduledReportsPluginSetup, ScheduledReportsPluginStart } from './types';
