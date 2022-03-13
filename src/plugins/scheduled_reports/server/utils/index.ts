import { Report } from '../models/report';
import { v4 as uuidv4 } from 'uuid';
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
var nodemailer = require('nodemailer');
const util = require('util');

const MAILING_SERVICE = process.env.APP_MAILING_SERVICE;
const MAILING_USER = process.env.APP_MAILING_USER;
const MAILING_PASS = process.env.APP_MAILING_PASS;

export function generateCronExpression(duration: string, unit: string): string {
  if (unit === 'second') {
    return '*/' + duration + ' * * * * *';
  } else if (unit === 'hour') {
    return '0 0 */' + duration + ' 1/1 * *';
  } else if (unit === 'day') {
    // 0 0 13 */5 * ? *
    return '0 0 12 */' + duration + ' * *';
  }
  //else if (unit === 'month')
  return '0 0 12 1 1/' + duration + ' *';
}

export function getMailContent(reportTitle: string): string {
  const content =
    '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n' +
    '<html xmlns="http://www.w3.org/1999/xhtml">\n' +
    '<head>\n' +
    '<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />\n' +
    '<title>Scheduled Report - ' +
    reportTitle +
    '</title>\n' +
    '</head>\n' +
    '<body>\n' +
    "<p>This email has been automatically sent by <strong>" + process.env.APP_TITLE + "</strong> (You don't have to reply).</p>\n" +
    '<p style="margin: 5px;">You can find your report as an attached file.</p>\n' +
    '<p><strong>Thanks!</strong></p>\n' +
    '<br/>\n' +
    '<img style="height: 100px;display:none;" src="cid:logo" alt="logo"/>\n' +
    '<div style="margin-top:100px;font-weight: normal;display: block;text-align: center; color: #888;line-height: 1.5;font-family: Roboto,Arial,sans-serif!important;font-size: 12px!important;">\n' +
    '</div>\n' +
    '</body>\n' +
    '</html>';
  return content;
}

export function formatTimestamp(timestamp) {
  var date = new Date(timestamp);
  let year = date.getFullYear();
  let month = date.getMonth();
  let day = date.getDate();
  let hour = date.getHours();
  let minute = date.getMinutes();
  let second = date.getSeconds();
  return year + '/' + month + '/' + day + ' ' + hour + ':' + minute + ':' + second;
}

export function getData(object, row: Object[], agg: string, dataList: Object[][], keys: string[]) {
  try {
    let buckets = object['buckets']; // json array
    if (buckets) {
      for (let i in buckets) {
        let bucket = buckets[i];
        let key: string = bucket['key'];
        let newRow = [...row];
        let objKey = agg.toString();
        let obj = {
          [objKey]: key,
        };
        if (keys.includes(objKey)) {
          newRow.push(JSON.stringify(obj));
        }
        let lastBucket: boolean = true;
        for (let property in bucket) {
          if (bucket[property]['buckets']) {
            lastBucket = false;
            getData(bucket[property], newRow, property, dataList, keys);
          }
        }
        if (lastBucket) {
          for (let property in bucket) {
            let value = bucket[property]['value'];
            if (value != null) {
              let key = property.toString();
              let obj = {
                [key]: value,
              };
              if (keys.includes(key) || property === 'conditionalTerms') {
                newRow.push(JSON.stringify(obj));
              }
            }
          }
          // todo: (for later) check for another SPECIAL CASES
          if (keys.includes('doc_count')) {
            let count = bucket['doc_count'];
            if (count != null) {
              let key = 'doc_count';
              let obj = {
                [key]: count,
              };
              newRow.push(JSON.stringify(obj));
            }
          }
          dataList.push(newRow);
        }
      }
    }
  } catch (e) {
    console.log(e);
  }
}

function checkForConditionalTerms(dataList: any[]) {
  dataList.forEach(item => {
    if (Object.keys(item).includes('conditionalTerms')) {
      return true;
    }
  })
  return false;
}

function expandRow(row) {
  let newRow = []
  let rowNoConditionalTerms = {}
  let conditionalTermsNdx = -1

  for(let i = 0; i < row.length; i ++) {
    let tmpRow = JSON.parse(row[i]);
    let keys = Object.keys(tmpRow);
    if (keys[0] != 'conditionalTerms') {
      // rowNoConditionalTerms.push({
      //   [keys[0]]: tmpRow[keys[0]],
      // })
      rowNoConditionalTerms[keys[0]] = tmpRow[keys[0]]
    }
    else {
      conditionalTermsNdx = i
    }
  }
  
  let regConTermExpression = /col-(.*)-(.*)/
  if(conditionalTermsNdx != -1) {
    let conTerms = JSON.parse(row[conditionalTermsNdx]).conditionalTerms[0];
    for(let j = 0; j < conTerms.length; j ++) {
      let conTermKeys = Object.keys(conTerms[j])
      let rowWithConditionalTerms = {}
      for(let i = 0; i < conTermKeys.length; i ++) {
        let match = conTermKeys[i].match(regConTermExpression)
        if(match) {
          rowWithConditionalTerms[match[2]] = conTerms[j][conTermKeys[i]]
          // rowWithConditionalTerms.push({
          //   [match[2]]: conTerms[j][conTermKeys[i]]
          // })
        }
      }
      newRow.push({...rowNoConditionalTerms, ...rowWithConditionalTerms})
    }
    return newRow;
  }
  else {
    newRow.push({...rowNoConditionalTerms})
    return newRow;
  }
}

export async function createExcel(
  title: string,
  gte: Date,
  lte: Date,
  dataList: string[][],
  filePath: string,
  columns
) {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = process.env.APP_TITLE;
    workbook.lastModifiedBy = process.env.APP_TITLE;
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastPrinted = new Date();

    const worksheet = workbook.addWorksheet('report');

    let excelRows = []
    dataList.forEach(rowJson => {
      excelRows = excelRows.concat(expandRow(rowJson))
    })

    worksheet.columns = columns;

    for(let i = 0; i < excelRows.length; i ++) {
      let newRow: string[] = [];
      for(let j = 0; j < columns.length; j ++) {
        if (columns[j].type === 'date' && !isNaN(excelRows[i][columns[j].key])) {
          newRow.push(formatTimestamp(excelRows[i][columns[j].key]));
        } else {
          newRow.push(excelRows[i][columns[j].key]);
        }
      }
      
      worksheet.addRow(newRow);
    };
    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow(['Title', title]);
    worksheet.addRow(['From', gte]);
    worksheet.addRow(['To', lte]);

    await workbook.xlsx.writeFile(filePath);
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

export function getColumns(cols) {
  let columns = [];
  for (let i = 0; i < cols.length; i++) {
    columns.push({
      header: cols[i].name,
      key: cols[i].key,
      type: cols[i].type,
    });
  }
  return columns;
}

export async function start(report: Report, client) {
  let dataList: string[][] = [];

  let gte = new Date();
  let lte = new Date();

  try {
    let request = JSON.parse(report.request);
    let filters = request.query.bool.filter;
    let rangeIdx = 0;
    for (let i = 0; i < filters.length; i++) {
      let jsonObject = filters[i];
      if (jsonObject['range']) {
        rangeIdx = i;
        break;
      }
    }
    if (report.timeFilterUnit === 'hour') {
      gte.setHours(gte.getHours() - report.timeFilter);
    } else if (report.timeFilterUnit === 'day') {
      gte.setDate(gte.getDate() - report.timeFilter);
    } else if (report.timeFilterUnit === 'month') {
      gte.setMonth(gte.getMonth() - report.timeFilter);
    }

    if (request.query.bool.filter[rangeIdx].range.timestamp) {
      request.query.bool.filter[rangeIdx].range.timestamp.gte = gte;
      request.query.bool.filter[rangeIdx].range.timestamp.lte = lte;
    } else if (request.query.bool.filter[rangeIdx].range.messageTime) {
      request.query.bool.filter[rangeIdx].range.messageTime.gte = gte;
      request.query.bool.filter[rangeIdx].range.messageTime.lte = lte;
    } else if (request.query.bool.filter[rangeIdx].range.fireTime) {
      request.query.bool.filter[rangeIdx].range.fireTime.gte = gte;
      request.query.bool.filter[rangeIdx].range.fireTime.lte = lte;
    } else if (request.query.bool.filter[rangeIdx].range.enterTime) {
      request.query.bool.filter[rangeIdx].range.enterTime.gte = gte;
      request.query.bool.filter[rangeIdx].range.enterTime.lte = lte;
    }

    console.log(gte);
    console.log(lte);

    let response = await client.transport.request({
      method: 'GET',
      path: `/${report.index}/_search`,
      body: JSON.stringify(request),
    });

    let columns = getColumns(JSON.parse(report.columns));

    let keys: string[] = [];
    columns.forEach((column) => {
      keys.push(column.key);
    });

    let aggs = response.body.aggregations;
    for (let key in aggs) {
      getData(aggs[key], [], key, dataList, keys);
    }

    // new folder absolute path
    // todo: move to config
    const dirPath = 'tmp';

    // create directory if not found
    const makeDir = util.promisify(fs.mkdir);
    const createDirectory = async (path) => {
      await makeDir(path).catch((err) => {
        // If promise gets rejected
        console.log(`Error occurs, 
        Error code -> ${err.code},
        Error No -> ${err.errno}`);
      });
    };

    await createDirectory(dirPath);

    let uniqueName = uuidv4();
    const filePath = path.join(dirPath, `/${uniqueName}.xlsx`);
    if (createExcel(report.title, gte, lte, dataList, filePath, columns)) {
      var mail = nodemailer.createTransport({
        service: MAILING_SERVICE,
        auth: {
          user: MAILING_USER,
          pass: MAILING_PASS,
        },
      });

      var mailOptions = {
        from: MAILING_USER,
        to: report.receiver,
        subject: 'Scheduled Report - ' + report.title,
        html: getMailContent(report.title),
        attachments: [
          {
            filename: report.title + '.xlsx',
            path: filePath,
          },
        ],
      };

      await mail.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
          // delete the file
          fs.unlink(filePath, function (err) {
            if (err) return console.log(err);
            console.log('file deleted successfully');
          });
        }
      });
    }
  } catch (e) {
    console.log(e);
  }
}


export async function startAllScheduledReports(internalUser, schedule) {
  const allReports = await internalUser.search({
    index: "scheduled_reports",
    body: {
      query: {
        match_all: {},
      },
      size: 1000,
    },
  });

  allReports.body.hits.hits.forEach(
    (element: any) => {
      let report: Report = {
        id: element._source.id,
        username: element._source.id,
        cronSchedule: element._source.id,
        receiver: element._source.receiver,
        index: element._source.index,
        request: element._source.request,
        visualizationId: element._source.visualizationId,
        title: element._source.title,
        duration: element._source.duration,
        durationUnit: element._source.durationUnit,
        timeFilter: element._source.timeFilter,
        timeFilterUnit: element._source.timeFilterUnit,
        columns: element._source.columns,
      };
      schedule.scheduleJob(element._source.id, element._source.cronSchedule, function () {
        start(report, internalUser);
      });
    }
  );
}