import winston from 'winston';
import _  from 'lodash';
import moment from 'moment';
import { v4 as uuid } from 'uuid';

import { io } from './httpServer';
import { isHeroku } from "./workers/poloLender/config";
import { saveLogTrailItem } from './workers/poloLender/logtrail';


require('winston-telegram').Telegram;

let customLogLevels = _.clone(winston.config.syslog.levels);
delete customLogLevels.emerg;
customLogLevels.report = 0;
let customLogColors = _.clone(winston.config.allColors);
customLogColors.report = 'cyan';
winston.addColors(customLogColors);

class IoSocketTransport extends winston.Transport {
  constructor(options) {
    super(options);
    this.name = 'IoSocketTransport';
    this.io = options.io;
    this.eventName = options.eventName;
  }

  log(level, msg, meta, callback) {
    if (io) {
      io.sockets.emit(this.eventName, level, msg, meta);
    }
    callback(null, true);
  }
}

winston.transports.IoSocketTransport = IoSocketTransport;

class DbTransport extends winston.Transport {
  constructor(options) {
    super(options);
    this.name = 'DbTransport';
  }

  log(level, msg, meta, callback) {
    let logtrailItem = {
      level,
      msg,
      uuid: meta.uuid,
      timestamp: new Date(meta.timestamp),
    };
    saveLogTrailItem(logtrailItem);
    callback(null, true);
  }
}

winston.transports.DbTransport = DbTransport;

let customLogger = new (winston.Logger)({
	levels: customLogLevels,
	transports: [
    new (winston.transports.IoSocketTransport)({
      io: io,
      eventName: 'logtrail',
    }),
    new (winston.transports.DbTransport)({
    }),
  ]
});

let consoleLogger = new (winston.Logger)({
  levels: customLogLevels,
  transports: [
    new (winston.transports.Console)({
      colorize: 'all',
        timestamp: function () {
          return !isHeroku && moment().format('YYYY-MM-DD HH:mm:ss') || '';
        },
    }),
  ]
});

class LimiterTransport extends winston.Transport {
  constructor(options) {
    super(options);
    this.name = 'LimiterTransport';
    this.level = options && options.level || 'info';
    this.lastLogs = [];
  }

  log(level, msg, meta, callback) {
    let lcl = meta && meta.lcl || null;
    let llim = meta && meta.llim || 0;
    if (!lcl || llim === 0) {
      customLogger[level](msg, meta);
      consoleLogger[level](msg);
    } else {
      let newLog = {
        lcl: lcl,
        at: Date.now(),
      };

      let lastLogIndex = _.findIndex(this.lastLogs, { lcl: lcl});
      if (lastLogIndex === -1 || newLog.at > this.lastLogs[lastLogIndex].at + llim * 1000) {
        delete meta.lcl;
        delete meta.llim;
        customLogger[level](msg, meta);
        consoleLogger[level](msg);
        if (lastLogIndex === -1) {
          this.lastLogs.push(newLog);
        } else {
          this.lastLogs.splice(lastLogIndex, 1, newLog);
        }
      }
    }

    callback(null, true);
  }
}

winston.transports.LimiterTransport = LimiterTransport;

export let log = new winston.Logger({
  levels: customLogLevels,
  exitOnError: true,
  transports: [
    new (winston.transports.LimiterTransport)(),
  ],
  rewriters: [
    function (level, msg, meta) {
      meta.uuid = uuid();
      meta.timestamp = Date.now();
      meta.level = level;
      return meta;
    },
  ]
});

export const addTelegramLogger = function addTelegramLogger(telegramToken, telegramUserId) {
  if (!telegramToken || !telegramUserId) {
    return;
  }

  let customLogLevels = _.clone(winston.config.syslog.levels);
  delete customLogLevels.emerg;
  customLogLevels.report = 0;
  return new (winston.Logger)({
    levels: customLogLevels,
    exitOnError: function (err) {
      switch (err.context) {
        case 400: {
          log.error(`telegramLogger: Telegram server returned an error. Please check your Telegram userId`);
          break;
        }
        case 401:
        case 404: {
          log.error(`telegramLogger: Telegram server returned an error. Please check your Telegram token`);
          break;
        }
        default: {
          log.error(`telegramLogger: Telegram server returned an error ${err.context}`);
        }
      }
      return false;
    },
    transports: [
      new (winston.transports.Telegram)({
        token : telegramToken,
        chatId : telegramUserId,
        level: 'report',
        handleExceptions: true,
      }),
    ]
  });
};
