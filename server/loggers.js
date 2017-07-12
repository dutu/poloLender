import winston from 'winston';
import _  from 'lodash';
import moment from 'moment';
import { isHeroku } from "./workers/poloLender/config"

require('winston-telegram').Telegram;

let customLogLevels = _.clone(winston.config.syslog.levels);
delete customLogLevels.emerg;
customLogLevels.report = 0;
let customLogColors = _.clone(winston.config.allColors);
customLogColors.report = 'cyan';
winston.addColors(customLogColors);

export let consoleLogger = new (winston.Logger)({
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
      consoleLogger[level](msg, meta);
    } else {
      let newLog = {
        lcl: lcl,
        at: Date.now(),
      };

      let lastLogIndex = _.findIndex(this.lastLogs, { lcl: lcl});
      if (lastLogIndex === -1 || newLog.at > this.lastLogs[lastLogIndex].at + llim * 1000) {
        delete meta.lcl;
        delete meta.llim;
        consoleLogger[level](msg, meta);
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
  transports: [
    new (winston.transports.LimiterTransport)(),
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
    exitOnError: false,
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
