/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SAVED_QUERY_ID_REF_NAME, SAVED_QUERY_TYPE } from '../../constants';
import { FieldMigrator } from '../../utils/migrator';
import { defaultDataViewRef } from '../../../../../common/constants';

/**
 * A migrator to handle moving specific fields that reference other saved objects to the references field within a saved
 * object.
 */
export const timelineFieldsMigrator = new FieldMigrator([
  { path: 'savedQueryId', type: SAVED_QUERY_TYPE, name: SAVED_QUERY_ID_REF_NAME },
  { ...defaultDataViewRef, path: 'dataViewId' },
]);
