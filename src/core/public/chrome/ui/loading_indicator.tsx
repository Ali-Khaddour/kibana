/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiLoadingSpinner, EuiProgress, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import classNames from 'classnames';
import { Subscription } from 'rxjs';

import { HttpStart } from '../../http';

export interface LoadingIndicatorProps {
  loadingCount$: ReturnType<HttpStart['getLoadingCount$']>;
  showAsBar?: boolean;
}

export class LoadingIndicator extends React.Component<LoadingIndicatorProps, { visible: boolean }> {
  public static defaultProps = { showAsBar: false };

  private loadingCountSubscription?: Subscription;

  state = {
    visible: false,
  };

  private timer: any;
  private increment = 1;

  componentDidMount() {
    this.loadingCountSubscription = this.props.loadingCount$.subscribe((count) => {
      if (this.increment > 1) {
        clearTimeout(this.timer);
      }
      this.increment += this.increment;
      this.timer = setTimeout(() => {
        this.setState({
          visible: count > 0,
        });
      }, 250);
    });
  }

  componentWillUnmount() {
    if (this.loadingCountSubscription) {
      clearTimeout(this.timer);
      this.loadingCountSubscription.unsubscribe();
      this.loadingCountSubscription = undefined;
    }
  }

  render() {
    const className = classNames(!this.state.visible && 'kbnLoadingIndicator-hidden');

    const testSubj = this.state.visible
      ? 'globalLoadingIndicator'
      : 'globalLoadingIndicator-hidden';

    const ariaHidden = this.state.visible ? false : true;

    const ariaLabel = i18n.translate('core.ui.loadingIndicatorAriaLabel', {
      defaultMessage: 'Loading content',
    });

    const logo = this.state.visible ? (
      <EuiLoadingSpinner
        size="l"
        data-test-subj={testSubj}
        aria-hidden={false}
        aria-label={ariaLabel}
      />
    ) : (
      <img 
      src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODciIGhlaWdodD0iNjgiIHZpZXdCb3g9IjAgMCA4NyA2OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTUyLjQxNzggMzMuODE0Mkg3OS40MTc4Qzc5LjY4MzEgMzIuMTQ4OCA3OS42NDg0IDMyLjA5NDIgNzguMTY1OCAzMi4wOTQyQzcwLjAwMTggMzIuMDkxNSA2MS44Mzc4IDMyLjA5MjggNTMuNjczOCAzMi4wOTU1QzUzLjI2NzEgMzIuMDk2OCA1Mi44NjA0IDMyLjEzMTUgNTIuNDE3OCAzMi4xNTI4VjMzLjgxNDJaTTUwLjQ2OTggNDEuODA4OEg3OC4yMjg0VjQwLjA4NDhINTAuNTU3OEM1MC41Mjg0IDQwLjY1NjggNTAuNTAxOCA0MS4xODM1IDUwLjQ2OTggNDEuODA4OFpNNDguOTAzMSA0OS43OTQySDc3LjA4MThWNDguMDcwMkg0OC45MDMxVjQ5Ljc5NDJaTTQ2LjM3MjQgNTguNjM4Mkg3Ni4yOTc4VjU2LjkxMjhINDYuMzcyNFY1OC42MzgyWk0zOC44MDA0IDExLjY2MjJDMzguMzA5OCA4LjEwODg1IDQwLjc1OTEgMy43MTI4NCA0NC4xNDk4IDEuOTIzNTFDNDYuMDE3OCAwLjkzNjg0NSA0OC4wMDMxIDAuNDk2ODQ1IDUwLjEwMTggMC40ODc1MTJDNTYuMDYzMSAwLjQ2MjE3OSA2Mi4wMjQ0IDAuNDE5NTA5IDY3Ljk4NTggMC40Mjc1MDlDNjguMzE2NCAwLjQyNzUwOSA2OC43MjU4IDAuNzUwMTc5IDY4Ljk2MzEgMS4wMzQxOEM3My4zNjcxIDYuMzI4ODQgNzcuNzQ4NCAxMS42NDIyIDgyLjE0MTggMTYuOTQ3NUM4My40NjMxIDE4LjU0MjIgODQuODA4NSAyMC4xMTk1IDg2LjEzMzggMjEuNzExNUM4Ni4yODQ1IDIxLjg5MjggODYuNTE1MSAyMi4xMzY4IDg2LjQ4NzEgMjIuMzE2OEM4NS44NTExIDI2LjQ1NjggODUuMTQxOCAzMC41ODYyIDg0LjUzNjQgMzQuNzI4OEM4NC4wNTM4IDM4LjAyODggODMuNzA3MSA0MS4zNDYyIDgzLjI3MjQgNDQuNjUyOEM4Mi42NDA0IDQ5LjQ2NDggODIuMTM2NCA1NC4zMDA4IDgxLjI4NTggNTkuMDc1NUM4MC42NDMxIDYyLjY4MjIgNzcuNDQ0NCA2Ni4zNjA4IDczLjA4NTggNjYuOTkyOEM2OS44ODk4IDY3LjQ1NjggNjYuNTk5MSA2Ny4zMzQyIDYzLjM0OTggNjcuMzUxNUM1NS44NjE4IDY3LjM5MTUgNDguMzcyNCA2Ny4zODM1IDQwLjg4NDQgNjcuMzQyMkMzNy42MTExIDY3LjMyNDggMzQuODg5OCA2Ni4yMjA4IDMzLjIyODQgNjMuMTQ4OEMzMy4wMzUxIDYyLjc5MDIgMzIuMzUzOCA2Mi41MTgyIDMxLjg5MTEgNjIuNTA4OEMyOS4wNTc4IDYyLjQ0ODggMjYuMjIzMSA2Mi40OTQyIDIzLjM4ODQgNjIuNDY2MkMyMi4yNTY0IDYyLjQ1NTUgMjEuMzMxMSA2Mi4wMDQ4IDIwLjg3NTEgNjAuODkyOEMyMC40NjcxIDU5Ljg5ODIgMjAuNTg5OCA1OC45MDQ4IDIxLjM5MTEgNTguMjE2OEMyMS44ODE4IDU3Ljc5NDIgMjIuNjMyNCA1Ny40OTgyIDIzLjI4MTggNTcuNDY4OEMyNS4zNTExIDU3LjM3MjggMjcuNDI5OCA1Ny40OTQyIDI5LjQ5OTEgNTcuNDA0OEMzMC45MDg0IDU3LjM0MzUgMzIuMzI0NCA1Ny4xNDQ4IDMzLjcxMTEgNTYuODcxNUMzNS4xODg0IDU2LjU3OTUgMzUuODIzMSA1NS41ODQ4IDM1LjY2MzEgNTQuMTExNUMzNS41Mzc4IDUyLjk1MTUgMzQuNTU1MSA1Mi4xMzAyIDMzLjE1NzggNTIuMTI3NUMyNS42Njk4IDUyLjExMjggMTguMTgwNCA1Mi4xMTk1IDEwLjY5MjQgNTIuMTE5NUM5LjkzMTEyIDUyLjExOTUgOS4xNjg0NSA1Mi4xMzgyIDguNDA3MTIgNTIuMTE1NUM2Ljc3Nzc4IDUyLjA2NzUgNS41NzExMiA1MC45NDQ4IDUuNTY3MTIgNDkuNTAwOEM1LjU2NDQ1IDQ4LjA1OTUgNi43NzY0NSA0Ni44NzU1IDguMzg5NzggNDYuODc1NUMxNi4xMzI0IDQ2Ljg3OTUgMjMuODczOCA0Ni45MTY4IDMxLjYxNTEgNDYuOTM1NUMzNC40OTI0IDQ2Ljk0MjIgMzcuMzY4NCA0Ni45MTk1IDQwLjI0NDQgNDYuOTI0OEM0MS4zNTY0IDQ2LjkyNzUgNDIuMTUyNCA0Ni4zNzQyIDQyLjQ2MDQgNDUuMzg0OEM0Mi43ODk4IDQ0LjMzMjggNDIuNjY1OCA0My4xODM1IDQxLjU5NzggNDIuNTg4OEM0MC45NDA0IDQyLjIyMjIgNDAuMDgxOCA0Mi4wOTU1IDM5LjMwODQgNDIuMDgyMkMzNi4yNjMxIDQyLjAyNjIgMzMuMjE2NCA0Mi4wNzU1IDMwLjE3MTEgNDIuMDQ3NUMyOC43OTI0IDQyLjAzNDIgMjcuODYwNCA0MS4yOTE1IDI3LjU4MTggNDAuMTA3NUMyNy4zMDMxIDM4LjkxODIgMjcuODYwNCAzNy42Nzk1IDI5LjAwNDQgMzcuMTc4MkMyOS40NDU4IDM2Ljk4MzUgMjkuOTg1OCAzNi45NTQyIDMwLjQ4MTggMzYuOTUxNUMzNC4yNDcxIDM2LjkzNDIgMzguMDEyNCAzNi45NDM1IDQxLjc3NzggMzYuOTQwOEM0My41NTkxIDM2LjkzOTUgNDQuNjIxOCAzNi4wODA4IDQ0LjY1NzggMzQuNjI0OEM0NC42OTM4IDMzLjIwNjIgNDMuNDc5MSAzMi4xMDM1IDQxLjc2NzEgMzIuMDk5NUMzNS43MTY0IDMyLjA4NDggMjkuNjY3MSAzMi4xMDA4IDIzLjYxNjQgMzIuMTAwOEMxNi44NDcxIDMyLjEwMDggMTAuMDc3OCAzMi4xMDg4IDMuMzA4NDUgMzIuMDg0OEMwLjk1MjQ0OSAzMi4wNzY4IC0wLjI1Njg4MiAzMC40MTQyIDAuNjExMTE4IDI4LjQ0MzVDMS4wNzExMiAyNy40MDM1IDEuOTExMTIgMjcuMDEwMiAzLjA0MDQ1IDI3LjAxNjhDNy43MzY0NSAyNy4wMzk1IDEyLjQzMjQgMjcuMDIyMiAxNy4xMjk4IDI3LjAyMjJDMjcuNzkxMSAyNy4wMjM1IDM4LjQ1MjQgMjcuMDMxNSA0OS4xMTUxIDI3LjAyMjJDNTEuMzc3OCAyNy4wMjA4IDUyLjYyMzEgMjUuMTYzNSA1MS42MzkxIDIzLjI4NzVDNTEuMDY3MSAyMi4xOTY4IDUwLjAzMzggMjIuMDMyOCA0OC45MzM4IDIyLjAzMjhDNDIuNTQ0NCAyMi4wMzU1IDM2LjE1NjQgMjIuMDM0MiAyOS43NjcxIDIyLjAzMjhDMjcuNjk1MSAyMi4wMzI4IDI1LjYyMDQgMjIuMDYwOCAyMy41NDg0IDIyLjAxOTVDMjIuMzEyNCAyMS45OTQyIDIxLjM5NjQgMjEuNDUxNSAyMS4wMjk4IDIwLjE2NzVDMjAuNzE1MSAxOS4wNjM1IDIxLjAwMTggMTguMTA0OCAyMS45MDk4IDE3LjUwNzVDMjIuNDYwNCAxNy4xNDQ4IDIzLjI0MDQgMTYuOTk2OCAyMy45MjE4IDE2Ljk4MzVDMzAuMDk1MSAxNi44NTk1IDM2LjI2OTggMTYuNzg4OCA0Mi40NDQ0IDE2LjY5ODJDNDQuODEyNCAxNi42NjIyIDQ3LjE4MTggMTYuNjM1NSA0OS41NDg0IDE2LjU2MjJDNTAuNzcxMSAxNi41MjQ4IDUxLjU5NjQgMTUuODYyMiA1MS45MTExIDE0LjY4MjJDNTIuMTg5OCAxMy42Mzk1IDUxLjgyNDQgMTIuNzMwMiA1MC45Mzc4IDEyLjE2ODhDNTAuNDgxOCAxMS44Nzk1IDQ5Ljg0NDQgMTEuNzcxNSA0OS4yODg0IDExLjc2NDhDNDYuMDMxMSAxMS43Mjg4IDQyLjc3MjQgMTEuNzQ4OCAzOS41MTUxIDExLjc0MjJDMzkuMjcxMSAxMS43NDIyIDM5LjAyNzEgMTEuNjg4OCAzOC44MDA0IDExLjY2MjIiIGZpbGw9IiM0MkI3NUUiLz4KPHBhdGggZD0iTTEyLjY2NzggMjIuMDMyN0MxMS41MjkyIDIyLjAzMjcgMTAuMzkwNSAyMi4wNjYxIDkuMjUzMTggMjIuMDI0N0M3LjY0MjUxIDIxLjk2NDcgNi42OTU4NCAyMS4wMjg3IDYuNjc0NTEgMTkuNTQ4N0M2LjY1MDUxIDE3LjkzNjcgNy4zOTg1MSAxNy4wNTgxIDkuMTE5ODQgMTcuMDAwN0MxMS41NjI1IDE2LjkxOTQgMTQuMDExOCAxNi45MjM0IDE2LjQ1NDUgMTcuMDEwMUMxOC4wNjEyIDE3LjA2NzQgMTguOTQ2NSAxOC4xMTQxIDE4Ljg5ODUgMTkuNjAzNEMxOC44NTQ1IDIwLjkzMTQgMTcuODA5MiAyMS45NTk0IDE2LjMzNTggMjIuMDIyMUMxNS4xMTU4IDIyLjA3NTQgMTMuODkwNSAyMi4wMzI3IDEyLjY2NzggMjIuMDMyN1oiIGZpbGw9IiMyQTkxNUQiLz4KPHBhdGggZD0iTTIxLjU5MzQgNDIuMDQyMkMyMC42NjU0IDQyLjA0MjIgMTkuNzMzNCA0Mi4wOTE2IDE4LjgwOTQgNDIuMDMwMkMxNy4zNTc0IDQxLjkzNDIgMTYuNDI0MSA0MC44NTQyIDE2LjQ3MjEgMzkuNDI0OUMxNi41MjAxIDM4LjAwMjIgMTcuNTEyMSAzNi45NzgyIDE4Ljk0OTQgMzYuOTUwMkMyMC42Nzg4IDM2LjkxODIgMjIuNDA5NCAzNi45MjM2IDI0LjEzODggMzYuOTQ4OUMyNS42NTA4IDM2Ljk2ODkgMjYuNzI1NCAzOC4wMDg5IDI2Ljc3MjEgMzkuNDM5NkMyNi44MTg4IDQwLjg3MDIgMjUuNzkwOCA0MS45NTgyIDI0LjI1MDggNDIuMDQyMkMyMy4zNjgxIDQyLjA5MDIgMjIuNDgwMSA0Mi4wNTAyIDIxLjU5MzQgNDIuMDUwMlY0Mi4wNDIyWiIgZmlsbD0iIzJBOTE1RCIvPgo8cGF0aCBkPSJNNjguMjc5NSAwLjUwMDQxNkw2Ni40OTY4IDIyLjMxNzdIODYuNDg3NUw2OC4yNzk1IDAuNTAwNDE2WiIgZmlsbD0iIzJBOTE1RCIvPgo8L3N2Zz4K"
      width="24"
      height="24"
      />
    );

    return !this.props.showAsBar ? (
      logo
    ) : (
      <EuiProgress
        className={className}
        data-test-subj={testSubj}
        aria-hidden={ariaHidden}
        aria-label={ariaLabel}
        position="fixed"
        color="accent"
        size="xs"
      />
    );
  }
}
