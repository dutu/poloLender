import mongoose from 'mongoose';
import lowdb from 'lowdb'
import _ from 'lodash';

import { log } from "../../loggers"

const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

const mongodbURI = process.env['MONGODB_URI'];
const isMongo = !!mongodbURI;

let dbConn = null;
let db = null;

let LogtrailModel;

if (isMongo) {
  dbConn = mongoose.createConnection(mongodbURI, { useMongoClient: true }, (err) => {
    if (err) {
      console.log(`dbConn.logtrail error: ${err.message}`);
    } else {
      log.info(`dbConn.logtrail: mongodb connection successful`);
    }

  });

  let logtrailSchema = new Schema({}, { strict: false });
  LogtrailModel = dbConn.model('poloLenderLogtrail', logtrailSchema, 'poloLenderLogtrail');
  dbConn.on('error', function (err) {
    log.error(`dbConn.logtrail: ${err.message}`);
  });
} else {
  db = lowdb('logtrail.json');
}

export const saveLogTrailItem = function saveLogTrailItem(item, callback) {
  if (isMongo) {
    let logtrailItem = new LogtrailModel(item);
    logtrailItem.save()
      .then((result) => {
        _.isFunction(callback) && callback(null, result);
      })
      .catch((err) => {
        console.log(`saveLogtrailItem: ${err.message}`);
        _.isFunction(callback) && callback(err, null);
      });
  } else {
    if (!db.get('poloLenderLogtrail').value()) {
      db.defaults({ poloLenderLogtrail: [] })
        .write();
    }
    db.get('poloLenderLogtrail')
      .push(item)
      .write();
    _.isFunction(callback) && callback(null, item);
  }
};

export const getLogTrailItems = function getLogTrailItems(params, callback) {
  let endTime = new Date(params.endTime);
  let count = params.count || 0;
  let result = {
    errorMsg: '',
    isStartReached: true,
    buffer: [],
  };
  if (isMongo) {
    LogtrailModel.find({ timestamp: { $lt: endTime }})
      .sort('-timestamp')
      .limit(count + 1)
      .lean()
      .then((result) => {
        let data = result.map((item) => {
          item.timestamp = item.timestamp.getTime();
          delete item._id;
          delete item._v;
          return item;
        });
        _.isFunction(callback) && callback(null, data);
      })
      .catch((err) => {
        log.warning(`LogtrailModel.find: ${err.message}`);
        _.isFunction(callback) && callback(err.message, null);
      });
  } else {
    if (!db.get('poloLenderLogtrail').value()) {
      db.defaults({ poloLenderLogtrail: [] })
        .write();
    }
    let data = db.get('poloLenderLogtrail')
      .filter((item) => {
        return new Date(item.timestamp) < endTime;
      })
      .sortBy((item) => {
        return -(new Date(item.timestamp).getTime());
      })
      .take(count + 1)
      .value();
    _.isFunction(callback) && callback(null, data);
  }
};