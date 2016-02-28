"use strict";

var _ = require("lodash");

var Workers = function() {
	var srv = require ("./../core/srv");
	var logger = srv.logger;
	var self = this;
    self.me = "workers";
    self.workers = [];

	var startWorker = function (worker) {
		if(_.isFunction(worker.start)) {
			
			worker.start();
			self.workers.push(worker);
		} else {
			logger.crit("%s: %s cannot not start", self.me, worker.me);
		}
	};

    self.start = function () {

	    var BfxTradeAdviser = require("./poloLender/poloLender");
	    var bfxTradeAdviser = new BfxTradeAdviser("bfxTradeAdviser");
	    startWorker(bfxTradeAdviser);

// add additional workers as above

    };

    self.closeGracefully = function (signal) {
        var graceTimeout = 100;
        process.exit();
        logger.notice("%s: received signal (%s) on %s, shutting down gracefully in %s ms'", self.me,
            signal,
            new Date().toString('T'),
            graceTimeout
        );
        setTimeout(function() {
            logger.notice('(x) forcefully shutting down',graceTimeout);
            process.exit();
        }, graceTimeout);

        self.workers.forEach(function (element, index, array) {
            if (typeof element.closeGracefully == 'function') {
                element.closeGracefully();
            }
        });
    };
};
module.exports = Workers;