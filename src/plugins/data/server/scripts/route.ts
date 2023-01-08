/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from 'kibana/server';
import { schema } from '@kbn/config-schema';

export function registerScriptsRoute(router: IRouter) {
  router.get(
    { path: '/api/kibana/scripts/languages', validate: false },
    async (context, request, response) => {
      return response.ok({
        body: ['painless', 'expression'],
      });
    }
  );

  router.get(
    {
      path: '/api/vis_conditions/{id}',
      validate: {
        params: schema.any(),
      },
    },
    async (context, request, response) => {
      const data = await context.core.elasticsearch.client.asInternalUser.search({
        index: 'vis_conditions',
        body: {
          query: {
            bool: {
              filter: [
                {
                  term: {
                    _id: request.params.id,
                  },
                },
              ],
            },
          },
          size: 1,
        },
      });
      return response.ok({
        body: data,
      });
    }
  );

  router.put(
    {
      path: '/api/vis_conditions/put',
      validate: {
        body: schema.object({
          id: schema.any(),
          enabled: schema.any(),
          start: schema.any(),
          end: schema.any(),
          viscondition: schema.any(),
          urlToAnotherDashboard: schema.any(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        await context.core.elasticsearch.client.asInternalUser.index({
          index: `vis_conditions`,
          id: request.body.id,
          body: request.body,
        });
      } catch (e) {
        return response.customError({
          body: {
            message: 'Something went wrong, please try again!',
          },
          statusCode: e.status | 500,
        });
      }

      return response.ok({
        body: {
          message: 'created successfully.',
        },
      });
    }
  );
}
