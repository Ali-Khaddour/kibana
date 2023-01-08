/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { EuiFieldText, EuiFormRow, EuiIconTip, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { VisEditorOptionsProps } from 'src/plugins/visualizations/public';
import { search } from '../../../../data/public';
import {
  SwitchOption,
  SelectOption,
  NumberInputOption,
  TextInputOption,
} from '../../../../vis_default_editor/public';
import { TableVisParams } from '../../common';
import { totalAggregations } from './utils';

const { tabifyGetColumns } = search;

function getAggsNames(aggs: any) {
  let options = [];
  options.push(
    {
      value: '',
      text: 'Not Selected',
    },
    {
      value: 'exitGeofences',
      text: 'Exited Geofence',
    },
    {
      value: 'enterGeofences',
      text: 'Entered Geofence',
    }
  );
  return options;
}

function TableOptions({
  aggs,
  stateParams,
  setValidity,
  setValue,
}: VisEditorOptionsProps<TableVisParams>) {
  const percentageColumns = useMemo(
    () => [
      {
        value: '',
        text: i18n.translate('visTypeTable.params.defaultPercentageCol', {
          defaultMessage: 'Don’t show',
        }),
      },
      ...tabifyGetColumns(aggs.getResponseAggs(), true)
        .filter((col) => get(col.aggConfig.toSerializedFieldFormat(), 'id') === 'number')
        .map(({ name }) => ({ value: name, text: name })),
    ],
    [aggs]
  );

  const isPerPageValid = stateParams.perPage === '' || stateParams.perPage > 0;

  useEffect(() => {
    setValidity(isPerPageValid);
  }, [isPerPageValid, setValidity]);

  useEffect(() => {
    if (
      !percentageColumns.find(({ value }) => value === stateParams.percentageCol) &&
      percentageColumns[0] &&
      percentageColumns[0].value !== stateParams.percentageCol
    ) {
      setValue('percentageCol', percentageColumns[0].value);
    }
  }, [percentageColumns, stateParams.percentageCol, setValidity, setValue]);

  const changeUrlToAnotherDashboard = (e: any) => {
    setValue('urlToAnotherDashboardVis', e.target.value);
  };

  return (
    <EuiPanel paddingSize="s">
      <NumberInputOption
        label={
          <>
            <FormattedMessage
              id="visTypeTable.params.perPageLabel"
              defaultMessage="Max rows per page"
            />{' '}
            <EuiIconTip
              content="Leaving this field empty means it will use number of buckets from the response."
              position="right"
            />
          </>
        }
        isInvalid={!isPerPageValid}
        min={1}
        paramName="perPage"
        value={stateParams.perPage}
        setValue={setValue}
      />

      <SwitchOption
        label={i18n.translate('visTypeTable.params.showMetricsLabel', {
          defaultMessage: 'Show metrics for every bucket/level',
        })}
        paramName="showMetricsAtAllLevels"
        value={stateParams.showMetricsAtAllLevels}
        setValue={setValue}
        data-test-subj="showMetricsAtAllLevels"
      />

      <SwitchOption
        label={i18n.translate('visTypeTable.params.autoFitRow', {
          defaultMessage: 'Auto fit rows to content',
        })}
        paramName="autoFitRowToContent"
        value={stateParams.autoFitRowToContent}
        setValue={setValue}
        data-test-subj="autoFitRowToContent"
      />

      <SwitchOption
        label={i18n.translate('visTypeTable.params.showPartialRowsLabel', {
          defaultMessage: 'Show partial rows',
        })}
        tooltip={i18n.translate('visTypeTable.params.showPartialRowsTip', {
          defaultMessage:
            'Show rows that have partial data. This will still calculate metrics for every bucket/level, even if they are not displayed.',
        })}
        paramName="showPartialRows"
        value={stateParams.showPartialRows}
        setValue={setValue}
        data-test-subj="showPartialRows"
      />

      <SwitchOption
        label={i18n.translate('visTypeTable.params.showToolbarLabel', {
          defaultMessage: 'Show toolbar',
        })}
        paramName="showToolbar"
        value={stateParams.showToolbar}
        setValue={setValue}
      />

      {/* <SwitchOption
        label={i18n.translate('visTypeTable.params.showTotalLabel', {
          defaultMessage: 'Show total',
        })}
        paramName="showTotal"
        value={stateParams.showTotal}
        setValue={setValue}
      />

      <SelectOption
        label={i18n.translate('visTypeTable.params.totalFunctionLabel', {
          defaultMessage: 'Total function',
        })}
        disabled={!stateParams.showTotal}
        options={totalAggregations}
        paramName="totalFunc"
        value={stateParams.totalFunc}
        setValue={setValue}
      />

      <SelectOption
        label={i18n.translate('visTypeTable.params.PercentageColLabel', {
          defaultMessage: 'Percentage column',
        })}
        options={percentageColumns}
        paramName="percentageCol"
        value={stateParams.percentageCol}
        setValue={setValue}
        id="datatableVisualizationPercentageCol"
      /> */}

      {/* <TextInputOption
        label={
          <>
            <FormattedMessage
              id="visTypeTable.params.urlToAnotherDashboardVis"
              defaultMessage="Url To Another Dashboad/Visualization"
            />{' '}
            <EuiIconTip
              content="The visualization must have a min and max time fields"
              position="right"
            />
          </>
        }
        paramName="urlToAnotherDashboardVis"
        value={stateParams.urlToAnotherDashboardVis}
        setValue={setValue}
      /> */}

      <EuiFormRow
        label={
          <>
            <FormattedMessage
              id="visTypeTable.params.urlToAnotherDashboardVis"
              defaultMessage="Url To Another Dashboad/Visualization"
            />{' '}
            <EuiIconTip
              content="The visualization must have a min and max time fields"
              position="right"
            />
          </>
        }
      >
        <EuiFieldText
          placeholder="Relative Dashboard URL"
          value={stateParams.urlToAnotherDashboardVis}
          onChange={changeUrlToAnotherDashboard}
        />
        {/* <input onChange={changeUrlToAnotherDashboard} /> */}
      </EuiFormRow>
    </EuiPanel>
  );
}
// default export required for React.Lazy
// eslint-disable-next-line import/no-default-export
export { TableOptions as default };
