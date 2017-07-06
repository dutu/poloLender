import moment from 'moment';
import Finance from 'financejs';
import Big from 'big.js';

import { log } from '../../loggers';

const finance = new Finance();

export const strAR = function strAR(str, length) {
  if (str.length > length)
    return str;
  let result = "                             " + str;
  result = result.substring(result.length - length);
  return result
};

export const msgRate = function msgRate(perDayProc) {
  let perDay = new Big(perDayProc).times(100).toFixed(6);
  let pa = new Big(perDayProc).times(365*100).toFixed(1);
  let apy = (finance.CI(parseFloat(pa) * 0.85 / 182, 1, 100, 182) - 100).toFixed(1);
  return `${perDay}%`;
};

export const msgApy = function msgRate(perDayProc) {
  let pa = new Big(perDayProc).times(365*100).toFixed(1);
  let apy = (finance.CI(parseFloat(pa) * 0.85 / 182, 1, 100, 182) - 100).toFixed(1);
  return `${apy}%`;
};

export const msgLoanReturned = function msgLoanReturned(element) {
  let canceledAC;
  let msg;
  let createdAt = moment.utc(element.date);
  canceledAC = {
    id: element.id,
    currency: element.currency,
    amount: strAR(new Big(element.amount).toFixed(8), 14),
    rate: new Big(element.rate).toFixed(8),
    period: element.period,
    createdAt: createdAt,
    expires: ""
  };
  let holdingTimeInSeconds = moment().diff(createdAt, "seconds");
  let htHours = Math.floor(holdingTimeInSeconds / 60 /60);
  let htMin = Math.floor((holdingTimeInSeconds - htHours * 60 *60) / 60);
  let htSec = holdingTimeInSeconds - htHours * 60 *60 - htMin * 60;
  let msgHt = `${htHours}h ${htMin}m ${htSec}s`;
  msg = "Loan returned #" + canceledAC.id + " " + canceledAC.currency + " " + canceledAC.amount + " at " + msgRate(canceledAC.rate) + `, holding time: ${msgHt}`;
  log.info(msg);
};

export const msgNewCredit = function msgNewCredit(element, config) {
  let utcOffset = moment.parseZone(config.startDate).utcOffset();
  let newAC, createdAt, expiresAt, expires, msg;
  createdAt = moment.utc(element.date);
  expiresAt = moment.utc(element.date).add(element.duration, "days");
  expires = expiresAt.fromNow();
  newAC = {
    id: element.id,
    currency: element.currency,
    amount: strAR(new Big(element.amount).toFixed(8), 14),
    rate: strAR(new Big(element.rate) .toFixed(8), 7),
    period: element.duration,
    createdAt: createdAt,
    expires: expires
  };
  msg = "Loan taken    #" + newAC.id + " " + newAC.currency + " " + newAC.amount + " at " + msgRate(newAC.rate) + ", created " + newAC.createdAt.utcOffset(utcOffset).format("YYYY-MM-DD HH:mm");
  msg += ", expires " + expires;
  log.info(msg);
};

