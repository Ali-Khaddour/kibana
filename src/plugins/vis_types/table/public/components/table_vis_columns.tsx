/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiDataGridColumn, EuiDataGridColumnCellActionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { DatatableColumn, DatatableRow, IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { FormattedColumns, TableVisUiState } from '../types';

interface FilterCellData {
  /**
   * Row index
   */
  row: number;
  /**
   * Column index
   */
  column: number;
  value: unknown;
}

export const createGridColumns = (
  columns: DatatableColumn[],
  rows: DatatableRow[],
  formattedColumns: FormattedColumns,
  columnsWidth: TableVisUiState['colWidth'],
  fireEvent: IInterpreterRenderHandlers['event']
) => {
  const onFilterClick = (data: FilterCellData, negate: boolean) => {
    fireEvent({
      name: 'filterBucket',
      data: {
        data: [
          {
            table: {
              columns,
              rows,
            },
            ...data,
            column: data.column,
          },
        ],
        negate,
      },
    });
  };

  if (
    rows.length > 0 &&
    rows[0].isEnterExitGeoEnable &&
    columns[columns.length - 2].id != 'exitGeofences' && // if not already added
    columns[columns.length - 2].id != 'enterGeofence' // if not already added
  ) {
    columns.push({ ...columns[0] });
    columns.push({ ...columns[0] });
    let colExitGeofence = columns[columns.length - 2];
    colExitGeofence.id = 'exitGeofences';
    colExitGeofence.name = 'Exsited Geofence';
    let colEnterGeofence = columns[columns.length - 1];
    colEnterGeofence.id = 'enterGeofence';
    colEnterGeofence.name = 'Entered Geofence';
  }
  if (
    rows.length > 0 &&
    rows[0]['urlToAnotherDashboard'] &&
    columns[columns.length - 1].id != 'urlToAnotherDashboard'
  ) {
    columns.push({ ...columns[0] });
    let urlToAnotherDashboard = columns[columns.length - 1];
    urlToAnotherDashboard.id = 'urlToAnotherDashboard';
    urlToAnotherDashboard.name = 'External Dashboard';
  }
  let result = columns.map((col, colIndex): EuiDataGridColumn => {
    // if (col.id == 'exitGeofences' || col.id == 'enterGeofences') {

    // }
    const formattedColumn = formattedColumns[col.id];
    const cellActions =
      formattedColumn && formattedColumn.filterable
        ? [
            ({ rowIndex, columnId, Component, closePopover }: EuiDataGridColumnCellActionProps) => {
              const rowValue = rows[rowIndex][columnId];
              const contentsIsDefined = rowValue !== null && rowValue !== undefined;
              const cellContent = formattedColumn.formatter.convert(rowValue);

              const filterForText = i18n.translate(
                'visTypeTable.tableCellFilter.filterForValueText',
                {
                  defaultMessage: 'Filter for value',
                }
              );
              const filterForAriaLabel = i18n.translate(
                'visTypeTable.tableCellFilter.filterForValueAriaLabel',
                {
                  defaultMessage: 'Filter for value: {cellContent}',
                  values: {
                    cellContent,
                  },
                }
              );

              return (
                contentsIsDefined && (
                  <Component
                    aria-label={filterForAriaLabel}
                    data-test-subj="tbvChartCell__filterForCellValue"
                    onClick={() => {
                      onFilterClick({ row: rowIndex, column: colIndex, value: rowValue }, false);
                      closePopover();
                    }}
                    iconType="plusInCircle"
                  >
                    {filterForText}
                  </Component>
                )
              );
            },
            ({ rowIndex, columnId, Component, closePopover }: EuiDataGridColumnCellActionProps) => {
              const rowValue = rows[rowIndex][columnId];
              const contentsIsDefined = rowValue !== null && rowValue !== undefined;
              let cellContent = null;
              if (columnId == 'exitGeofences' || columnId == 'enterGeofence') {
                cellContent = `${rowValue}`;
              } else if (columnId == 'urlToAnotherDashboard') {
                let url = rowValue.replace('{startTime}', `'${rows[rowIndex]['startTime']}'`);
                url = url.replace('{endTime}', `'${rows[rowIndex]['endTime']}'`);
                cellContent = url;
              } else {
                cellContent = formattedColumn.formatter.convert(rowValue);
              }

              const filterOutText = i18n.translate(
                'visTypeTable.tableCellFilter.filterOutValueText',
                {
                  defaultMessage: 'Filter out value',
                }
              );
              const filterOutAriaLabel = i18n.translate(
                'visTypeTable.tableCellFilter.filterOutValueAriaLabel',
                {
                  defaultMessage: 'Filter out value: {cellContent}',
                  values: {
                    cellContent,
                  },
                }
              );

              return (
                contentsIsDefined && (
                  <Component
                    aria-label={filterOutAriaLabel}
                    onClick={() => {
                      onFilterClick({ row: rowIndex, column: colIndex, value: rowValue }, true);
                      closePopover();
                    }}
                    iconType="minusInCircle"
                  >
                    {filterOutText}
                  </Component>
                )
              );
            },
          ]
        : undefined;

    const initialWidth = columnsWidth.find((c) => c.colIndex === colIndex);
    const column: EuiDataGridColumn = {
      id: col.id,
      display: col.name,
      displayAsText: col.name,
      actions: {
        showHide: false,
        showMoveLeft: false,
        showMoveRight: false,
        showSortAsc: {
          label: i18n.translate('visTypeTable.sort.ascLabel', {
            defaultMessage: 'Sort asc',
          }),
        },
        showSortDesc: {
          label: i18n.translate('visTypeTable.sort.descLabel', {
            defaultMessage: 'Sort desc',
          }),
        },
      },
      cellActions,
    };

    if (initialWidth) {
      column.initialWidth = initialWidth.width;
    }

    return column;
  });

  return result;
};
