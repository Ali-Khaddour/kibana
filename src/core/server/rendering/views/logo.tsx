/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

function Logo(props: { uiPublicUrl: any; }) {
  return <img
    src={`${props.uiPublicUrl}/logos/${process.env.APP_SHORTCUT}-logo.svg`}
    alt="logo"
    style={{ width: '200px', paddingBottom: '20px' }}
  />
}

export default Logo;