import { useGeneratedHtmlId, EuiFlyout, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody, EuiText, EuiDataGrid, EuiButtonEmpty, EuiPopover, EuiContextMenuPanel, EuiContextMenuItem, EuiToolTip, EuiButtonIcon } from "@elastic/eui";
import React, { Fragment, useCallback, useEffect, useState } from "react";

let columns: any[] = [];

function getDataList(): any {
    columns = []
    let dataListStr = window.sessionStorage.getItem('customTableData');
    if(dataListStr) {
        let dataList = JSON.parse(dataListStr)
        if (dataList.length > 0) {
            let result = [];
            let dataListArr: any[] = dataList[0];
            let firstPart: any = {};
            for (let i = 0; i < dataListArr.length - 1; i++) {
                let e: any = JSON.parse(dataListArr[i]);
                let key = Object.keys(e)[0];
                let value = e[key];
                firstPart[key] = value;
            };
            let lastElement = JSON.parse(dataListArr[dataListArr.length - 1]).conditionalTerms[0];
            for (let i = 0; i < lastElement.length; i++) {
                result.push({ ...firstPart, ...lastElement[i] })
            }
            if(result.length > 0) {
                let keys = Object.keys(result[0]);
                for(let i = 0; i < keys.length; i ++) {
                    columns.push({
                        id: keys[i]
                    })
                }
                columns.push({
                    id: "actions"
                })
            }
            // alert(JSON.stringify(result))
            return result;
        }
        else {
            // return getDataList();
            return [];
        }
    }
}

function CustomTable(props: any) {
    const [data, setDataList] = useState(JSON.parse(JSON.stringify(getDataList())));
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
    
    // const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
    // const flyoutTitleId = useGeneratedHtmlId({
    //     prefix: 'dataGridAdditionalControlsFlyout',
    // });
    
    // let flyout;
    // if (isFlyoutVisible) {
    //     flyout = (
    //         <EuiFlyout
    //             onClose={() => setIsFlyoutVisible(false)}
    //             aria-labelledby={flyoutTitleId}
    //         >
    //             <EuiFlyoutHeader hasBorder>
    //                 <EuiTitle size="m">
    //                     <h2 id={flyoutTitleId}>Inspect</h2>
    //                 </EuiTitle>
    //             </EuiFlyoutHeader>
    //             <EuiFlyoutBody>
    //                 <EuiText>
    //                     <p>
    //                         This is not a real control, just an example of how to trigger a
    //                         flyout from a custom data grid control.
    //         </p>
    //                 </EuiText>
    //             </EuiFlyoutBody>
    //         </EuiFlyout>
    //     );
    // }

    const [isPopoverOpen, setPopover] = useState(false);
    const popoverId = useGeneratedHtmlId({
        prefix: 'dataGridAdditionalControlsPopover',
    });
    const alertAndClosePopover = (position?: string) => {
        setPopover(false);
        window.alert(
            `This is not a real control. It was passed into the \`${position}\` position.`
        );
    };

    const [visibleColumns, setVisibleColumns] = useState(() =>
        columns.map(({ id }) => id)
    );

    const setPageIndex = useCallback(
        (pageIndex) => setPagination({ ...pagination, pageIndex }),
        [pagination, setPagination]
    );
    const setPageSize = useCallback(
        (pageSize) => setPagination({ ...pagination, pageSize, pageIndex: 0 }),
        [pagination, setPagination]
    );

    return (
        <>
            <div style={{height: "100%", width: "100%", background: "red"}}>
            <EuiDataGrid
                aria-label="Data grid demo with additional controls"
                columns={columns}
                columnVisibility={{
                    visibleColumns: visibleColumns,
                    setVisibleColumns: setVisibleColumns,
                }}
                rowCount={data.length}
                gridStyle={{
                    border: 'horizontal',
                    header: 'underline',
                }}
                renderCellValue={({ rowIndex, columnId }) => data[rowIndex][columnId]}
                pagination={{
                    ...pagination,
                    pageSizeOptions: [5, 10, 25],
                    onChangeItemsPerPage: setPageSize,
                    onChangePage: setPageIndex,
                }}
            />
            </div>
        </>
    );
}

export { CustomTable };
