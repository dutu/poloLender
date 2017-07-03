const winston = require('winston');
const _ = require('lodash');
const moment = require('moment');

let customLogLevels = _.clone(winston.config.syslog.levels);
delete customLogLevels.emerg;
customLogLevels.report = 0;
let customLogColors = _.clone(winston.config.allColors);
customLogColors.report = 'cyan';
winston.addColors(customLogColors);
let logger = new (winston.Logger)({
	levels: customLogLevels,
	transports: [
		new (winston.transports.Console)({
			colorize: 'all',
      timestamp: function () {
			  return moment().format('YYYY-MM-DD HH:mm:ss');
      },
		}),
  ]
});

module.exports = logger;