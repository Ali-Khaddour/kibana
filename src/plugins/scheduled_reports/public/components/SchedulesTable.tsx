import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  createContext,
  useContext,
  useRef,
} from 'react';

import { EuiDataGrid, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
const DataContext = createContext(null);

const columns = [
  {
    id: 'id',
    displayAsText: '#',
    defaultSortDirection: 'asc',
    initialWidth: 50,
    isResizable: false,
    action: false,
  },
  {
    id: 'visName',
    displayAsText: 'Visualization Name',
    action: false,
  },
  {
    id: 'index',
    displayAsText: 'Index',
    action: false,
  },
  {
    id: 'reportEvery',
    displayAsText: 'Report Every',
    action: false,
  },
  {
    id: 'timeFilter',
    displayAsText: 'Time Filter',
    action: false,
  },
  {
    id: 'delete',
    displayAsText: 'action',
    action: false,
  },
];

export default function DataTable(props) {
  const [raw_data, setRows] = useState([]);
  useEffect(() => {
    updateTable();
  }, []);

  const updateTable = () => {
    fetch('/api/scheduled_reports/get_schedules')
      .then((response) => response.json())
      .then((data) => {
        for (var i = 0; i < data.rows.length; i++) {
          let visId = data.rows[i]['visId'];
          data.rows[i]['delete'] = {
            formatted: (
              <EuiButtonEmpty
                color={'danger'}
                onClick={() => {
                  const requestOptions = {
                    method: 'DELETE',
                    headers: { 'kbn-xsrf': 'reporting' },
                  };
                  fetch(`/api/scheduled_reports/delete/${visId}`, requestOptions).then(
                    (response) => {
                      //  Use the core notifications service to display a success message.
                      if (response.ok) {
                        updateTable();
                        props.notifications.toasts.addSuccess(
                          i18n.translate('scheduledReports.dataUpdated', {
                            defaultMessage: 'Your scheduled report has been deleted successfully.',
                          })
                        );
                      } else {
                        props.notifications.toasts.addDanger(
                          i18n.translate('scheduledReports.dataUpdated', {
                            defaultMessage: 'Something went wrong, please try again!',
                          })
                        );
                      }
                      // location.reload()
                    }
                  );
                }}
              >
                {'delete'}
              </EuiButtonEmpty>
            ),
            raw: 'delete',
          };
        }
        setRows(data.rows);
      });
  };
  // ** Pagination config
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const onChangeItemsPerPage = useCallback(
    (pageSize) =>
      setPagination((pagination) => ({
        ...pagination,
        pageSize,
        pageIndex: 0,
      })),
    [setPagination]
  );
  const onChangePage = useCallback(
    (pageIndex) => setPagination((pagination) => ({ ...pagination, pageIndex })),
    [setPagination]
  );

  // ** Sorting config
  const [sortingColumns, setSortingColumns] = useState([]);
  const onSort = useCallback(
    (sortingColumns) => {
      setSortingColumns(sortingColumns);
    },
    [setSortingColumns]
  );

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState(() => columns.map(({ id }) => id)); // initialize to the full set of columns

  const renderCellValue = useMemo(() => {
    return ({ rowIndex, columnId, setCellProps }) => {
      const data = useContext(DataContext);
      useEffect(() => {
        if (columnId === 'amount') {
          if (data.hasOwnProperty(rowIndex)) {
            const numeric = parseFloat(data[rowIndex][columnId].match(/\d+\.\d+/)[0], 10);
            setCellProps({
              style: {
                backgroundColor: `rgba(0, 255, 0, ${numeric * 0.0002})`,
              },
            });
          }
        }
      }, [rowIndex, columnId, setCellProps, data]);

      function getFormatted() {
        if (data[rowIndex][columnId])
          return data[rowIndex][columnId].formatted
            ? data[rowIndex][columnId].formatted
            : data[rowIndex][columnId];
        return null;
      }

      return data.hasOwnProperty(rowIndex) ? getFormatted(rowIndex, columnId) : null;
    };
  }, []);

  const onColumnResize = useRef((eventData) => {
    // console.log(eventData);
  });

  return (
    <DataContext.Provider value={raw_data}>
      <EuiDataGrid
        aria-label="Data grid demo"
        columns={columns}
        columnVisibility={{ visibleColumns, setVisibleColumns }}
        // trailingControlColumns={trailingControlColumns}
        rowCount={raw_data.length}
        renderCellValue={renderCellValue}
        inMemory={{ level: 'sorting' }}
        sorting={{ columns: sortingColumns, onSort }}
        pagination={{
          ...pagination,
          pageSizeOptions: [10, 50, 100],
          onChangeItemsPerPage: onChangeItemsPerPage,
          onChangePage: onChangePage,
        }}
        onColumnResize={onColumnResize.current}
      />
    </DataContext.Provider>
  );
}
