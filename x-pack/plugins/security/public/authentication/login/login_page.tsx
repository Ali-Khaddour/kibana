/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './login_page.scss';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  // EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import classNames from 'classnames';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { BehaviorSubject } from 'rxjs';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { CoreStart, FatalErrorsStart, HttpStart, NotificationsStart } from 'src/core/public';

import {
  AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER,
  LOGOUT_REASON_QUERY_STRING_PARAMETER,
} from '../../../common/constants';
import type { LoginState } from '../../../common/login_state';
import type { LogoutReason } from '../../../common/types';
import type { ConfigType } from '../../config';
import type { LoginFormProps } from './components';
import { DisabledLoginForm, LoginForm, LoginFormMessageType } from './components';

interface Props {
  http: HttpStart;
  notifications: NotificationsStart;
  fatalErrors: FatalErrorsStart;
  loginAssistanceMessage: string;
  sameSiteCookies?: ConfigType['sameSiteCookies'];
}

interface State {
  loginState: LoginState | null;
}

const loginFormMessages: Record<LogoutReason, NonNullable<LoginFormProps['message']>> = {
  SESSION_EXPIRED: {
    type: LoginFormMessageType.Info,
    content: i18n.translate('xpack.security.login.sessionExpiredDescription', {
      defaultMessage: 'Your session has timed out. Please log in again.',
    }),
  },
  AUTHENTICATION_ERROR: {
    type: LoginFormMessageType.Info,
    content: i18n.translate('xpack.security.login.authenticationErrorDescription', {
      defaultMessage: 'An unexpected authentication error occurred. Please log in again.',
    }),
  },
  LOGGED_OUT: {
    type: LoginFormMessageType.Info,
    content: i18n.translate('xpack.security.login.loggedOutDescription', {
      defaultMessage: `You have logged out of ${process.env.APP_TITILE}.`,
    }),
  },
  UNAUTHENTICATED: {
    type: LoginFormMessageType.Danger,
    content: i18n.translate('xpack.security.unauthenticated.errorDescription', {
      defaultMessage:
        "We hit an authentication error. Please check your credentials and try again. If you still can't log in, contact your system administrator.",
    }),
  },
};

export class LoginPage extends Component<Props, State> {
  state = { loginState: null } as State;

  public async componentDidMount() {
    const loadingCount$ = new BehaviorSubject(1);
    this.props.http.addLoadingCountSource(loadingCount$.asObservable());

    try {
      this.setState({ loginState: await this.props.http.get('/internal/security/login_state') });
    } catch (err) {
      this.props.fatalErrors.add(err as Error);
    }

    loadingCount$.next(0);
    loadingCount$.complete();
  }

  public render() {
    const loginState = this.state.loginState;
    if (!loginState) {
      return null;
    }

    const isSecureConnection = !!window.location.protocol.match(/^https/);
    const isCookiesEnabled = window.navigator.cookieEnabled;
    const { allowLogin, layout, requiresSecureConnection } = loginState;

    const loginIsSupported =
      (requiresSecureConnection && !isSecureConnection) || !isCookiesEnabled
        ? false
        : allowLogin && layout === 'form';

    const contentHeaderClasses = classNames('loginWelcome__content', 'eui-textCenter', {
      ['loginWelcome__contentDisabledForm']: !loginIsSupported,
    });

    const contentBodyClasses = classNames('loginWelcome__content', 'loginWelcome-body', {
      ['loginWelcome__contentDisabledForm']: !loginIsSupported,
    });

    return (
      <div className="loginWelcome login-form">
        <header className="loginWelcome__header">
          <div className={contentHeaderClasses}>
            <EuiSpacer size="xxl" />
            {/* <span className="loginWelcome__logo">
              <EuiIcon type="logoElastic" size="xxl" />
            </span> */}
            <img
              src="data:image/png;base64,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"
              alt="logo"
              style={{ width: '200px', paddingBottom: '20px' }}
            />
            <EuiTitle size="m" className="loginWelcome__title">
              <h1>
                <FormattedMessage
                  id="xpack.security.loginPage.welcomeTitle"
                  defaultMessage={`Welcome to ${process.env.APP_TITILE}`}
                />
              </h1>
            </EuiTitle>
            <EuiSpacer size="xl" />
          </div>
        </header>
        <div className={contentBodyClasses}>
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              {this.getLoginForm({
                ...loginState,
                isSecureConnection,
                isCookiesEnabled,
              })}
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              <span className='powered-by' style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "30px", marginTop: "30px", color: "#69707D" }}>
                Powered By
                <a href="https://www.safee.xyz/" target='_blank' style={{ paddingLeft: "5px" }}>
                  Safee Tracking
                  <span style={{ fontSize: "16px", paddingLeft: "2px" }}>&trade;</span>
                </a>
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>
    );
  }

  private getLoginForm = ({
    layout,
    requiresSecureConnection,
    isSecureConnection,
    isCookiesEnabled,
    selector,
    loginHelp,
  }: LoginState & {
    isSecureConnection: boolean;
    isCookiesEnabled: boolean;
  }) => {
    const isLoginExplicitlyDisabled = selector.providers.length === 0;
    if (isLoginExplicitlyDisabled) {
      return (
        <DisabledLoginForm
          title={
            <FormattedMessage
              id="xpack.security.loginPage.noLoginMethodsAvailableTitle"
              defaultMessage="Login is disabled."
            />
          }
          message={
            <FormattedMessage
              id="xpack.security.loginPage.noLoginMethodsAvailableMessage"
              defaultMessage="Contact your system administrator."
            />
          }
        />
      );
    }

    if (requiresSecureConnection && !isSecureConnection) {
      return (
        <DisabledLoginForm
          title={
            <FormattedMessage
              id="xpack.security.loginPage.requiresSecureConnectionTitle"
              defaultMessage="A secure connection is required for log in"
            />
          }
          message={
            <FormattedMessage
              id="xpack.security.loginPage.requiresSecureConnectionMessage"
              defaultMessage="Contact your system administrator."
            />
          }
        />
      );
    }

    if (!isCookiesEnabled) {
      if (isWindowEmbedded()) {
        return (
          <div style={{ maxWidth: '36em', margin: 'auto', textAlign: 'center' }}>
            <EuiText color="subdued">
              <p>
                {this.props.sameSiteCookies !== 'None' ? (
                  <FormattedMessage
                    id="xpack.security.loginPage.openInNewWindowOrChangeKibanaConfigTitle"
                    defaultMessage="To view this content, open it in a new window or ask your administrator to allow cross-origin cookies."
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.security.loginPage.openInNewWindowOrChangeBrowserSettingsTitle"
                    defaultMessage="To view this content, open it in a new window or adjust your browser settings to allow third-party cookies."
                  />
                )}
              </p>
            </EuiText>
            <EuiSpacer />
            <EuiButton
              href={window.location.href}
              target="_blank"
              iconType="popout"
              iconSide="right"
              fill
            >
              <FormattedMessage
                id="xpack.security.loginPage.openInNewWindowButton"
                defaultMessage="Open in new window"
              />
            </EuiButton>
          </div>
        );
      }

      return (
        <DisabledLoginForm
          title={
            <FormattedMessage
              id="xpack.security.loginPage.requiresCookiesTitle"
              defaultMessage="Cookies are required to log in to Elastic"
            />
          }
          message={
            <FormattedMessage
              id="xpack.security.loginPage.requiresCookiesMessage"
              defaultMessage="Enable cookies in your browser settings to continue."
            />
          }
        />
      );
    }

    if (layout === 'error-es-unavailable') {
      return (
        <DisabledLoginForm
          title={
            <FormattedMessage
              id="xpack.security.loginPage.esUnavailableTitle"
              defaultMessage="Cannot connect to the Elasticsearch cluster"
            />
          }
          message={
            <FormattedMessage
              id="xpack.security.loginPage.esUnavailableMessage"
              defaultMessage="See the Kibana logs for details and try reloading the page."
            />
          }
        />
      );
    }

    if (layout === 'error-xpack-unavailable') {
      return (
        <DisabledLoginForm
          title={
            <FormattedMessage
              id="xpack.security.loginPage.xpackUnavailableTitle"
              defaultMessage="Cannot connect to the Elasticsearch cluster currently configured for Kibana."
            />
          }
          message={
            <FormattedMessage
              id="xpack.security.loginPage.xpackUnavailableMessage"
              defaultMessage="To use the full set of free features in this distribution of Kibana, please update Elasticsearch to the default distribution."
            />
          }
        />
      );
    }

    if (layout !== 'form') {
      return (
        <DisabledLoginForm
          title={
            <FormattedMessage
              id="xpack.security.loginPage.unknownLayoutTitle"
              defaultMessage="Unsupported login form layout."
            />
          }
          message={
            <FormattedMessage
              id="xpack.security.loginPage.unknownLayoutMessage"
              defaultMessage="See the Kibana logs for details and try reloading the page."
            />
          }
        />
      );
    }

    const { searchParams } = new URL(window.location.href);

    return (
      <LoginForm
        http={this.props.http}
        notifications={this.props.notifications}
        selector={selector}
        message={
          loginFormMessages[searchParams.get(LOGOUT_REASON_QUERY_STRING_PARAMETER) as LogoutReason]
        }
        loginAssistanceMessage={this.props.loginAssistanceMessage}
        loginHelp={loginHelp}
        authProviderHint={searchParams.get(AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER) || undefined}
      />
    );
  };
}

export function renderLoginPage(i18nStart: CoreStart['i18n'], element: Element, props: Props) {
  ReactDOM.render(
    <i18nStart.Context>
      <LoginPage {...props} />
    </i18nStart.Context>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
}

function isWindowEmbedded() {
  try {
    return window.self !== window.top;
  } catch (error) {
    return true;
  }
}
