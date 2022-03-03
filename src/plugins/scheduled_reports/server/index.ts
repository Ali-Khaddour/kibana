import { PluginInitializerContext } from '../../../core/server';
import { ScheduledReportsPlugin } from './plugin';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export function plugin(initializerContext: PluginInitializerContext) {
  return new ScheduledReportsPlugin(initializerContext);
}

export { ScheduledReportsPluginSetup, ScheduledReportsPluginStart } from './types';
