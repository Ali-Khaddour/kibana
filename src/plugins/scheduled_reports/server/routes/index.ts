import { IRouter } from '../../../../core/server';
import { SecurityPluginSetup } from '../../../../../x-pack/plugins/security/public';
import { v4 as uuidv4 } from 'uuid';
import { schema } from '@kbn/config-schema';
import { generateCronExpression, start } from '../utils';
import { Report } from '../models/report';
import { ELASTIC_DEFAULT_ROLES } from '../../common';

interface PluginSetupDeps {
  security: SecurityPluginSetup;
}

export function defineRoutes(router: IRouter, schedule: any, { security }: PluginSetupDeps) {
  router.get(
    {
      path: '/api/scheduled_reports/get_schedules',
      validate: false,
    },
    async (context, request, response) => {
      const currentUser = security.authc.getCurrentUser(request);
      const roles = (await currentUser).roles;
      let companyId;
      roles.forEach((role) => {
        if (ELASTIC_DEFAULT_ROLES.indexOf(role) === -1) {
          companyId = role;
        }
      });
      // todo: catch companyId (role) is not in the default roles and user has no privilage on it
      const index = companyId + '-scheduled_reports';
      const data = await context.core.elasticsearch.client.asCurrentUser.search({
        index,
        body: {
          query: {
            match_all: {},
          },
          size: 1000,
        },
      });

      let rows: {
        id: number;
        visId: any;
        visName: any;
        index: any;
        reportEvery: string;
        timeFilter: string;
      }[] = [];
      let ndx = 0;

      data.hits.hits.forEach(
        (element: {
          _source: {
            id: any;
            title: any;
            index: any;
            duration: string;
            durationUnit: string;
            timeFilter: string;
            timeFilterUnit: string;
          };
        }) => {
          let newRow = {
            id: ndx + 1,
            visId: element._source.id,
            visName: element._source.title,
            index: element._source.index,
            reportEvery: element._source.duration + ' ' + element._source.durationUnit,
            timeFilter: 'Last ' + element._source.timeFilter + ' ' + element._source.timeFilterUnit,
          };
          rows[ndx++] = newRow;
        }
      );
      return response.ok({
        body: {
          rows,
        },
      });
    }
  );

  router.put(
    {
      path: '/api/scheduled_reports/create',
      validate: {
        body: schema.object({
          index: schema.any(),
          visualizationId: schema.any(),
          title: schema.any(),
          request: schema.any(),
          duration: schema.any(),
          durationUnit: schema.any(),
          receiver: schema.any(),
          timeFilter: schema.any(),
          timeFilterUnit: schema.any(),
          columns: schema.any(),
        }),
      },
    },
    async (context, request, response) => {
      let companyId = request.body.index.split('-')[0];
      // let companyId = 'superuser';
      let id = uuidv4();
      // todo:
      // validate input
      let cronSchedule = generateCronExpression(request.body.duration, request.body.durationUnit);

      let report: Report = {
        id,
        companyId,
        cronSchedule,
        receiver: request.body.receiver,
        index: request.body.index,
        request: request.body.request,
        visualizationId: request.body.visualizationId,
        title: request.body.title,
        duration: request.body.duration,
        durationUnit: request.body.durationUnit,
        timeFilter: request.body.timeFilter,
        timeFilterUnit: request.body.timeFilterUnit,
        columns: request.body.columns,
      };

      try {
        // save the scheduled report to ES
        await context.core.elasticsearch.client.asCurrentUser.index({
          index: `${companyId}-scheduled_reports`,
          id,
          body: report,
        });
      } catch (e) {
        console.log(e);
        return response.customError({
          body: {
            message: 'Something went wrong, please try again!',
          },
          statusCode: e.status | 500,
        });
      }

      // start the scheduler
      // todo: put in try/catch -> error message: SR was created but was not started
      schedule.scheduleJob(id, cronSchedule, function () {
        start(report, context.core.elasticsearch.client.asCurrentUser);
      });

      return response.ok({
        body: {
          message: 'Your scheduled report has been created successfully.',
        },
      });
    }
  );

  router.delete(
    {
      path: '/api/scheduled_reports/delete/{id}',
      validate: {
        params: schema.any(),
      },
    },
    async (context, request, response) => {
      const currentUser = security.authc.getCurrentUser(request);
      const roles = (await currentUser).roles;
      let companyId;
      // todo: validate id
      roles.forEach((role) => {
        if (ELASTIC_DEFAULT_ROLES.indexOf(role) === -1) {
          companyId = role;
        }
      });

      try {
        // stop the scheduler
        schedule.scheduledJobs[request.params.id].cancel();
      } catch (error) {
        // todo: uncomment the following
        // return response.customError({
        //   body: {
        //     message:
        //       'Could not delete the scheduled report. Either it does not exist, or somthing went wrong, please try again!',
        //   },
        //   statusCode: error.status | 500,
        // });
      }

      try {
        // delete docuemnt from ES
        await context.core.elasticsearch.client.asCurrentUser.delete({
          index: `${companyId}-scheduled_reports`,
          refresh: true,
          id: request.params.id,
        });
      } catch (error) {
        console.log(error);
        return response.customError({
          body: {
            message: 'Something went wrong, please try again!',
          },
          statusCode: error.status | 500,
        });
      }

      return response.ok({
        body: {
          message: 'Your scheduled report has been deleted successfully.',
        },
      });
    }
  );
}
