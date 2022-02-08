let timeFields = ['messageTime', 'timestamp', 'alarms.fireTime']
let arrayFields = ['geofences.keyword']

const getNumOfBuckets = (aggs: any[]) => {
    let ctr = 0;
    for(let i = 0; i < aggs.length; i ++) {
        if(aggs[i].schema === 'bucket') {
            ctr ++
        }
    }
    return ctr;
}

export const createQuery = async (conditions: {start: string, end: string}, subMetrics: any[], aggs: any[]) => {
    subMetrics = []
    if(aggs)
    {
        let numOfPreviousCols = getNumOfBuckets(aggs);
        for(let i = 0; i < aggs.length; i ++) {
            if(aggs[i].schema === 'metric' && aggs[i].type !== 'count') {
                let value = aggs[i].type
                let field = aggs[i].params.field
                let id = `col-${numOfPreviousCols ++}-${aggs[i].id}`
                subMetrics.push({
                    id,
                    value,
                    field
                })
            }
        }
    }
    console.log(subMetrics)

    let conditionsFields = [];
    let started = false
    let tmpStr = '`'
    let startCond = new String(conditions.start)
    let endCond = new String(conditions.end)
    for(let i = 0; i < startCond.length; i ++) {
        if(started && startCond[i] === '}') {
            tmpStr += startCond[i]
            conditionsFields.push(new String(tmpStr))
            started = false
        }
        else if (started && startCond[i] !== '}') {
            tmpStr += startCond[i]
        }
        else if (!started && startCond[i] === '{') {
            tmpStr = ''
            tmpStr += startCond[i]
            started = true;
        }
    }
    started = false
    for(let i = 0; i < endCond.length; i ++) {
        if(started && endCond[i] === '}') {
            tmpStr += endCond[i]
            conditionsFields.push(new String(tmpStr))
            started = false
        }
        else if (started && endCond[i] !== '}') {
            tmpStr += endCond[i]
        }
        else if (!started && endCond[i] === '{') {
            tmpStr = ''
            tmpStr += endCond[i]
            started = true;
        }
    }
    
    conditionsFields.forEach(element => {
        startCond = startCond.replace(`${element}`, `p.get('${element.substring(1, element.length - 1)}')`)
    });
    conditionsFields.forEach(element => {
        endCond = endCond.replace(`${element}`, `p.get('${element.substring(1, element.length - 1)}')`)
    });
    let current = {};
    console.log(startCond)
    let initScript = 'state.messages = new TreeMap(); ' +
        'state.res = new ArrayList(); ';
    let mapScript = 'Map map = new HashMap(); ';
    conditionsFields.forEach(condition => {
        mapScript += `map['${condition.substring(1, condition.length - 1)}'] = doc['${condition.substring(1, condition.length - 1)}'].value; `;
    });

    mapScript += `map['messageTime'] = doc['messageTime'].value; `;
    subMetrics.forEach(metric => {
        mapScript += `map['${metric.field}'] = doc['${metric.field}'].value; `;
    });
    mapScript += `map['plateNo.keyword'] = doc['plateNo.keyword'].value; `;
    
    mapScript += 'state.messages.put(doc.messageTime.value, map); ';

    let combineScript = "def ctr = 0; ";
    combineScript += "def inCondition = false; ";
    
    combineScript += "def startTime = Instant.ofEpochMilli(new Date().getTime());";
    combineScript += "def endTime = Instant.ofEpochMilli(new Date().getTime());";
    subMetrics.forEach(metric => {
        if(timeFields.includes(metric.field)) {
            combineScript += `def ${metric.value}_${metric.field.replace(".", "_")}; `;
        }
        else {
            combineScript += `def ${metric.value}_${metric.field.replace(".", "_")} = 0.0; `;
            if(metric.value === "avg") {
                combineScript += `def ${metric.value}_sum_${metric.field.replace(".", "_")} = 0.0; `;
            }
        }
    });

    let start = "if(inCondition == false && (";
    start += startCond;
    start += ')) { ';
    subMetrics.forEach(metric => {
        if(timeFields.includes(metric.field)) {
            if(metric.value === "min") {
                start += `${metric.value}_${metric.field.replace(".", "_")} = p.get('${metric.field}'); `;
            }
        }
        
        else if(metric.value === "sum" || metric.value === "max" || metric.value === "min") {
            start += `${metric.value}_${metric.field.replace(".", "_")} = p.get('${metric.field}'); `;
        }
        else if(metric.value === "avg") {
            start += `${metric.value}_sum_${metric.field.replace(".", "_")} = p.get('${metric.field}'); `;
        }
    });
    start += `inCondition = true; ctr = 1; startTime = p.get('messageTime')}`;

    let end = "else if(inCondition == true && (";
    end += endCond;
    end += `)) { inCondition = false; ctr += 1; endTime = p.get('messageTime'); `;
    subMetrics.forEach(metric => {
        if(timeFields.includes(metric.field)) {
            if(metric.value === "max") {
                end += `${metric.value}_${metric.field.replace(".", "_")} = p.get('${metric.field}'); `;
            }
        }
        else if(metric.value === "sum") {
            end += `${metric.value}_${metric.field.replace(".", "_")} += p.get('${metric.field}'); `;
        }
        else if(metric.value === "max") {
            end += `${metric.value}_${metric.field.replace(".", "_")} = Math.max(${metric.value}_${metric.field.replace(".", "_")}, p.get('${metric.field}')); `;
        }
        else if(metric.value === "min") {
            end += `${metric.value}_${metric.field.replace(".", "_")} = Math.min(${metric.value}_${metric.field.replace(".", "_")}, p.get('${metric.field}')); `;
        }
        else if(metric.value === "avg") {
            end += `${metric.value}_sum_${metric.field.replace(".", "_")} += p.get('${metric.field}'); `;
            end += `${metric.value}_${metric.field.replace(".", "_")} = avg_sum_${metric.field.replace(".", "_")} / ctr; `;
        }
        else {
            // raise error
        }
    });
    end += 'Map map = new HashMap();';
    // todo: change next line
    end += `map['plateNo.keyword'] = p.get('plateNo.keyword');`;
    subMetrics.forEach(metric => {
        end += `map['${metric.id}'] = ${metric.value}_${metric.field.replace(".", "_")}; `;
    });
    end += `map['startTime'] = startTime.toString(); `;
    end += `map['endTime'] = endTime.toString(); `;
    end += `map['count'] = ctr; `;
    end += 'state.res.add(map); ';
    end += ' }';
    let inbetween = "else if(inCondition == true) { ";

    subMetrics.forEach(metric => {
        if(timeFields.includes(metric.field)) {
            // ignore
        }
        else if(metric.value === "sum") {
            inbetween += `${metric.value}_${metric.field.replace(".", "_")} += p.get('${metric.field}'); `;
        }
        else if(metric.value === "max") {
            inbetween += `${metric.value}_${metric.field.replace(".", "_")} = Math.max(${metric.value}_${metric.field.replace(".", "_")}, p.get('${metric.field}')); `;
        }
        else if(metric.value === "min") {
            inbetween += `${metric.value}_${metric.field.replace(".", "_")} = Math.min(${metric.value}_${metric.field.replace(".", "_")}, p.get('${metric.field}')); `;
        }
        else if(metric.value === "avg") {
            inbetween += `${metric.value}_sum_${metric.field.replace(".", "_")} += p.get('${metric.field}'); `;
        }
    });
    inbetween += " ctr += 1; "
    

    inbetween += " }";

    combineScript += "for(p in state.messages.values()) { ";
    combineScript += start;
    combineScript += end;
    combineScript += inbetween;
    combineScript += " }"
    combineScript += 'return state.res;';
    current = {
        "conditionalTerms": {
            "scripted_metric": {
                "init_script": initScript,
                "map_script": mapScript,
                "combine_script": combineScript,
                "reduce_script" : "return states;"
            }
        }
    }
    window.sessionStorage.setItem('viscondition', JSON.stringify(current));
    return current;
}