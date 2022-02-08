import { EuiDragDropContext, EuiPanel, EuiTitle, EuiSpacer, EuiFormErrorText, EuiDroppable, EuiDraggable, EuiAccordion, EuiFormRow, EuiCode, EuiSelectable, EuiFieldText, EuiSwitch } from "@elastic/eui";
import React from "react";

function Conditions(props: any) {
  var bucketsError = false;
  var stratText = "Start"
  var endText = "End"
  console.log(props.aggs)
  console.log(props.conditions)
  return (
    <EuiDragDropContext onDragEnd={() => alert("drag ended")}>
      <EuiPanel data-test-subj={`AggGroup`} paddingSize="s">
        <EuiTitle size="xs">
          <h3>Conditions</h3>
        </EuiTitle>
        <EuiSwitch
          name="switch"
          label="Enable/Disable"
          checked={props.isConditionEnabled}
          onChange={() => {
            props.enableConditions();
          }}
        />
        <EuiSpacer size="s" />
        {bucketsError && (
          <>
            <EuiFormErrorText data-test-subj="bucketsError">{bucketsError}</EuiFormErrorText>
            <EuiSpacer size="s" />
          </>
        )}
        <EuiDroppable droppableId={`agg_group_dnd_condition`}>
          <>
            <EuiDraggable
              key={"1"}
              index={10}
              draggableId={`agg_group_dnd_conditions_1`}
              customDragHandle={true}
            >
              <>
                <EuiFormRow
                  label={stratText}
                  fullWidth
                >
                  <EuiFieldText name="start" aria-label="Example" value={props.conditions.start}
                    onChange={(e) => {
                      props.changeConditions({
                        start: e.target.value,
                        end: props.conditions.end
                      })
                    }} />
                  {/* <ConditionsField /> */}

                </EuiFormRow>
                <EuiFormRow
                  label={endText}
                  fullWidth
                >
                  <EuiFieldText name="end" aria-label="Example" value={props.conditions.end} onChange={(e) => {
                    props.changeConditions({
                      start: props.conditions.start,
                      end: e.target.value
                    })
                  }} />
                </EuiFormRow>
              </>
            </EuiDraggable>

          </>
        </EuiDroppable>
      </EuiPanel>
    </EuiDragDropContext>
  );
}

export { Conditions };
