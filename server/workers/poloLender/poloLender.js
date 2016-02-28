"use strict";

var _ = require('lodash');
var Big = require ("big.js");
var moment = require("moment");
var debug = require("debug")("poloLender");
var async = require ("async");
var Bitfinex = require('bitfinex');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var srv = require ("../../core/srv");

var BfxTradeAdviser = function(name) {
	var self = this;
	self.me = name;

	var logger = srv.logger;
	var io = srv.io;
	var bfxPrivate;

	var status = {
		restarted: Date.now(),
		count: 0,
		lastRun: {
			hb: Date.now()
		}
	};

	var configDefault = {
		hbTimerMinutes: 0.25
	};
	var config = {};

	_.assign(config, configDefault);

	try {
		var apiKey = JSON.parse(process.env[self.me.toUpperCase() + "_APIKEY"]);
		self.apiKey = {
			key: apiKey.key || "",
			secret: apiKey.secret || "secret"
		};

	}
	catch (err) {
		self.apiKey  = {
			key: "",
			secret: ""
		};
	}

	var initBitfinexComm = function() {

		self.informTraders = function () {

			var clients = srv.io.sockets.clients();
			_.forEach(clients.connected, function(client) {
				client.emit('send:loanOfferParameters', self.ioLoanOfferParameters);
			});
		};

		bfxPrivate = new Bitfinex(self.apiKey.key, self.apiKey.secret);

		status.count++;
		var statusInfo = {
			restarted: moment(status.restarted).format(),
			lastHB: moment(status.lastRun.hb).format(),
			count: status.count.toFixed()
		};
		logger.info("%s: %s", self.me, statusInfo);
		var timeout = parseInt(new Big(config.hbTimerMinutes).times(60*1000).toFixed(0));
		status.lastRun.hb = Date.now();
		if (srv.ws) {
			var string = JSON.stringify(statusInfo);
			srv.ws.send(string);
		}
		setTimeout(execTask, 0);
	};

	var execTask = function() {

		async.forever(function (next){
				async.series({
						getBalance: function(cb) {
							bfxPrivate.wallet_balances(function (err, result) {
								var wallet;
								if(err)
									return cb(err, err.message);
								wallet = _.find(result, {currency: "btc", type: "trading"});
								if (typeof wallet !== "undefined") {
									walletTrading.available.BTC= wallet.available || "0";
									walletTrading.amount.BTC= wallet.amount || "0";
								}
								wallet = _.find(result, {currency: "usd", type: "deposit"});
								if (typeof balUSD !== "undefined") {
									walletTrading.available.USD = wallet.available || "0";
									walletTrading.amount.USD = wallet.amount || "0";
								}
								cb(null, "OK");
							});
							bfxPrivate.wallet_balances(function (err, result) {
								var wallet;
								if(err)
									return cb(err, err.message);
								wallet = _.find(result, {currency: "btc", type: "trading"});
								if (typeof wallet !== "undefined") {
									walletTrading.available.BTC= wallet.available || "0";
									walletTrading.amount.BTC= wallet.amount || "0";
								}
								wallet = _.find(result, {currency: "usd", type: "deposit"});
								if (typeof balUSD !== "undefined") {
									walletTrading.available.USD = wallet.available || "0";
									walletTrading.amount.USD = wallet.amount || "0";
								}
								cb(null, "OK");
							});
						},
						report: function (callback) {
						//	report();
							callback(null, "OK");
						}
					},
					function(err, results) {
						//console.log("done");
						lastRun.speedCount++;
						next();
					});
			},
			function(){
				// we never call next with parameter, so we should never arrive here
			});


	};

	self.start = function() {
		status.restarted = moment();
		initBitfinexComm();
		//execTask();
	};

	self.stop = function() {
	};
};

module.exports = BfxTradeAdviser;
