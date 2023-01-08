import { IIndexPatternFieldList, FieldSpec } from 'src/plugins/data/common';

// let timeFields = ['messageTime', 'timestamp', 'alarms.fireTime', 'submission_DateTime']
// let arrayFields = ['geofences.keyword', 'alarms.keyword']

// let timestamp = localStorage.getItem('timestamp');

const getNumOfBuckets = (aggs: any[]) => {
  let ctr = 0;
  for (let i = 0; i < aggs.length; i++) {
    if (aggs[i].schema === 'bucket' && aggs[i].enabled) {
      ctr++;
    }
  }
  return ctr;
};

function checkTimeField(field: any) {
  return field?.type === 'date';
}

export const createQuery = async (
  timeField: string | undefined,
  fields: (IIndexPatternFieldList & { toSpec: () => Record<string, FieldSpec> }) | undefined,
  conditions: { start: string; end: string },
  subMetrics: any[],
  aggs: any[],
  visId: string
) => {
  let timeFields = fields?.filter(checkTimeField).map((field) => field.spec.name) || [];
  let timeFieldName = timeField ? timeField : 'timestamp';
  subMetrics = [];
  if (aggs) {
    let numOfPreviousCols = getNumOfBuckets(aggs);
    for (let i = 0; i < aggs.length; i++) {
      if (aggs[i].schema === 'metric') {
        let value = aggs[i].type;
        let id = `col-${numOfPreviousCols++}-${aggs[i].id}`;
        let field = '';
        if (aggs[i].type !== 'count') {
          field = aggs[i].params.field;
        }
        subMetrics.push({
          id,
          value,
          field,
        });
      }
    }
  }

  let conditionsFields = [];
  let started = false;
  let tmpStr = '`';
  let startCond = new String(conditions.start);
  let endCond = new String(conditions.end);
  let exitGeofencesList = [];

  let exitGeofence = '';

  let exitGeofencePattern = /\{geofences\}\.exit\(\'(.*)\'\)/;
  let exitRightAndpattern = /\{geofences\}\.exit\(\'(.*)\'\)\s*\&\&/;
  let exitLeftAndpattern = /\&\&\s*\{geofences\}\.exit\(\'(.*)\'\)/;
  let exitRightOrpattern = /\{geofences\}\.exit\(\'(.*)\'\)\s*\|\|/;
  let exitLeftOrpattern = /\|\|\s*\{geofences\}\.exit\(\'(.*)\'\)/;
  let isGeofenceExitStart = false;

  if (startCond.match(exitGeofencePattern)) {
    let match = startCond.match(exitGeofencePattern);
    exitGeofence = match ? match[1] : '';
    isGeofenceExitStart = true;
    if (startCond.match(exitRightAndpattern)) {
      startCond = startCond.replace(exitRightAndpattern, '');
    } else if (startCond.match(exitLeftAndpattern)) {
      startCond = startCond.replace(exitLeftAndpattern, '');
    } else if (startCond.match(exitRightOrpattern)) {
      startCond = startCond.replace(exitRightOrpattern, '');
    } else if (startCond.match(exitLeftOrpattern)) {
      startCond = startCond.replace(exitLeftOrpattern, '');
    } else {
      startCond = startCond.replace(exitGeofencePattern, '');
    }
  }
  exitGeofencesList = exitGeofence.split(';');
  exitGeofencesList = exitGeofencesList.map((n) => n.trim());

  let enterGeofencePattern = /\{geofences\}\.enter\(\'(.*)\'\)/;
  let enterRightAndpattern = /\{geofences\}\.enter\(\'(.*)\'\)\s*\&\&/;
  let enterLeftAndpattern = /\&\&\s*\{geofences\}\.enter\(\'(.*)\'\)/;
  let enterRightOrpattern = /\{geofences\}\.enter\(\'(.*)\'\)\s*\|\|/;
  let enterLeftOrpattern = /\|\|\s*\{geofences\}\.enter\(\'(.*)\'\)/;

  let enterGeofence = '';
  let enterGeofencesList = [];

  if (endCond.match(enterGeofencePattern)) {
    let match = endCond.match(enterGeofencePattern);
    enterGeofence = match ? match[1] : '';

    if (endCond.match(enterRightAndpattern)) {
      endCond = endCond.replace(enterRightAndpattern, '');
    } else if (endCond.match(enterLeftAndpattern)) {
      endCond = endCond.replace(enterLeftAndpattern, '');
    } else if (endCond.match(enterRightOrpattern)) {
      endCond = endCond.replace(enterRightOrpattern, '');
    } else if (endCond.match(enterLeftOrpattern)) {
      endCond = endCond.replace(enterLeftOrpattern, '');
    } else {
      endCond = endCond.replace(enterGeofencePattern, '');
    }
  }

  enterGeofencesList = enterGeofence.split(';');
  enterGeofencesList = enterGeofencesList.map((n) => n.trim());

  for (let i = 0; i < startCond.length; i++) {
    if (started && startCond[i] === '}') {
      tmpStr += startCond[i];
      conditionsFields.push(new String(tmpStr));
      started = false;
    } else if (started && startCond[i] !== '}') {
      tmpStr += startCond[i];
    } else if (!started && startCond[i] === '{') {
      tmpStr = '';
      tmpStr += startCond[i];
      started = true;
    }
  }
  started = false;
  for (let i = 0; i < endCond.length; i++) {
    if (started && endCond[i] === '}') {
      tmpStr += endCond[i];
      conditionsFields.push(new String(tmpStr));
      started = false;
    } else if (started && endCond[i] !== '}') {
      tmpStr += endCond[i];
    } else if (!started && endCond[i] === '{') {
      tmpStr = '';
      tmpStr += endCond[i];
      started = true;
    }
  }

  conditionsFields.forEach((element) => {
    startCond = startCond.replace(
      `${element}`,
      `p.get('${element.substring(1, element.length - 1)}')`
    );
  });
  conditionsFields.forEach((element) => {
    endCond = endCond.replace(`${element}`, `p.get('${element.substring(1, element.length - 1)}')`);
  });
  let current = {};
  let initScript = 'state.messages = new TreeMap(); ' + 'state.res = new ArrayList(); ';
  let mapScript = 'Map map = new HashMap(); ';

  mapScript +=
    "if(!doc.containsKey('geofences.keyword') || doc['geofences.keyword'].empty) map['geofences.keyword'] = [];";
  mapScript += "else map['geofences.keyword'] = new ArrayList(doc['geofences.keyword']);";

  conditionsFields.forEach((condition) => {
    mapScript += `map['${condition.substring(
      1,
      condition.length - 1
    )}'] = doc['${condition.substring(1, condition.length - 1)}'].value; `;
  });

  mapScript += `map['${timeFieldName}'] = doc['${timeFieldName}'].value; `;
  subMetrics.forEach((metric) => {
    if (metric.value != 'count')
      mapScript += `map['${metric.field}'] = doc['${metric.field}'].value; `;
  });

  mapScript += `state.messages.put(doc.${timeFieldName}.value, map); `;

  let combineScript = '';
  // if end has * geofence condition -> start must have end condition
  // // "!{geofences.keyword}.contains('geofence 1') && {geofences.keyword}.length() > 0"
  if (isGeofenceExitStart) {
    combineScript = 'def prevGeofences = []; ';
    combineScript += 'def exited = false; ';
    combineScript += 'def ctr = 0; ';
    combineScript += 'def inCondition = false; ';

    combineScript += 'def startTime = Instant.ofEpochMilli(new Date().getTime());';
    combineScript += 'def endTime = Instant.ofEpochMilli(new Date().getTime());';
    subMetrics.forEach((metric) => {
      if (timeFields.includes(metric.field)) {
        combineScript += `def ${metric.value}_${metric.field.replace('.', '_')}; `;
      } else {
        combineScript += `def ${metric.value}_${metric.field.replace('.', '_')} = 0.0; `;
        if (metric.value === 'avg') {
          combineScript += `def ${metric.value}_sum_${metric.field.replace('.', '_')} = 0.0; `;
        }
      }
    });
    combineScript += 'def exitGeofencesNames = new String();';
    combineScript += 'def enterGeofencesNames = new String();';

    let start = 'def diffGeofences = new ArrayList(prevGeofences);';
    start += "diffGeofences.removeAll(p.get('geofences.keyword'));";
    start += "def enteredGeofences = new ArrayList(p.get('geofences.keyword'));";
    start += 'enteredGeofences.removeAll(prevGeofences);';

    start += 'def exitGeofencesList = []; ';
    let isExitAllGeofences = false;
    if (exitGeofence != '*') {
      exitGeofencesList.forEach((g) => {
        start += `exitGeofencesList.add(\"${g}\"); `;
      });
    } else {
      isExitAllGeofences = true;
    }

    start += 'def enterGeofencesList = []; ';
    let isEnterAllGeofences = false;
    if (enterGeofence != '*') {
      enterGeofencesList.forEach((g) => {
        start += `enterGeofencesList.add(\"${g}\"); `;
      });
    } else {
      isEnterAllGeofences = true;
    }

    start += 'def tmpExitGeofencesList = new ArrayList(exitGeofencesList);';
    start += 'tmpExitGeofencesList.retainAll(diffGeofences);';

    start += 'def tmpEnterGeofencesList = new ArrayList(enterGeofencesList);';
    start += 'tmpEnterGeofencesList.retainAll(enteredGeofences);';

    start += 'if(inCondition == false ';

    if (startCond && startCond != '' && startCond != '()') {
      start += `&& (${startCond})`;
    }
    // start += ` && (prevGeofences.containsAll('${exitGeofence}') && !p.get('geofences.keyword').contains('${exitGeofence}'))`
    if (isExitAllGeofences) {
      start += ` && diffGeofences.size() > 0`;
    } else {
      start += ` && tmpExitGeofencesList.size() > 0`;
    }
    start += ') { ';
    subMetrics.forEach((metric) => {
      if (timeFields.includes(metric.field)) {
        if (metric.value === 'min') {
          start += `${metric.value}_${metric.field.replace('.', '_')} = p.get('${metric.field}'); `;
          start += `startTime = p.get('${metric.field}'); `;
        }
        if (metric.value === 'max') {
          start += `${metric.value}_${metric.field.replace('.', '_')} = p.get('${metric.field}'); `;
        }
      } else if (metric.value === 'sum' || metric.value === 'max' || metric.value === 'min') {
        start += `${metric.value}_${metric.field.replace('.', '_')} = p.get('${metric.field}'); `;
      } else if (metric.value === 'avg') {
        start += `${metric.value}_sum_${metric.field.replace('.', '_')} = p.get('${
          metric.field
        }'); `;
        start += `${metric.value}_${metric.field.replace('.', '_')} = p.get('${metric.field}'); `;
      }
    });
    if (isExitAllGeofences) {
      start += `exitGeofencesNames = String.join(\",\", diffGeofences); `;
    } else {
      start += `exitGeofencesNames = String.join(\",\", tmpExitGeofencesList); `;
    }
    start += `inCondition = true; ctr = 1; `;
    // start += `if(!prevGeofences.containsAll(p.get('geofences.keyword'))) {`
    if (isEnterAllGeofences) {
      start += `if(enteredGeofences.size() > 0) {`;
    } else {
      start += `if(tmpEnterGeofencesList.size() > 0) {`;
    }

    let finalize = ` inCondition = false;`;
    finalize += 'Map map = new HashMap();';
    subMetrics.forEach((metric) => {
      if (metric.value != 'count') {
        finalize += `map['${metric.id}'] = ${metric.value}_${metric.field.replace('.', '_')}; `;
      } else {
        finalize += `map['${metric.id}'] = ctr; `;
      }
    });
    finalize += `map['count'] = ctr; `;
    if (isEnterAllGeofences) {
      finalize += `enterGeofencesNames = String.join(\",\", enteredGeofences); `;
    } else {
      finalize += `enterGeofencesNames = String.join(\",\", tmpEnterGeofencesList); `;
    }
    finalize += `map['exitGeofences'] = String.valueOf(exitGeofencesNames); `;
    finalize += `map['enterGeofence'] = String.valueOf(enterGeofencesNames); `;
    finalize += `map['isEnterExitGeoEnable'] = true; `;
    finalize += 'state.res.add(map); ';

    start += finalize;
    start += `}`;
    start += `}`;

    let end = 'else if(inCondition == true ';
    // end += endCond;
    // end += `) && (!prevGeofences.containsAll(p.get('geofences.keyword')))`
    if (endCond && endCond != '' && endCond != '()') {
      end += `&& (${endCond})`;
    }
    if (isEnterAllGeofences) {
      end += ` && enteredGeofences.size() > 0`;
    } else {
      end += ` && tmpEnterGeofencesList.size() > 0 `;
    }
    end += `) { inCondition = false; ctr += 1; `;
    subMetrics.forEach((metric) => {
      if (timeFields.includes(metric.field)) {
        if (metric.value === 'max') {
          end += `${metric.value}_${metric.field.replace('.', '_')} = p.get('${metric.field}'); `;
          end += `endTime = p.get('${metric.field}'); `;
        }
      } else if (metric.value === 'sum') {
        end += `${metric.value}_${metric.field.replace('.', '_')} += p.get('${metric.field}'); `;
      } else if (metric.value === 'max') {
        end += `${metric.value}_${metric.field.replace('.', '_')} = Math.max(${
          metric.value
        }_${metric.field.replace('.', '_')}, p.get('${metric.field}')); `;
      } else if (metric.value === 'min') {
        end += `${metric.value}_${metric.field.replace('.', '_')} = Math.min(${
          metric.value
        }_${metric.field.replace('.', '_')}, p.get('${metric.field}')); `;
      } else if (metric.value === 'avg') {
        end += `${metric.value}_sum_${metric.field.replace('.', '_')} += p.get('${
          metric.field
        }'); `;
        end += `${metric.value}_${metric.field.replace('.', '_')} = avg_sum_${metric.field.replace(
          '.',
          '_'
        )} / ctr; `;
      } else {
        // raise error
        // will show empty fields
      }
    });
    end += 'Map map = new HashMap();';
    subMetrics.forEach((metric) => {
      if (metric.value != 'count') {
        end += `map['${metric.id}'] = ${metric.value}_${metric.field.replace('.', '_')}; `;
      } else {
        end += `map['${metric.id}'] = ctr; `;
      }
    });
    if (isEnterAllGeofences) {
      end += `enterGeofencesNames = String.join(\",\", enteredGeofences); `;
    } else {
      end += `enterGeofencesNames = String.join(\",\", tmpEnterGeofencesList); `;
    }
    end += `map['startTime'] = startTime.toString(); `;
    end += `map['endTime'] = endTime.toString(); `;
    end += `map['count'] = ctr; `;
    end += `map['exitGeofences'] = String.valueOf(exitGeofencesNames); `;
    end += `map['enterGeofence'] = String.valueOf(enterGeofencesNames); `;
    end += `map['isEnterExitGeoEnable'] = true; `;
    end += 'state.res.add(map); ';
    end += ' }';
    let inbetween = 'else if(inCondition == true) { ';

    subMetrics.forEach((metric) => {
      if (timeFields.includes(metric.field)) {
        // ignore
      } else if (metric.value === 'sum') {
        inbetween += `${metric.value}_${metric.field.replace('.', '_')} += p.get('${
          metric.field
        }'); `;
      } else if (metric.value === 'max') {
        inbetween += `${metric.value}_${metric.field.replace('.', '_')} = Math.max(${
          metric.value
        }_${metric.field.replace('.', '_')}, p.get('${metric.field}')); `;
      } else if (metric.value === 'min') {
        inbetween += `${metric.value}_${metric.field.replace('.', '_')} = Math.min(${
          metric.value
        }_${metric.field.replace('.', '_')}, p.get('${metric.field}')); `;
      } else if (metric.value === 'avg') {
        inbetween += `${metric.value}_sum_${metric.field.replace('.', '_')} += p.get('${
          metric.field
        }'); `;
      }
    });
    inbetween += ' ctr += 1; ';

    inbetween += ' }';

    combineScript += 'for(p in state.messages.values()) { ';
    combineScript += start;
    combineScript += end;
    combineScript += inbetween;
    combineScript += `prevGeofences = p.get('geofences.keyword'); `;
    combineScript += ' }';
    combineScript += 'return state.res;';
  } else {
    combineScript = 'def ctr = 0; ';
    combineScript += 'def inCondition = false; ';

    combineScript += 'def startTime = Instant.ofEpochMilli(new Date().getTime());';
    combineScript += 'def endTime = Instant.ofEpochMilli(new Date().getTime());';
    subMetrics.forEach((metric) => {
      if (timeFields.includes(metric.field)) {
        combineScript += `def ${metric.value}_${metric.field.replace('.', '_')}; `;
      } else {
        combineScript += `def ${metric.value}_${metric.field.replace('.', '_')} = 0.0; `;
        if (metric.value === 'avg') {
          combineScript += `def ${metric.value}_sum_${metric.field.replace('.', '_')} = 0.0; `;
        }
      }
    });

    let start = 'if(inCondition == false && (';
    start += startCond;
    start += ')) { ';
    subMetrics.forEach((metric) => {
      if (timeFields.includes(metric.field)) {
        if (metric.value === 'min') {
          start += `${metric.value}_${metric.field.replace('.', '_')} = p.get('${metric.field}'); `;
          start += `startTime = p.get('${metric.field}'); `;
        }
      } else if (metric.value === 'sum' || metric.value === 'max' || metric.value === 'min') {
        start += `${metric.value}_${metric.field.replace('.', '_')} = p.get('${metric.field}'); `;
      } else if (metric.value === 'avg') {
        start += `${metric.value}_sum_${metric.field.replace('.', '_')} = p.get('${
          metric.field
        }'); `;
      }
    });
    start += `inCondition = true; ctr = 1; }`;

    let end = 'else if(inCondition == true && (';
    end += endCond;
    end += `)) { inCondition = false; ctr += 1; `;
    subMetrics.forEach((metric) => {
      if (timeFields.includes(metric.field)) {
        if (metric.value === 'max') {
          end += `${metric.value}_${metric.field.replace('.', '_')} = p.get('${metric.field}'); `;
          end += `endTime = p.get('${metric.field}'); `;
        }
      } else if (metric.value === 'sum') {
        end += `${metric.value}_${metric.field.replace('.', '_')} += p.get('${metric.field}'); `;
      } else if (metric.value === 'max') {
        end += `${metric.value}_${metric.field.replace('.', '_')} = Math.max(${
          metric.value
        }_${metric.field.replace('.', '_')}, p.get('${metric.field}')); `;
      } else if (metric.value === 'min') {
        end += `${metric.value}_${metric.field.replace('.', '_')} = Math.min(${
          metric.value
        }_${metric.field.replace('.', '_')}, p.get('${metric.field}')); `;
      } else if (metric.value === 'avg') {
        end += `${metric.value}_sum_${metric.field.replace('.', '_')} += p.get('${
          metric.field
        }'); `;
        end += `${metric.value}_${metric.field.replace('.', '_')} = avg_sum_${metric.field.replace(
          '.',
          '_'
        )} / ctr; `;
      } else {
        // raise error
        // will show empty fields
      }
    });
    end += 'Map map = new HashMap();';
    // todo: change next line
    subMetrics.forEach((metric) => {
      if (metric.value != 'count') {
        end += `map['${metric.id}'] = ${metric.value}_${metric.field.replace('.', '_')}; `;
      } else {
        end += `map['${metric.id}'] = ctr; `;
      }
    });
    end += `map['startTime'] = startTime.toString(); `;
    end += `map['endTime'] = endTime.toString(); `;
    end += `map['count'] = ctr; `;
    end += `map['isEnterExitGeoEnable'] = false; `;
    end += `map['exitGeofences'] = \"\"; `;
    end += `map['enterGeofence'] = \"\"; `;
    end += 'state.res.add(map); ';
    end += ' }';
    let inbetween = 'else if(inCondition == true) { ';

    subMetrics.forEach((metric) => {
      if (timeFields.includes(metric.field)) {
        // ignore
      } else if (metric.value === 'sum') {
        inbetween += `${metric.value}_${metric.field.replace('.', '_')} += p.get('${
          metric.field
        }'); `;
      } else if (metric.value === 'max') {
        inbetween += `${metric.value}_${metric.field.replace('.', '_')} = Math.max(${
          metric.value
        }_${metric.field.replace('.', '_')}, p.get('${metric.field}')); `;
      } else if (metric.value === 'min') {
        inbetween += `${metric.value}_${metric.field.replace('.', '_')} = Math.min(${
          metric.value
        }_${metric.field.replace('.', '_')}, p.get('${metric.field}')); `;
      } else if (metric.value === 'avg') {
        inbetween += `${metric.value}_sum_${metric.field.replace('.', '_')} += p.get('${
          metric.field
        }'); `;
      }
    });
    inbetween += ' ctr += 1; ';

    inbetween += ' }';

    combineScript += 'for(p in state.messages.values()) { ';
    combineScript += start;
    combineScript += end;
    combineScript += inbetween;
    combineScript += ' }';
    combineScript += 'return state.res;';
  }

  current = {
    conditionalTerms: {
      scripted_metric: {
        init_script: initScript,
        map_script: mapScript,
        combine_script: combineScript,
        reduce_script: 'return states;',
      },
    },
  };
  window.sessionStorage.setItem(visId + 'viscondition', JSON.stringify(current));
  return current;
};
