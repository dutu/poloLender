import _ from 'lodash';
import moment from 'moment';
import env from 'node-env-file';
import debug from 'debug';

import { log } from '../../loggers';
import { configDefault, getConfig, saveConfig } from './config';

const getOldConfig = function getOldConfig() {
  try {
    env('./.env', {verbose: false, overwrite: true});
  } catch (err) {
//    log.notice(err.message);
  }

  let oldConfig = _.cloneDeep(configDefault);
  let ev;
  let val;

  try {
    ev = 'POLOLENDER_APIKEY';
    let apiKey = JSON.parse(process.env[ev]);
    oldConfig.apiKey = {
      key: apiKey.key || '',
      secret: apiKey.secret || 'secret',
    };
  }
  catch (err) {
    oldConfig.apiKey  = {
      key: '',
      secret: '',
    };
  }
  log.info(`Migrating old config ${ev}`);

  try {
    ev = 'POLOLENDER_REPORTINTERVAL';
    val = Number(process.env[ev]);
    if(!_.isFinite(val)) {
      throw val;
    }
    else {
      oldConfig.reportEveryMinutes = val;
    }
  }
  catch (err) {
    debug(`${ev}=${process.env[ev]}`);
    oldConfig.reportEveryMinutes = configDefault.reportEveryMinutes;
  }
  log.info(`Migrating old config ${ev}=${oldConfig.reportEveryMinutes}`);

  try {
    ev = 'POLOLENDER_STARTTIME';
    oldConfig.startDate = moment(process.env[ev]);
    oldConfig.utcOffset = moment.parseZone(process.env[ev]).utcOffset();
  } catch (err) {
    oldConfig.startDate = configDefault.startDate;
    oldConfig.utcOffset = 0;
    debug(`${ev}=${process.env[ev]}`);
  }
  log.info(`Migrating old config ${ev}=${oldConfig.startDate}`);

  let startBalance;
  try {
    ev = 'POLOLENDER_STARTBALANCE';
    startBalance = JSON.parse(process.env[ev]);
  } catch (err) {
    debug(`${ev}=${process.env[ev]}`);
  }
  _.forEach(startBalance, function (value, key) {
    try {
      val = Number(value);
      if(!_.isFinite(val)) {
        throw val;
      } else {
        oldConfig.startBalance[key] = val.toString();
      }
    } catch (err) {
      debug(`${ev}=${process.env[ev]}`);
      throw err;
    }
  });
  val = JSON.stringify(oldConfig.startBalance);
  log.info(`Migrating old config ${ev}=${val}`);

  let lendMax;
  try {
    ev = 'POLOLENDER_LENDMAX';
    lendMax = JSON.parse(process.env[ev]);
  } catch (err) {
    debug(`${ev}=${process.env[ev]}`);
  }
  _.forEach(lendMax, function (value, key) {
    try {
      val = Number(value);
      if(!_.isFinite(val)) {
        throw val;
      } else {
        oldConfig.offerMaxAmount[key] = val.toString();
      }
    } catch (err) {
      debug(`${ev}=${process.env[ev]}`);
      throw err;
    }
  });
  val = JSON.stringify(oldConfig.offerMaxAmount);
  log.info(`Migrating old config ${ev}=${val}`);

  let minRate;
  try {
    ev = 'POLOLENDER_MINRATE';
    minRate = JSON.parse(process.env[ev]);
  } catch (err) {
    debug(`${ev}=${process.env[ev]}`);
  }
  _.forEach(minRate, function (value, key) {
    try {
      val = Number(value);
      if(!_.isFinite(val)) {
        throw val;
      } else {
        oldConfig.offerMinRate[key] = val.toString();
      }
    } catch (err) {
      debug(`${ev}=${process.env[ev]}`);
      throw err;
    }
  });
  val = JSON.stringify(oldConfig.offerMinRate);
  log.info(`Migrating old config ${ev}=${val}`);

  try {
    ev = 'POLOLENDER_STARTTIME';
    oldConfig.restartTime = moment(process.env[ev]);
  } catch (err) {
    debug(`${ev}=${process.env[ev]}`);
    oldConfig.restartTime = moment(0);
  }
  val = oldConfig.restartTime.utc().format();
  log.info(`Import old config ${ev}=${val}`);

  ev = 'POLOLENDER_TELEGRAM_TOKEN';
  oldConfig.telegramToken = process.env[ev];
  ev = 'POLOLENDER_TELEGRAM_USERID';
  oldConfig.telegramUserId = process.env[ev];

  ev = 'POLOLENDER_TELEGRAM_REPORTINTERVAL';
  val = Number(process.env[ev]);
  if (oldConfig.telegramToken && !_.isFinite(val)) {
    debug(`${ev}=${process.env[ev]}`);
  }

  oldConfig.telegramReportIntervalMin = val || oldConfig.reportEveryMinutes;
  if (oldConfig.telegramToken) {
    log.info(`Migrating old config ${ev}=${oldConfig.telegramReportIntervalMin}`);
  }

  ev = 'POLOLENDER_ADVISOR_TOKEN';
  oldConfig.lendingAdvisor.advisorToken = process.env[ev] || "";

  return oldConfig;
};

export const migrateConfig = function migrateConfig(callback) {
  getConfig((err, config) => {
    if (err) {
      if (err.message !== 'config not found') {
        log.error(`getConfig: ${err.message}`);
        return callback(err);
      }

      let oldConfig = getOldConfig();
      log.info(`migrateConfig: migrating config to database`);
      saveConfig(oldConfig, callback);
    }

    callback(null);
  });
};
