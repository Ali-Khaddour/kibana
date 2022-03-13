/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { APP_SHORTCUT } from '../../../../server/environment/variables';
import React, { HTMLAttributes } from 'react';

export const ElasticMark = ({ ...props }: HTMLAttributes<SVGElement>) => {
  let APP_SHORTCUT = localStorage.getItem('APP_SHORTCUT');
  return (
    <img src={`/ui/favicons/${APP_SHORTCUT}-mark.svg`} alt="" />
  );
}
