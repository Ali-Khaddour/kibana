import { IRouter } from '../../../../core/server';
import { SecurityPluginSetup } from '../../../../../x-pack/plugins/security/public';
import { v4 as uuidv4 } from 'uuid';
import { schema } from '@kbn/config-schema';
import { generateCronExpression, start } from '../utils';
import { Report } from '../models/report';

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
      try {
        const currentUser = security.authc.getCurrentUser(request);
        const username = (await currentUser).username;
        const index = 'scheduled_reports';
        const data = await context.core.elasticsearch.client.asInternalUser.search({
          index,
          body: {
            query: {
              bool: {
                must: [],
                filter: [
                  {
                    match_phrase: {
                      "username.keyword": username
                    }
                  }
                ],
                should: [],
                must_not: []
              }
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
        data.body.hits.hits.forEach(
          (element: any) => {
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
      catch(e) {
        return response.ok({
          body: {
            rows: [],
          },
        });
      }
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
      let id = uuidv4();
      const currentUser = security.authc.getCurrentUser(request);
      const username = (await currentUser).username;

      let esIndex = request.body.index;

      // validate that the user has access to the index
      let res = await context.core.elasticsearch.client.asCurrentUser.security.hasPrivileges({
        user: username,
        body: {
          index: [
            {
              names: [esIndex],
              privileges: ["write"]
            }
          ]
        }
      })

      let hasPrivileges = res?.body?.index[esIndex]?.write;
      if (!hasPrivileges) {
        return response.customError({
          body: {
            message: 'Something went wrong, please try again!',
          },
          statusCode: 500,
        });
      }

      // todo:
      // validate input

      let cronSchedule = generateCronExpression(request.body.duration, request.body.durationUnit);
      let report: Report = {
        id,
        username,
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
        await context.core.elasticsearch.client.asInternalUser.index({
          index: `scheduled_reports`,
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
      // get logged in user
      const currentUser = security.authc.getCurrentUser(request);
      // get his user name
      const username = (await currentUser).username;
      // name of scheduled reports index
      const index = 'scheduled_reports';
      // validate that the current logged in user owns the report
      // this can be happened by retrieving the report by its id
      // and comparing the username saved in it with the current username
      // if so, then the current logged in user owns the report
      const data = await context.core.elasticsearch.client.asInternalUser.search({
        index,
        body: {
          query: {
            bool: {
              must: [],
              filter: [
                {
                  match_phrase: {
                    "id.keyword": request.params.id
                  }
                }
              ],
              should: [],
              must_not: []
            }
          },
          size: 1000,
        },
      });

      // comapare the usernames
      let report: any = data.body.hits.hits[0]?._source;
      if (report && report.username !== username) {
        // if the user names don't match
        // the user trying to delete the report does not own the report
        // return error message
        return response.customError({
          body: {
            message: 'Something went wrong, please try again!',
          },
          statusCode: 500,
        });
      }
      // otherwise
      try {
        // stop the scheduler
        schedule.scheduledJobs[request.params.id].cancel();
      } catch (error) {
        return response.customError({
          body: {
            message:
              'Could not delete the scheduled report. Either it does not exist, or somthing went wrong, please try again!',
          },
          statusCode: error.status | 500,
        });
      }

      try {
        // delete docuemnt from ES
        await context.core.elasticsearch.client.asInternalUser.delete({
          index,
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
