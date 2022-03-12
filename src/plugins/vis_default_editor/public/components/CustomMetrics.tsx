import { EuiDragDropContext, EuiPanel, EuiTitle, EuiSpacer, EuiFormErrorText, EuiDroppable, EuiDraggable, EuiAccordion, EuiFormRow, EuiCode, EuiSelectable, EuiFieldText, EuiSelect, EuiButton } from "@elastic/eui";
import { i18n } from "@kbn/i18n";
import React from "react";
import { marginProp } from "react-tiny-virtual-list/types/constants";
import { metricsAggsSchemas } from "src/core/server/saved_objects/service/lib/aggregations/aggs_types/metrics_aggs";
// import { IAggConfig, AggGroupNames } from "src/plugins/data/common";
// import { DefaultEditorAgg } from "./agg";
// import { DefaultEditorAggAdd } from "./agg_add";
// import { calcAggIsTooLow, isAggRemovable } from "./agg_group_helper";
// import { setAggParamValue, setStateParamValue, removeAgg } from "./sidebar/state";

function CustomMetrics(props: any) {
    console.log(props.metrics)
    var bucketsError = false;
    // alert(JSON.stringify(props.metrics))
    var metricsInputs = []
    for(let i = 0; i < props.metrics.length; i ++) {
        metricsInputs.push(<EuiDraggable
            key={"1"}
            index={10}
            draggableId={`agg_group_dnd_conditions_1`}
            customDragHandle={true}
        >
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: '15px' }}>
                <div style={{ width: "25%" }}>
                    <EuiSelect
                        hasNoInitialSelection
                        value={props.metrics[i].value}
                        onChange={(e) => {
                            let newVal = props.metrics[i];
                            newVal.value = e.target.value
                            props.changeMetrics(i, newVal)    
                        }}
                        options={[
                            { value: 'sum', text: 'Sum' },
                            { value: 'avg', text: 'Average' },
                            { value: 'max', text: 'Max' },
                            { value: 'min', text: 'Min' },
                        ]}
                        aria-label="An example of a form element without a visible label"
                    />
                </div>
                <div style={{ width: "73%" }}>
                    <EuiFieldText name="start" aria-label="Example" value={props.metrics[i].field} onChange={(e) => {
                        let newVal = props.metrics[i];
                        newVal.field = e.target.value
                        props.changeMetrics(i, newVal)
                    }} />
                </div>
            </div>
        </EuiDraggable>)
    }
    return (
        <EuiDragDropContext onDragEnd={() => alert("drag ended")}>
            <EuiPanel data-test-subj={`AggGroup`} paddingSize="s">
                <EuiTitle size="xs">
                    <h3>Metrics</h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                {bucketsError && (
                    <>
                        <EuiFormErrorText data-test-subj="bucketsError">{bucketsError}</EuiFormErrorText>
                        <EuiSpacer size="s" />
                    </>
                )}
                <EuiDroppable droppableId={`agg_group_dnd_condition`}>
                    <>
                        {metricsInputs}
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px', height: '35px', marginTop: '15px' }}>
                            <EuiButton type="submit" onClick={(e: any)=> {
                                e.preventDefault();
                                props.changeMetrics(-1, {
                                    value: 'sum',
                                    field: ''
                                })
                            }}>
                                Add
                            </EuiButton>
                        </div>
                    </>
                </EuiDroppable>
            </EuiPanel>
        </EuiDragDropContext>
    );
}

export { CustomMetrics };
