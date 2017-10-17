import mongoose from 'mongoose';
import lowdb from 'lowdb'
import moment from 'moment';
import _ from 'lodash';

import { log } from '../../loggers';

const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

const mongodbURI = process.env['MONGODB_URI'];
const isMongo = !!mongodbURI;
export const isHeroku = !!(process.env.DYNO || process.env.NODE_HOME && process.env.NODE_HOME.indexOf('heroku'));

export const configDefault = {
  port: 5000,
  authToken: {
    readOnly: '',
    readWrite: '',
    tokenExpiresOn: 'never',
  },
  isTradingEnabled: true,
  startDate: moment().utc().format(),
  startMessage: 'Join poloLender discussion/support group on telegram: https://t.me/cryptozone',
  reportEveryMinutes: 240,
  startBalance: {},
  offerMinRate: {},
  offerMaxAmount: {},
  lendingAdvisor: {
    server: 'safe-hollows.crypto.zone',
    accessToken: '',
  },
  apiKey: {
    key: '',
    secret: '',
  },
  telegramReports: {
    isEnabled: false,
    reportEveryMin: 240,
    telegramToken: '',
    telegramUserId: '',
  },
  maxApiCallsPerDuration: 8,
  apiCallsDurationMS: 1000,
  advancedSettings: {
    parallelApiExecution: false,
    nonceDelay: 500,
    muteNonceErrors: false,
  },
  debug: {
    debugApiCallDuration: false,
  },
  status: {
    lendingEngineStopTime: moment(0).utc().format(),
    lendingEngineStopReason: null,
  },
};

let dbConn = null;
let db = null;

let ConfigModel;

if (isMongo) {
  dbConn = mongoose.createConnection(mongodbURI, { useMongoClient: true }, (err) => {
    if (err) {
      log.error(`dbConn.config: ${err.message}`);
    } else {
      log.info(`dbConn.config: mongodb connection successful`);
    }

  });

  let configSchema = new Schema({}, { strict: false });
  configSchema.options.toJSON = {
    transform: function(doc, ret, options) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  };

  ConfigModel = dbConn.model('poloLenderConfig', configSchema, 'poloLenderConfig');
  dbConn.on('error', function (err) {
    log.error(`dbConn.config: ${err.message}`);
  });
} else {
  db = lowdb('config.json');
}

const deserializeConfig = function deserializeConfig(serializedConfig) {
  let config = _.cloneDeep(serializedConfig);
  config = _.defaultsDeep(config, configDefault);
  delete config._id;
  delete config.__v;
  return config;
};

export const getConfig = function getConfig(callback) {
  if (isMongo) {
    ConfigModel.findOne({}).lean()
      .then((doc) => {
        if (!doc) {
          return callback(new Error ('config not found'), null);
        }

        let config = deserializeConfig(doc);
        callback(null, config);
      })
      .catch((err) => {
        callback(err, null);
      });
  } else {
    let doc = db.get('poloLenderConfig').value();
    let err = !doc && new Error ('config not found') || null;
    let config = deserializeConfig(doc);
    callback(err, config);
  }
};

export const saveConfig = function saveConfig(config, callback) {
  let result;
  let newConfig = _.defaultsDeep(_.cloneDeep(config), configDefault);
  if (isMongo) {
    let config = new ConfigModel(newConfig);
    let upsertData = config.toJSON();
    delete upsertData._id;
    ConfigModel.update({}, newConfig, { upsert: true })
      .then((result) => {
        log.info(`saveConfig: OK`);
        _.isFunction(callback) && callback(null, newConfig);
      })
      .catch((err) => {
        log.error(`saveConfig: ${err.message}`);
        _.isFunction(callback) && callback(err, null);
      });
  } else {
    result = db.get('poloLenderConfig').value();
    if (!result) {
      db.defaults({ poloLenderConfig: newConfig })
        .write();
    } else {
      db.set('poloLenderConfig', newConfig)
        .write()
    }
    log.info(`saveConfig: OK`);
    _.isFunction(callback) && callback(null, newConfig);
  }
};
