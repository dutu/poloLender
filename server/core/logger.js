const winston = require('winston');
const _ = require('lodash');

let customLogLevels = _.clone(winston.config.syslog.levels);
delete customLogLevels.emerg;
customLogLevels.report = 0;
let customLogColors = _.clone(winston.config.allColors);
customLogColors.report = 'cyan';
winston.addColors(customLogColors);
let logger = new (winston.Logger)({
	levels: customLogLevels,
  exitOnError: false,
	transports: [
		new (winston.transports.Console)({
			colorize: 'all'
		}),
  ]
});

module.exports = logger;