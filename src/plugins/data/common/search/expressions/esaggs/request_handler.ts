/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { KibanaExecutionContext } from 'src/core/public';
import { i18n } from '@kbn/i18n';
import { defer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Adapters } from 'src/plugins/inspector/common';

import { calculateBounds, Filter, IndexPattern, Query, TimeRange } from '../../../../common';

import { IAggConfigs } from '../../aggs';
import { ISearchStartSearchSource } from '../../search_source';
import { tabifyAggResponse } from '../../tabify';

/** @internal */
export interface RequestHandlerParams {
  abortSignal?: AbortSignal;
  aggs: IAggConfigs;
  filters?: Filter[];
  indexPattern?: IndexPattern;
  inspectorAdapters: Adapters;
  metricsAtAllLevels?: boolean;
  partialRows?: boolean;
  query?: Query;
  searchSessionId?: string;
  searchSourceService: ISearchStartSearchSource;
  timeFields?: string[];
  timeRange?: TimeRange;
  getNow?: () => Date;
  executionContext?: KibanaExecutionContext;
}

const getConditionsFromES = async (visId: string | undefined): Promise<{ isConditionEnabled: boolean; conditionsStart: string; conditionsEnd: string; viscondition: string; } | null> => {
  return fetch(`/api/vis_conditions/${visId}`)
    .then((response) => response.json())
    .then(async (data) => {
      let hits = data.body.hits.hits;
      if (hits.length > 0) {
        window.sessionStorage.setItem(visId + '_isConditionEnabled', hits[0]._source.enabled);
        window.sessionStorage.setItem(visId + '_conditions', JSON.stringify({
          start: hits[0]._source.start,
          end: hits[0]._source.end
        }));
        window.sessionStorage.setItem(visId + '_viscondition', hits[0]._source.viscondition);
        return {
          isConditionEnabled: hits[0]._source.enabled,
          conditionsStart: hits[0]._source.start,
          conditionsEnd: hits[0]._source.end,
          viscondition: hits[0]._source.viscondition
        };
      }
      else {
        return null;
      }
    });
}

export const handleRequest = ({
  abortSignal,
  aggs,
  filters,
  indexPattern,
  inspectorAdapters,
  partialRows,
  query,
  searchSessionId,
  searchSourceService,
  timeFields,
  timeRange,
  getNow,
  executionContext,
}: RequestHandlerParams) => {
  return defer(async () => {
    const forceNow = getNow?.();
    const searchSource = await searchSourceService.create();

    searchSource.setField('index', indexPattern);
    searchSource.setField('size', 0);

    // Create a new search source that inherits the original search source
    // but has the appropriate timeRange applied via a filter.
    // This is a temporary solution until we properly pass down all required
    // information for the request to the request handler (https://github.com/elastic/kibana/issues/16641).
    // Using callParentStartHandlers: true we make sure, that the parent searchSource
    // onSearchRequestStart will be called properly even though we use an inherited
    // search source.
    const timeFilterSearchSource = searchSource.createChild({ callParentStartHandlers: true });
    const requestSearchSource = timeFilterSearchSource.createChild({
      callParentStartHandlers: true,
    });

    // If timeFields have been specified, use the specified ones, otherwise use primary time field of index
    // pattern if it's available.
    const defaultTimeField = indexPattern?.getTimeField?.();
    const defaultTimeFields = defaultTimeField ? [defaultTimeField.name] : [];
    const allTimeFields = timeFields?.length ? timeFields : defaultTimeFields;

    aggs.setTimeRange(timeRange as TimeRange);
    aggs.setForceNow(forceNow);
    aggs.setTimeFields(allTimeFields);

    // For now we need to mirror the history of the passed search source, since
    // the request inspector wouldn't work otherwise.
    Object.defineProperty(requestSearchSource, 'history', {
      get() {
        return searchSource.history;
      },
      set(history) {
        return (searchSource.history = history);
      },
    });

    requestSearchSource.setField('aggs', aggs);

    requestSearchSource.onRequestStart((paramSearchSource, options) => {
      return aggs.onSearchRequestStart(paramSearchSource, options);
    });

    // If a timeRange has been specified and we had at least one timeField available, create range
    // filters for that those time fields
    if (timeRange && allTimeFields.length > 0) {
      timeFilterSearchSource.setField('filter', () => {
        return aggs.getSearchSourceTimeFilter(forceNow);
      });
    }

    requestSearchSource.setField('filter', filters);
    requestSearchSource.setField('query', query);


    let isConditionEnabledTmp = null
    let isConditionEnabled = false
    let viscondition = null

    if (executionContext?.id) {
      isConditionEnabledTmp = window.sessionStorage.getItem(executionContext?.id + '_isConditionEnabled')
      viscondition = window.sessionStorage.getItem(executionContext?.id + '_viscondition')
      isConditionEnabled = false
      if (isConditionEnabledTmp && viscondition) {
        isConditionEnabled = JSON.parse(isConditionEnabledTmp)
        aggs.isConditionEnabled = isConditionEnabled
        aggs.visCondition = viscondition
      }
      else {
        let conditionsFromES: {
          isConditionEnabled: boolean;
          conditionsStart: string;
          conditionsEnd: string;
          viscondition: string;
        } | null = await getConditionsFromES(executionContext?.id)
        if (conditionsFromES !== null) {
          aggs.isConditionEnabled = conditionsFromES?.isConditionEnabled
          aggs.conditions = {
            start: conditionsFromES?.conditionsStart,
            end: conditionsFromES?.conditionsEnd
          }
          aggs.visCondition = conditionsFromES?.viscondition
        }
      }
    }
    else if (!executionContext?.parent) {
      // just a visualization
      isConditionEnabledTmp = window.sessionStorage.getItem('isConditionEnabled')
      isConditionEnabled = false
      if (isConditionEnabledTmp)
        isConditionEnabled = JSON.parse(isConditionEnabledTmp)
      let conditions = window.sessionStorage.getItem('conditions')
      viscondition = window.sessionStorage.getItem('viscondition')
      if(isConditionEnabled) {
        aggs.isConditionEnabled = isConditionEnabled
        if(conditions) aggs.conditions = JSON.parse(conditions)
        if(viscondition) aggs.visCondition = viscondition
      }
    }

    return { allTimeFields, forceNow, requestSearchSource };
  }).pipe(
    switchMap(({ allTimeFields, forceNow, requestSearchSource }) =>
      requestSearchSource
        .fetch$({
          abortSignal,
          sessionId: searchSessionId,
          inspector: {
            adapter: inspectorAdapters.requests,
            title: i18n.translate('data.functions.esaggs.inspector.dataRequest.title', {
              defaultMessage: 'Data',
            }),
            description: i18n.translate('data.functions.esaggs.inspector.dataRequest.description', {
              defaultMessage:
                'This request queries Elasticsearch to fetch the data for the visualization.',
            }),
          },
          executionContext,
        })
        .pipe(
          map(({ rawResponse: response }) => {
            const parsedTimeRange = timeRange ? calculateBounds(timeRange, { forceNow }) : null;
            const tabifyParams = {
              metricsAtAllLevels: aggs.hierarchical,
              partialRows,
              timeRange: parsedTimeRange
                ? { from: parsedTimeRange.min, to: parsedTimeRange.max, timeFields: allTimeFields }
                : undefined,
            };
            let tableContent = tabifyAggResponse(aggs, response, tabifyParams)

            let dataList: string[][] = [];
            let tmpVisId = executionContext?.id ? executionContext?.id + '_isConditionEnabled' : 'isConditionEnabled'
            let isConditionEnabled = window.sessionStorage.getItem(tmpVisId)
            if (isConditionEnabled && JSON.parse(isConditionEnabled) == true) {
              let aggs = response?.aggregations;
              for (let key in aggs) {
                getData(aggs[key], [], key, dataList, 0);
              }
              window.sessionStorage.setItem('customTableData', JSON.stringify(dataList))
              tableContent.rows = getDataList(dataList);
            }
            return tableContent;
          })
        )
    )
  );
};

function getData(object: any, row: Object[], agg: string, dataList: Object[][], ndx: number) {
  try {
    let buckets = object['buckets']; // json array
    if (buckets) {
      for (let i in buckets) {
        let bucket = buckets[i];
        let key: string = bucket['key'];
        let newRow = [...row];
        let objKey = `col-${ndx}-${agg.toString()}`;
        let obj = {
          [objKey]: key,
        };
        newRow.push(JSON.stringify(obj));
        let lastBucket: boolean = true;
        for (let property in bucket) {
          if (bucket[property]['buckets']) {
            lastBucket = false;
            getData(bucket[property], newRow, property, dataList, ndx + 1);
          }
        }
        if (lastBucket) {
          for (let property in bucket) {
            let value = bucket[property]['value'];
            if (value) {
              let key = property.toString();
              let obj = {
                [key]: value,
              };
              newRow.push(JSON.stringify(obj));
            }
          }
          dataList.push(newRow);
        }
      }
    }
  } catch (e) {
    console.log(e);
  }
}

function getDataList(dataList: any[]): any {
  if (dataList) {
    if (dataList.length > 0) {
      let result: any[] = [];
      dataList.forEach(elem => {
        let dataListArr: any[] = elem;
        let firstPart: any = {};
        for (let i = 0; i < dataListArr.length - 1; i++) {
          let e: any = JSON.parse(dataListArr[i]);
          let key = Object.keys(e)[0];
          let value = e[key];
          firstPart[key] = value;
        };
        let dataListParsed = JSON.parse(dataListArr[dataListArr.length - 1]);
        if(dataListParsed.conditionalTerms && dataListParsed.conditionalTerms.length > 0)
        {
          let lastElement = dataListParsed.conditionalTerms[0];
          for (let i = 0; i < lastElement.length; i++) {
            result.push({ ...firstPart, ...lastElement[i] })
          }
        }
      })
      // if(result.length > 0) {
      //     let keys = Object.keys(result[0]);
      //     for(let i = 0; i < keys.length; i ++) {
      //         columns.push({
      //             id: keys[i]
      //         })
      //     }
      //     columns.push({
      //         id: "actions"
      //     })
      // }
      return result;
    }
    else {
      return [];
    }
  }
}