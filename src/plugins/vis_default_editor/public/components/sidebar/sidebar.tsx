/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  memo,
  useMemo,
  useState,
  useCallback,
  KeyboardEventHandler,
  useEffect,
} from 'react';
import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import { keys, EuiButtonIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EventEmitter } from 'events';

import {
  Vis,
  PersistedState,
  VisualizeEmbeddableContract,
} from 'src/plugins/visualizations/public';
import type { Schema } from 'src/plugins/visualizations/public';
import { TimeRange } from 'src/plugins/data/public';
import { SavedSearch } from 'src/plugins/discover/public';
import { DefaultEditorNavBar } from './navbar';
import { DefaultEditorControls } from './controls';
import { setStateParamValue, useEditorReducer, useEditorFormState, discardChanges } from './state';
import { DefaultEditorAggCommonProps } from '../agg_common_props';
import { SidebarTitle } from './sidebar_title';
import { useOptionTabs } from './use_option_tabs';
import { createQuery } from '../utils/createScriptedMetric';

interface DefaultEditorSideBarProps {
  embeddableHandler: VisualizeEmbeddableContract;
  isCollapsed: boolean;
  onClickCollapse: () => void;
  uiState: PersistedState;
  vis: Vis;
  isLinkedSearch: boolean;
  eventEmitter: EventEmitter;
  savedSearch?: SavedSearch;
  timeRange: TimeRange;
}

function DefaultEditorSideBarComponent({
  embeddableHandler,
  isCollapsed,
  onClickCollapse,
  uiState,
  vis,
  isLinkedSearch,
  eventEmitter,
  savedSearch,
  timeRange,
}: DefaultEditorSideBarProps) {
  const [isDirty, setDirty] = useState(false);
  const [state, dispatch] = useEditorReducer(vis, eventEmitter);
  const { formState, setTouched, setValidity, resetValidity } = useEditorFormState();
  const [optionTabs, setSelectedTab] = useOptionTabs(vis);

  const responseAggs = useMemo(
    () => (state.data.aggs ? state.data.aggs.getResponseAggs() : []),
    [state.data.aggs]
  );
  const metricSchemas = (vis.type.schemas.metrics || []).map((s: Schema) => s.name);
  const metricAggs = useMemo(
    () => responseAggs.filter((agg) => agg.schema && metricSchemas.includes(agg.schema)),
    [responseAggs, metricSchemas]
  );
  const hasHistogramAgg = useMemo(
    () => responseAggs.some((agg) => agg.type.name === 'histogram'),
    [responseAggs]
  );

  const setStateValidity = useCallback(
    (value: boolean) => {
      setValidity('visOptions', value);
    },
    [setValidity]
  );

  const setStateValue: DefaultEditorAggCommonProps['setStateParamValue'] = useCallback(
    (paramName, value) => {
      const shouldUpdate = !isEqual(state.params[paramName], value);

      if (shouldUpdate) {
        dispatch(setStateParamValue(paramName, value));
      }
    },
    [dispatch, state.params]
  );

  const [conditions, setConditions] = useState({
    start: "",
    end: ""
  })

  const [isConditionEnabled, setIsConditionEnabled] = useState(false)

  const changeConditions = (conditions: any) => {
    let visId = ''
    if (vis.id) {
      visId = vis.id + '_'
    }
    window.sessionStorage.setItem(visId + 'conditions', JSON.stringify(conditions))
    setConditions(conditions);
    setDirty(true)
  }

  const enableConditions = () => {
    let visId = ''
    if (vis.id) {
      visId = vis.id + '_'
    }
    window.sessionStorage.setItem(visId + 'isConditionEnabled', JSON.stringify(!isConditionEnabled))
    setIsConditionEnabled(!isConditionEnabled)
    setDirty(true)
  }

  const changeEnableConditions = (val: boolean) => {
    let visId = ''
    if (vis.id) {
      visId = vis.id + '_'
    }
    window.sessionStorage.setItem(visId + 'isConditionEnabled', JSON.stringify(val))
    setIsConditionEnabled(val)
  }

  const applyCreateQuery = async () => {
    let tmpMetrics: any[] = []
    let visId = ''
    if (vis.id) {
      visId = vis.id + '_'
    }
    let tmpConditions = window.sessionStorage.getItem(visId + 'conditions')
    let conditionsToWuery = conditions
    if (tmpConditions) {
      conditionsToWuery = JSON.parse(tmpConditions)
    }
    await createQuery(conditionsToWuery, tmpMetrics, JSON.parse(JSON.stringify(state.data.aggs?.aggs)), visId);
  }

  const applyChanges = useCallback(async () => {
    await applyCreateQuery();

    if (formState.invalid || !isDirty) {
      setTouched(true);
      return;
    }
    vis.setState({
      ...vis.serialize(),
      params: state.params,
      data: {
        aggs: state.data.aggs ? (state.data.aggs.aggs.map((agg) => agg.toJSON()) as any) : [],
      },
    });
    embeddableHandler.reload();
    eventEmitter.emit('dirtyStateChange', {
      isDirty: false,
    });
    setTouched(false);
  }, [vis, state, formState.invalid, setTouched, isDirty, eventEmitter, embeddableHandler]);

  const onSubmit: KeyboardEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      if (event.ctrlKey && event.key === keys.ENTER) {
        event.preventDefault();
        event.stopPropagation();

        applyChanges();
      }
    },
    [applyChanges]
  );

  useEffect(() => {
    const changeHandler = ({ isDirty: dirty }: { isDirty: boolean }) => {
      setDirty(dirty);

      if (!dirty) {
        resetValidity();
      }
    };
    eventEmitter.on('dirtyStateChange', changeHandler);

    return () => {
      eventEmitter.off('dirtyStateChange', changeHandler);
    };
  }, [resetValidity, eventEmitter]);

  const getConditionsFromES = (visId: string) => {
    fetch(`/api/vis_conditions/${visId}`)
      .then((response) => response.json())
      .then((data) => {
        let hits = data.body.hits.hits
        if (hits.length > 0) {
          changeEnableConditions(hits[0]._source.enabled)
          changeConditions({
            start: hits[0]._source.start,
            end: hits[0]._source.end
          })
          applyChanges()
        }
      });
  }

  useEffect(() => {
    let visId = window.sessionStorage.getItem('visId')
    if (!visId) {
      if (vis.id) {
        visId = vis.id
        // get conditions from ES
        getConditionsFromES(vis.id);
      }
      else {
        visId = 'not_set'
      }
      window.sessionStorage.setItem('visId', visId)
    }
    if (visId !== vis.id && vis.id) {
      // changed the visualization
      // get new conditions from ES
      getConditionsFromES(vis.id);
      window.sessionStorage.setItem('visId', vis.id)
    }
    let isConditionEnabledTmp = window.sessionStorage.getItem((visId == 'not_set' ? '' : visId + '_') + 'isConditionEnabled')
    if (isConditionEnabledTmp) {
      setIsConditionEnabled(JSON.parse(isConditionEnabledTmp))
    }
    else {
      window.sessionStorage.setItem((visId == 'not_set' ? '' : visId + '_') + 'isConditionEnabled', 'false')
    }
    let conditionsTmp = window.sessionStorage.getItem((visId == 'not_set' ? '' : visId + '_') + 'conditions')
    if (conditionsTmp) {
      setConditions(JSON.parse(conditionsTmp))
    }
    else {
      window.sessionStorage.setItem((visId == 'not_set' ? '' : visId + '_') + 'conditions', JSON.stringify(conditions))
    }
    if (conditionsTmp) {
      createQuery(JSON.parse(conditionsTmp), [], JSON.parse(JSON.stringify(state.data.aggs?.aggs)), (visId == 'not_set' ? '' : visId + '_'))
    }
    // window.sessionStorage.setItem('id')
  }, []);

  // subscribe on external vis changes using browser history, for example press back button
  useEffect(() => {
    const resetHandler = () => dispatch(discardChanges(vis));
    eventEmitter.on('updateEditor', resetHandler);

    return () => {
      eventEmitter.off('updateEditor', resetHandler);
    };
  }, [dispatch, vis, eventEmitter]);

  const dataTabProps = {
    dispatch,
    formIsTouched: formState.touched,
    metricAggs,
    state,
    schemas: vis.type.schemas,
    setValidity,
    setTouched,
    setStateValue,
  };

  const optionTabProps = {
    aggs: state.data.aggs!,
    hasHistogramAgg,
    stateParams: state.params,
    vis,
    uiState,
    setValue: setStateValue,
    setValidity: setStateValidity,
    setTouched,
  };


  return (
    <>
      <EuiFlexGroup
        className="visEditorSidebar"
        direction="column"
        justifyContent="spaceBetween"
        gutterSize="none"
        responsive={false}
      >
        <EuiFlexItem>
          <form
            className="visEditorSidebar__form"
            name="visualizeEditor"
            onKeyDownCapture={onSubmit}
          >
            {vis.type.requiresSearch && (
              <SidebarTitle
                isLinkedSearch={isLinkedSearch}
                savedSearch={savedSearch}
                vis={vis}
                eventEmitter={eventEmitter}
              />
            )}

            {optionTabs.length > 1 && (
              <DefaultEditorNavBar optionTabs={optionTabs} setSelectedTab={setSelectedTab} />
            )}

            {optionTabs.map(({ editor: Editor, name, isSelected = false }) => (
              <div
                key={name}
                className={`visEditorSidebar__config ${isSelected ? '' : 'visEditorSidebar__config-isHidden'
                  }`}
              >
                <Editor
                  isTabSelected={isSelected}
                  {...(name === 'data' ? dataTabProps : optionTabProps)}
                  timeRange={timeRange}
                  conditions={conditions}
                  isConditionEnabled={isConditionEnabled}
                  changeConditions={changeConditions}
                  enableConditions={enableConditions}
                />
              </div>
            ))}
          </form>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <DefaultEditorControls
            applyChanges={applyChanges}
            dispatch={dispatch}
            isDirty={isDirty}
            isTouched={formState.touched}
            isInvalid={formState.invalid}
            vis={vis}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiButtonIcon
        aria-expanded={!isCollapsed}
        aria-label={i18n.translate('visDefaultEditor.sidebar.collapseButtonAriaLabel', {
          defaultMessage: 'Toggle sidebar',
        })}
        className="visEditor__collapsibleSidebarButton"
        data-test-subj="collapseSideBarButton"
        color="text"
        iconType={isCollapsed ? 'menuLeft' : 'menuRight'}
        onClick={onClickCollapse}
      />
    </>
  );
}

const DefaultEditorSideBar = memo(DefaultEditorSideBarComponent);

export { DefaultEditorSideBar };
