import { MAILING_PASS, MAILING_SERVICE, MAILING_USER } from '../../common';
import { Report } from '../models/report';
import { v4 as uuidv4 } from 'uuid';
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
var nodemailer = require('nodemailer');
const util = require('util');

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
    "<p>This email has been automatically sent by <strong>Safee</strong> (You don't have to reply).</p>\n" +
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

export function getData(object, row: Object[], agg: string, dataList: Object[][]) {
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
        newRow.push(JSON.stringify(obj));
        let lastBucket: boolean = true;
        for (let property in bucket) {
          if (bucket[property]['buckets']) {
            lastBucket = false;
            getData(bucket[property], newRow, property, dataList);
          }
        }
        if (lastBucket) {
          for (let property in bucket) {
            let value = bucket[property]['value'];
            if (value) {
              let key = property.toString();
              let obj = {
                [key]: value,
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
    workbook.creator = 'Safee Tracking';
    workbook.lastModifiedBy = 'Safee Tracking';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastPrinted = new Date();

    const worksheet = workbook.addWorksheet('report');

    let sortedColumns = [];
    // get the right sort of the columns from the rows
    if (dataList.length > 0) {
      for (let i = 0; i < dataList[0].length; i++) {
        let tmp = JSON.parse(dataList[0][i]);
        for (let i in tmp) {
          for (let j = 0; j < columns.length; j++) {
            if (i == columns[j].key) {
              sortedColumns.push(columns[j]);
            }
          }
        }
      }
    }
    worksheet.columns = sortedColumns;

    dataList.forEach((row) => {
      var newRow: string[] = [];
      for (let i = 0; i < row.length; i++) {
        let jsonObj = JSON.parse(row[i]);
        let key = sortedColumns[i].key;
        if (sortedColumns[i].type === 'date') {
          newRow.push(formatTimestamp(jsonObj[key]));
        } else {
          newRow.push(jsonObj[key]);
        }
      }
      worksheet.addRow(newRow);
    });

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

    let response = await client.transport.request({
      method: 'GET',
      path: `/${report.index}/_search`,
      body: JSON.stringify(request),
    });

    let columns = getColumns(JSON.parse(report.columns));
    let aggs = response.body.aggregations;
    for (let key in aggs) {
      getData(aggs[key], [], key, dataList);
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
