import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '../../../core/server';

import { ScheduledReportsPluginSetup, ScheduledReportsPluginStart } from './types';
import { defineRoutes } from './routes';

import { SecurityPluginSetup } from '../../../../x-pack/plugins/security/public';
import { startAllScheduledReports } from './utils';

interface PluginSetupDeps {
  security: SecurityPluginSetup;
}

export class ScheduledReportsPlugin
  implements Plugin<ScheduledReportsPluginSetup, ScheduledReportsPluginStart> {
  private readonly schedule: any;
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.schedule = require('node-schedule');
  }

  public setup(core: CoreSetup, { security }: PluginSetupDeps) {
    this.logger.debug('scheduledReports: Setup');
    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router, this.schedule, { security });

    // start all scheduled reports
    

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('scheduledReports: Started');
    
    startAllScheduledReports(core.elasticsearch.client.asInternalUser, this.schedule);

    return {};
  }

  public stop() {}
}
