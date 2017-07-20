import mongoose from 'mongoose';
import lowdb from 'lowdb'
import _ from 'lodash';

const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

const mongodbURI = process.env['MONGODB_URI'];
const isMongo = !!mongodbURI;

let dbConn = null;
let db = null;

let LogtrailModel;

if (isMongo) {
  dbConn = mongoose.createConnection(mongodbURI, (err) => {
    if (err) {
      console.log(`dbConn error: ${err.message}`);
    } else {
      console.log(`dbConn: mongodb connection successful`);
    }

  });

  let logtrailSchema = new Schema({}, { strict: false });
  LogtrailModel = dbConn.model('poloLenderLogtrail', logtrailSchema, 'poloLenderLogtrail');
  dbConn.on('error', function (err) {
    log.crit(`dbConn: ${err.message}`);
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
