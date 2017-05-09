"use strict";

const ioClient = require('socket.io-client');
const _ = require('lodash');
const Big = require ('big.js');
const moment = require('moment');
const async = require ('async');
const debug = require('debug')('pololender');
const Bitfinex = require('bitfinex');
const semver = require('semver');
const Poloniex = require('poloniex-api-node');
const pjson = require('../../../package.json');
let srv = require ('../../core/srv');
let io = srv.io;

const PoloLender = function(name) {
	const self = this;
	self.me = name;

  let browserData = {};
	var logger = srv.logger;
	var poloPrivate;
	var socket;

	let currencies = [];
	let newCurrencies = [];

	var status = {
		restarted: Date.now(),
		activeLoansCount: 0,
		count: 0,
		lastRun: {
			report: moment(0),
		},
		wmr: {}
	};
	let lastClientMessage = '';
	var anyCanceledOffer,
		anyNewLoans = {};
	var activeLoans = [],
		activeOffers = {},
		anyChangedLoans = {},
		availableFunds = {}, // available funds from balance
		depositFunds = {},      // available funds from balance
		ev, val;

  let ratesBTC = {
    BTC: '1',
  };
  let rateBTCUSD;
	var advisorInfo = {};
	var clientMessage ={};

	var configDefault = {
		startDate: "",
		reportEveryMinutes: 5,
		minOrderSize: "0.01",
		startBalance: {},
		restartTime: moment(),
		offerMinRate: {},
		offerMaxAmount: {},
		advisor: "safe-hollows.crypto.zone",
    maxApiCallsPerDuration: 7,
    apiCallsDurationMS: 1000,
	};
	var config = {};

	let apiCallTimes = [];
	let waitOneMinute = null;
	let callsLast100 = [];

	_.assign(config, configDefault);

	var bfxPublic = new Bitfinex();

	var setConfig = function setConfig() {
		advisorInfo.time = "";
		// API keys
		try {
			ev = self.me.toUpperCase() + "_APIKEY";
			var apiKey = JSON.parse(process.env[ev]);
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
			logger.alert(`Environment variable ${ev}  is invalid. Please see documentation at https://github.com/dutu/poloLender/`);
			debug(`${ev}=${process.env[ev]}`);
			logger.alert(`Application will now exit. Correct the environment variable ${ev} and start the application again`);
			process.exit(1);
		}

/*
		ev = self.me.toUpperCase() + "_ADVISOR";
		config.advisor = process.env[ev];
		if (!config.advisor) {
			logger.error(`Environment variable ${ev} is invalid. Please see documentation at https://github.com/dutu/poloLender/`);
			config.advisor = configDefault.advisor
		}
		logger.info(`Using ${ev}=${config.advisor}`);
*/

		try {
			ev = self.me.toUpperCase() + "_REPORTINTERVAL";
			val = Number(process.env[ev]);
			if(!_.isFinite(val)) {
				throw val;
			}
			else {
				config.reportEveryMinutes = val;
			}
		}
		catch (err) {
			logger.error(`Environment variable ${ev} is invalid (should be a number). Please see documentation at https://github.com/dutu/poloLender/`);
			debug(`${ev}=${process.env[ev]}`);
			config.reportEveryMinutes = configDefault.reportEveryMinutes;
		}
		logger.info(`Using ${ev}=${config.reportEveryMinutes}`);

		try {
			ev = self.me.toUpperCase() + "_STARTTIME";
			config.startDate = moment(process.env[ev]);
		} catch (err) {
			logger.error(`Environment variable ${ev} is invalid (should be a date). Please see documentation at https://github.com/dutu/poloLender/`);
			config.startDate = configDefault.startDate;
			debug(`${ev}=${process.env[ev]}`);

		}
		logger.info(`Using ${ev}=${config.startDate}`);

		try {
			ev = self.me.toUpperCase() + "_STARTBALANCE";
			var startBalance = JSON.parse(process.env[ev]);
		} catch (err) {
			logger.error(`Environment variable ${ev} is invalid. Please see documentation at https://github.com/dutu/poloLender/`);
			debug(`${ev}=${process.env[ev]}`);
		}
		_.forEach(startBalance, function (value, key) {
      try {
        val = Number(value);
        if(!_.isFinite(val)) {
          throw val;
        } else {
          config.startBalance[key] = val.toString();
        }
      } catch (err) {
        logger.error(`Environment variable ${ev} is invalid. Please see documentation at https://github.com/dutu/poloLender/`);
        debug(`${ev}=${process.env[ev]}`);
        throw err;
      }
		});
		val = JSON.stringify(config.startBalance);
		logger.info(`Using ${ev}=${val}`);

		var lendMax;
		try {
			ev = self.me.toUpperCase() + "_LENDMAX";
			lendMax = JSON.parse(process.env[ev]);
		} catch (err) {
			logger.error(`Environment variable ${ev} is invalid. Please see documentation at https://github.com/dutu/poloLender/`);
			debug(`${ev}=${process.env[ev]}`);
		}
    _.forEach(lendMax, function (value, key) {
      try {
        val = Number(value);
        if(!_.isFinite(val)) {
          throw val;
        } else {
          config.offerMaxAmount[key] = val.toString();
        }
      } catch (err) {
        logger.error(`Environment variable ${ev} is invalid. Please see documentation at https://github.com/dutu/poloLender/`);
        debug(`${ev}=${process.env[ev]}`);
        throw err;
      }
		});
		val = JSON.stringify(config.offerMaxAmount);
		logger.info(`Using ${ev}=${val}`);

		var minRate;
		try {
			ev = self.me.toUpperCase() + "_MINRATE";
			minRate = JSON.parse(process.env[ev]);
		} catch (err) {
			logger.error(`Environment variable ${ev} is invalid. Please see documentation at https://github.com/dutu/poloLender/`);
			debug(`${ev}=${process.env[ev]}`);
		}
    _.forEach(minRate, function (value, key) {
      try {
        val = Number(value);
        if(!_.isFinite(val)) {
          throw val;
        } else {
          config.offerMinRate[key] = val.toString();
        }
      } catch (err) {
        logger.error(`Environment variable ${ev} is invalid. Please see documentation at https://github.com/dutu/poloLender/`);
        debug(`${ev}=${process.env[ev]}`);
        throw err;
      }
		});
		val = JSON.stringify(config.offerMinRate);
		logger.info(`Using ${ev}=${val}`);

		try {
			ev = self.me.toUpperCase() + "_STARTTIME";
			config.restartTime = moment(process.env[ev]);
		} catch (err) {
			logger.error(`Environment variable ${ev} is invalid. Please see documentation at https://github.com/dutu/poloLender/`);
			debug(`${ev}=${process.env[ev]}`);
			config.restartTime = moment(0);
		}
		val = config.restartTime.utc().format();
		logger.info(`Using ${ev}=${val}`);
	};

	var strAR = function strAR(str, length) {
		if (str.length > length)
			return str;
		var result = "                             " + str;
		result = result.substring(result.length - length);
		return result
	};

	var msgRate = function msgRate(perDayProc) {
		let perDay = new Big(perDayProc).times(100).toFixed(6);
		let perYear = new Big(perDayProc).times(365*100).toFixed(4);
//		let perMonth = new Big(perYear).div(12).toFixed(4);
		let msg = strAR(perDay, 6) + "%";
		msg += " (" + strAR(new Big(perYear).toFixed(2), 5) + "%)";
		return msg;
	};

  let apiCallLimitDelay = function apiCallLimitDelay(methodName, callback) {
    let timeNow = Date.now();
    if (debug.enabled) {
      callsLast100.push(timeNow);
      let callsLastSecond = callsLast100.reduce((count, callTimestamp) => {
        if (timeNow - callTimestamp < config.apiCallsDurationMS) {
          return count += 1;
        } else {
          return count;
        }
      }, 0);
      debug(`${methodName} timestamp: ${timeNow}. Calls during last ${config.apiCallsDurationMS} Ms: ${callsLastSecond}`);
      callsLast100.splice(0, callsLast100.length - 20);
    }

    apiCallTimes.push(timeNow);
    apiCallTimes.splice(0, apiCallTimes.length - config.maxApiCallsPerDuration);
    let timeout = apiCallTimes.length && Math.max(0, config.apiCallsDurationMS - (timeNow - apiCallTimes[0])) || 0;
    setTimeout(callback, timeout);
  };

  var execTrade = function execTrade() {

    var msgLoanReturned = function msgLoanReturned(element){
    var canceledAC, createdAt, created, msg,holdingTimeSeconds;
    createdAt = moment.utc(element.date);
    created = createdAt.fromNow();
    canceledAC = {
      id: element.id,
      currency: element.currency,
      amount: strAR(new Big(element.amount).toFixed(8), 14),
      rate: new Big(element.rate).toFixed(8),
      period: element.period,
      createdAt: createdAt,
      expires: ""
    };
    var holdingTimeInSeconds = moment().diff(createdAt, "seconds");
    var htHours = Math.floor(holdingTimeInSeconds / 60 /60);
    var htMin = Math.floor((holdingTimeInSeconds - htHours * 60 *60) / 60);
    var htSec = holdingTimeInSeconds - htHours * 60 *60 - htMin * 60;
    var msgHt = `${htHours}h ${htMin}m ${htSec}s`;
    msg = "Loan returned #" + canceledAC.id + " " + canceledAC.currency + " " + canceledAC.amount + " at " + msgRate(canceledAC.rate) + `, holding time: ${msgHt}`;
    logger.info(msg);
  };

    var msgNewCredit = function msgNewCredit(element){
    var newAC, createdAt, expiresAt, expires, msg;
    createdAt = moment.utc(element.date);
    expiresAt = moment.utc(element.date).add(element.duration, "days");
    expires = expiresAt.fromNow();
    newAC = {
      id: element.id,
      currency: element.currency,
      amount: strAR(new Big(element.amount).toFixed(8), 14),
      rate: strAR(new Big(element.rate) .toFixed(8), 7),
      period: element.duration,
      createdAt: createdAt,
      expires: expires
    };
    msg = "Loan taken    #" + newAC.id + " " + newAC.currency + " " + newAC.amount + " at " + msgRate(newAC.rate) + ", created " + newAC.createdAt.utcOffset(120).format("YYYY-MM-DD HH:mm");
    msg += ", expires " + expires;
    logger.info(msg);
  };

    var updateActiveLoans = function updateActiveLoans(callback) {
    var updateWithNewActiveLoans = function updateWithNewActiveLoans(newActiveLoans) {
      var found;
      var dateNow = Date.now();
      activeLoans.forEach(function (element, index, array) {
        found = _.find(newActiveLoans, {id: element.id});
        if (typeof found === "undefined") {
          var returnedLoan = {
            "id": element.id,
            "date": moment.utc(element.date).toDate(),
            "currency": element.currency,
            "rate": element.rate,
            "duration": element.duration,
            "returned": dateNow
          };
          msgLoanReturned(element);
          anyChangedLoans[element.currency] = true;
        }
      });
      newActiveLoans.forEach(function (element, index, array) {
        found = _.find(activeLoans, {id: element.id});
        if (typeof found === "undefined") {
          msgNewCredit(element);
          anyChangedLoans[element.currency] = true;
          anyNewLoans[element.currency] = true;
          status.activeLoansCount++;
        }
      });
      activeLoans = newActiveLoans;

      var currenciesNewActiveLoans = [];
      newActiveLoans.forEach(function (element, index, array) {
        currenciesNewActiveLoans.push(element.currency)
      });
      currenciesNewActiveLoans = _.uniq(currenciesNewActiveLoans);
    };

    poloPrivate.returnActiveLoans(function (err, result) {
      let apiMethod = 'returnActiveLoans';
      emitApiCallUpdate({ timestamp: Date.now(), apiServer: 'poloniex', apiMethod: apiMethod, params: [], error: err && err.message || null, data: null });
      var newActiveLoans;
      if (err) {
        logger.notice("returnActiveLoans: " + err.message);
        if (_.includes(err.message, 'throttled')) {
          waitOneMinute = Date.now();
        }

        return apiCallLimitDelay(apiMethod, () => callback(err));
      }

      newActiveLoans = result.hasOwnProperty("provided") ? result.provided : [];
      updateWithNewActiveLoans(newActiveLoans);
      // update wmr
      currencies.forEach(function (c, index, array) {
        var sum = new Big(0),
          sumOfProd = new Big(0);
        activeLoans.forEach(function (element, index, array) {
          if (element.currency.toUpperCase() === c.toUpperCase()) {
            sum = sum.plus(element.amount);
            sumOfProd = sumOfProd.plus(new Big(element.amount).times(element.rate));
          }
        });
        status.wmr[c] = sum.eq(0) ? "0" : sumOfProd.div(sum).toFixed(8);
      });
      return apiCallLimitDelay(apiMethod, () => callback(null));
    });
  };

    var updateActiveOffers = function updateActiveOffers(callback) {
    poloPrivate.returnOpenLoanOffers(function (err, result) {
      let apiMethod = 'returnOpenLoanOffers';
      emitApiCallUpdate({ timestamp: Date.now(), apiServer: 'poloniex', apiMethod: apiMethod, params: [], error: err && err.message || null, data: null });
      if (err) {
        logger.notice("returnOpenLoanOffers: " + err.message);
        if (_.includes(err.message, 'throttled')) {
          waitOneMinute = Date.now();
        }

        return apiCallLimitDelay(apiMethod, () => callback(err));
      }

      currencies.forEach(function (c, i, a) {
        var newActiveOffers;
        newActiveOffers = typeof result[c] !== "undefined" ? result[c] : [];
        var found,
          newOffers = false;
        newActiveOffers.forEach(function (element, index, array) {
          found = _.find(activeOffers[c], {id: element.id});
          if (typeof found === "undefined") {
            newOffers = true;
          }
        });
        activeOffers[c] = newActiveOffers;
        if (newOffers) {
        }
      });
      return apiCallLimitDelay(apiMethod, () => callback(null));
    });
  };

    var updateAvailableFunds = function updateAvailableFunds(callback) {
    poloPrivate.returnAvailableAccountBalances("lending", function (err, result) {
      let apiMethod = 'returnAvailableAccountBalances';
      emitApiCallUpdate({ timestamp: Date.now(), apiServer: 'poloniex', apiMethod: apiMethod ,params: [], error: err && err.message || null, data: null });
      if (err) {
        logger.notice("returnAvailableAccountBalances: " + err.message);
        if (_.includes(err.message, 'throttled')) {
          waitOneMinute = Date.now();
        }

        return apiCallLimitDelay(apiMethod, () => callback(err));
      }

      currencies.forEach(function (c, i, a) {
        availableFunds[c] = result.hasOwnProperty("lending") && result.lending.hasOwnProperty(c) ? result.lending[c] : "0";
      });
      return apiCallLimitDelay(apiMethod, () => callback(null));
    });
  };

    var cancelHighOffers = function cancelHighOffers(callback) {
    async.forEachOfSeries(activeOffers,
      // for each currency in activeOffers
      function(activeOffersOneCurrency, currency, callback) {
        async.forEachOfSeries(activeOffersOneCurrency,
          //for each offer in the array (for respective currency)
          function (offer, index, cb) {
            var msg, offerRate;
            var amountTrading;

            offerRate = new Big(offer.rate);
            if (offerRate.eq(advisorInfo[currency] && advisorInfo[currency].bestReturnRate || '0.05')){
              // lend offers is on correct price
              return cb(null);
            }

            if (!(config.offerMaxAmount[currency] === "")) {
              // only if we are reserving any amount check if we are already trading more then offerMaxAmount
              amountTrading = new Big(depositFunds[currency]).minus(availableFunds[currency]);
              if(amountTrading.gte(config.offerMaxAmount[currency] || '9999999')) {
                // we are already trading higher then offerMaxAmount
                return cb(null);
              }
            }
            if (process.env[self.me+"_NOTRADE"] === "true") {
              logger.notice("cancelHighOffers: NO TRADE");
              return cb(null);
            }

            poloPrivate.cancelLoanOffer(offer.id.toString(), function (err, result) {
              let apiMethod = 'cancelLoanOffer';
              emitApiCallUpdate({ timestamp: Date.now(), apiServer: 'poloniex', apiMethod: apiMethod, params: [], error: err && err.message || null, data: null });
              if (err) {
                logger.notice(`cancelLoanOffer: ${err.message} (#${offer.id})`);
                if (_.includes(err.message, 'throttled')) {
                    waitOneMinute = Date.now();
                }

                return apiCallLimitDelay(apiMethod, () => cb(err));
              }

              anyCanceledOffer  = true;
              msg = "OfferCanceled #" + offer.id;
              msg += " " + currency.toUpperCase() + " " + strAR(new Big(offer.amount).toFixed(8), 14);
              msg += " at " + msgRate(offer.rate);
              let bestReturnRate = advisorInfo[currency] && advisorInfo[currency].bestReturnRate || '0.05';
              msg += ", brr " + msgRate(bestReturnRate);
              logger.info(msg);
              return apiCallLimitDelay(apiMethod, () => cb(null));
            });
          },
          function (err) {
            callback(err);
          });
      },
      function (err){
        callback(err);
      });
  };

    var postOffers = function postOffers(callback) {
    async.forEachOfSeries(currencies,
      // for each currency
      function(currency, index, callback) {
        var amountTrading, amountToTrade, amount, amountMaxToTrade,
          duration, autoRenew, lendingRate, minRate;

        if (config.offerMaxAmount[currency] == "") {
          amountToTrade = new Big(availableFunds[currency]);       // we are not reserving any funds
        }
        else {
          amountTrading = new Big(depositFunds[currency]).minus(availableFunds[currency]);
          amountMaxToTrade = new Big(config.offerMaxAmount[currency] || '9999999').minus(amountTrading);

          if (new Big(availableFunds[currency]).lt(amountMaxToTrade)) {
            amountToTrade = new Big(availableFunds[currency]);
          } else {
            amountToTrade = amountMaxToTrade;
          }
        }

        if (amountToTrade.lt(config.minOrderSize)) {
          return callback(null);
        }

        amount = amountToTrade.toFixed(8);
        lendingRate = advisorInfo[currency] && advisorInfo[currency].bestReturnRate || '0.05';
        duration = advisorInfo[currency] && advisorInfo[currency].bestDuration || '2';
        autoRenew = "0";

        // Do not offer loans the the best return rate is less than the specified min rate.
        minRate = new Big(config.offerMinRate[currency] || '0');
        if (minRate.div(100).gt(lendingRate)) {
          return callback(null);
        }

        if (process.env[self.me+"_NOTRADE"] === "true") {
          logger.notice("Post offer: NO TRADE");
          return callback(new Error("NO TRADE"));
        }

        poloPrivate.createLoanOffer(currency, amount, duration, autoRenew, lendingRate, function (err, result) {
          let apiMethod = 'createLoanOffer';
          emitApiCallUpdate({ timestamp: Date.now(), apiServer: 'poloniex', apiMethod: apiMethod, params: [], error: err && err.message || null, data: null });
          if (err) {
            logger.notice("createLoanOffer: " + err.message);
            if (_.includes(err.message, 'throttled')) {
                waitOneMinute = Date.now();
            }

            return apiCallLimitDelay(apiMethod, () => callback(err));
          }

          status.offersCount++;
          var newAO = {
            id: result.orderID,
            currency: currency,
            amount: strAR(new Big(amount).toFixed(8), 14),
            rate: strAR(new Big(lendingRate).toFixed(8), 7),
            period: duration
          };
          var msg = `Loan offered  #${newAO.id} ${newAO.currency} ${newAO.amount} at ` + msgRate(newAO.rate) + `, duration ${newAO.period} days`;
          logger.info(msg);
          return apiCallLimitDelay(apiMethod, () => callback(null));
        });
      },
      function (err){
        callback(err);
      });
  };

    let updateRates = function updateRates(callback) {
    poloPrivate.returnTicker(function (err, result) {
      let apiMethod = 'returnTicker';
      emitApiCallUpdate({
        timestamp: Date.now(),
        apiServer: 'poloniex',
        apiMethod: apiMethod,
        params: [],
        error: err && err.message || null,
        data: null
      });
      if (err) {
        logger.notice("returnTicker: " + err.message);
        if (_.includes(err.message, 'throttled')) {
          waitOneMinute = Date.now();
        }

        return apiCallLimitDelay(apiMethod, () => callback(err));
      }

      currencies.forEach((currency) => {
        let pair = `BTC_${currency}`;
        if (result[pair]) {
          ratesBTC[currency] = result[pair].last || '0';
        }
      });
      return apiCallLimitDelay(apiMethod, () => callback(null));
    });
  };

    let updateRateBTCUSD = function updateRateBTCUSD() {
    bfxPublic.ticker("btcusd", function (err, result) {
      if(err) {
        logger.notice("bfxPublic.ticker: " + err.message);
        return;
      }

      rateBTCUSD = new Big(result.last_price).toString();
    });

  };

    var report = function report() {
    // execute every x minutes
    var now = moment();
    var duration = now.diff(status.lastRun.report, "minutes");
    if (duration < config.reportEveryMinutes) {
      return;
    }
    var speed = new Big(status.lastRun.speedCount).div(duration).toFixed(2);
    status.lastRun.report = now;
    status.lastRun.speedCount = 0;

    var msg, since;
    status.offersCount = status.offersCount || status.activeLoansCount;

    // since = startDate.fromNow(true);
    since = now.diff(config.startDate, "days");
    msg = `♣ poloLender ${pjson.version} running for `+ since + " days • restarted " + self.started.fromNow() + " (" + self.started.utcOffset(120).format("YYYY-MM-DD HH:mm") + ")";
    msg += " • Offers/Loans: " + status.offersCount + "/" + status.activeLoansCount + " ";
    msg += ` • speed: ${speed}/min`;
    logger.notice(`${msg}`);

    if(clientMessage.lastClientSemver && semver.gt(clientMessage.lastClientSemver, pjson.version)) {
      logger.warning(`New poloLender revision available (current: ${pjson.version}, available: ${clientMessage.lastClientSemver}). Visit https://github.com/dutu/poloLender/ to update`);
    }

    if(clientMessage.message) {
      logger.info(`${clientMessage.message}`);
    }

    currencies.forEach(function (c, index, array) {
      if (new Big(depositFunds[c]).lte(0)) {
        return;
      }

      var profit = new Big(depositFunds[c]).minus(config.startBalance[c] || '0');
      var minutes = now.diff(config.restartTime, "minutes", true);
      var activeLoansCount = 0;
      var activeLoansAmount = new Big(0);
      activeLoans.forEach(function (l, index, array) {
        if (l.currency === c) {
          activeLoansCount++;
          activeLoansAmount = activeLoansAmount.plus(l.amount);
        }
      });
      var reserved, offerMax, available;
      try {
        offerMax = Number(config.offerMaxAmount[c] || '9999999');
        if (parseFloat(depositFunds[c]) < offerMax) {
          reserved = "0";
          available = availableFunds[c]
        }
        else {
          reserved = new Big(depositFunds[c]).minus(offerMax).toFixed(8);
          available = new Big(availableFunds[c]).minus(reserved).toFixed(8);
        }
      }
      catch (err) {
        reserved = "0";
        available = availableFunds[c];
      }

      msg = `* ${c}: ${activeLoansCount} loans: ${activeLoansAmount}, res: ${reserved} ● TOTAL: ${depositFunds[c]}, `;
      //msg += `Start: ${journalEntry.balance[c]}, `
      msg += ` ● PROFIT: ${c} ${profit.toFixed(8)} (${profit.div(minutes).times(60*24).toFixed(3)}/day)`;
      if(rateBTCUSD && ratesBTC[c]) {
        let rateCurrencyUSD = new Big(rateBTCUSD).times(ratesBTC[c]).toString();
        msg += ` ≈ USD ${profit.times(rateCurrencyUSD).toFixed(2)} (${profit.times(rateCurrencyUSD).div(minutes).times(60*24).toFixed(2)}/day)`;
      }
      var wmrMsg = msgRate(status.wmr[c]);
      var ewmr =  msgRate(new Big(status.wmr[c]).times(0.85).toFixed(8));
      msg += ` ● wmr: ${wmrMsg} ewmr: ${ewmr} ● alht: ${advisorInfo[c] && advisorInfo[c].averageLoanHoldingTime || ''}`;
      logger.notice(msg);
    });
  };

    async.series({
      updateActiveLoans: function(callback){
        updateActiveLoans(function (err) {
          callback(err, err && err.message || "OK");
        });
      },
      updateActiveOffers: function(callback) {
        updateActiveOffers(function (err) {
          callback(err, err && err.message || "OK");
        });
      },
      updateBalances: function(callback) {
        updateAvailableFunds(function (err) {
          if (err) {
            return callback(err, err.message);
          }
          currencies.forEach(function (c, index, array) {
            var amountActiveOffers = new Big(0);
            var amountActiveLoans = new Big(0);
            if (_.isArray(activeOffers[c]))
              activeOffers[c].forEach(function (o, index, array) {
                amountActiveOffers = amountActiveOffers.plus(o.amount);
              });
            activeLoans.forEach(function (l, index, array) {
              if (l.currency == c)
                amountActiveLoans = amountActiveLoans.plus(l.amount);
            });
            depositFunds[c] = amountActiveOffers.plus(amountActiveLoans).plus(availableFunds[c]).toFixed(8);
          });
          callback(null, "OK");
        });
      },
      report: function (callback) {
        report();
        callback(null, "OK");
      },
      cancelHighOffers: function (callback) {          // cancel offers if price is too high
        cancelHighOffers(function (err){
          callback(err, err && err.message || "OK");
        });
      },
      updateAvailableFunds: function (callback) {
        if (!anyCanceledOffer)
          return callback(null, "OK");
        updateAvailableFunds(function (err) {
          anyCanceledOffer = false;
          callback(err, err && err.message || "OK");
        });
      },
      postOffers: function (callback) {
        postOffers(function (err){
          callback(err, err && err.message || "OK");
        });
      },
      updateRates: function (callback) {
        updateRateBTCUSD();
        updateRates(function (err) {
          callback(err, err && err.message || "OK");
        })
      },
    },
      function(err, results) {
      if (!err) {
                  status.lastRun.speedCount++;
      }

      currencies = newCurrencies.slice();
      apiCallTimes.splice(0, apiCallTimes.length + 1 - config.maxApiCallsPerDuration);
      let timeout = Math.max(0, config.apiCallsDurationMS - (Date.now() - apiCallTimes[0]), waitOneMinute && 60000 - (Date.now() - waitOneMinute) || 0);
      waitOneMinute = null;
      setTimeout(execTrade, timeout);
    });
  };

  const emitPoloLenderAppUpdate = function emitPoloLenderAppUpdate() {
    let data = {
      poloLenderApp: {
        runningClientSemver: pjson.version,
        restartedAt: status.restarted,
      }
    };

    srv.io.sockets.emit('poloLenderApp', data);
  };

  const emitApiCallUpdate = function emitApiCallUpdate(apiCallInfo) {
    let data = {
      apiCallInfo: {
        timestamp: apiCallInfo.timestamp,
        error: apiCallInfo.error,
      },
    };

    srv.io.sockets.emit('apiCallInfo', data);
  };

  const emitAdvisorConnectionUpdate = function emitAdvisorConnectionUpdate() {
    srv.io.sockets.emit('advisorConnection', { advisor: browserData.advisor });
  };

  const emitClientMessageUpdate = function emitClientMessageUpdate() {
    srv.io.sockets.emit('clientMessage', { clientMessage: browserData.clientMessage || ''});
  };

  const emitAdvisorInfoUpdate = function emitAdvisorInfoUpdate() {
    srv.io.sockets.emit('advisorInfo', { advisorInfo: browserData.advisorInfo || {} });
  };

  const onBrowserConnection = function onBrowserConnection(client) {
    emitPoloLenderAppUpdate();
    emitAdvisorConnectionUpdate();
    emitClientMessageUpdate();
    emitAdvisorInfoUpdate();
  };


  self.start = function() {
		status.lastRun.speedCount= 0;
		self.started = moment();
		setConfig();
		debug("Starting...");
    poloPrivate = new Poloniex(self.apiKey.key, self.apiKey.secret);

    srv.io.on('connection', onBrowserConnection);

    socket = ioClient(`http://${config.advisor}/`);
    browserData.advisor = {
      server: config.advisor,
      connection: '',
    };
		socket.on('connect', function () {
			logger.info(`Connected to server ${config.advisor}`);
      browserData.advisor.connection = 'connected';
      emitAdvisorConnectionUpdate();
    });
		socket.on('reconnect', function () {
			logger.info(`Reconnected to server ${config.advisor}`);
      browserData.advisor.connection = 'reconnect';
      emitAdvisorConnectionUpdate();
		});
		socket.on("connect_error", function (err) {
			logger.warning(`Error connecting to server ${config.advisor} (${err.type}: ${err.message})`);
      browserData.advisor.connection = `connect error ${err.type}: ${err.message}`;
      emitAdvisorConnectionUpdate();
		});
		socket.on("reconnect_error", function (err) {
			logger.warning(`Error reconnecting to server ${config.advisor} (${err.type}: ${err.message})`);
      browserData.advisor.connection = `reconnect error ${err.type}: ${err.message}`;
      emitAdvisorConnectionUpdate();
		});
		socket.on("disconnect", function () {
			logger.notice(`Disconnected from server ${config.advisor}`);
      browserData.advisor.connection = 'disconnected';
      emitAdvisorConnectionUpdate();
		});
		socket.on("reconnecting", function (attemptNumber) {
			logger.info(`Reconnecting to server ${config.advisor} (${attemptNumber})`);
      browserData.advisor.connection = 'reconnecting';
      emitAdvisorConnectionUpdate();
		});
		socket.on("send:loanOfferParameters", function (msg) {
			var smsg = JSON.stringify(msg);
			debug(`received send:loanOfferParameters = ${smsg}`);
			var loanOfferParameters;
      browserData.advisorInfo = {};
			try {
				advisorInfo.time = msg.time;
				delete msg.time;
				_.forOwn(msg, function(value, key) {
				  if (newCurrencies.indexOf(key) < 0) {
				    newCurrencies.push(key);
          }

					advisorInfo[key] = {
						averageLoanHoldingTime: value.averageLoanHoldingTime,
						bestReturnRate: value.bestReturnRate,
						bestDuration: value.bestDuration
					};
          browserData.advisorInfo[key] = advisorInfo[key];
        });
			}
			catch (error) {
				logger.error(`Cannot parse loanOfferParameters ${smsg}`);
				debug(`Cannot parse loanOfferParameters: ${error.message}`);
      }
      emitAdvisorInfoUpdate();
		});
		socket.on("send:clientMessage", function (msg) {
			var smsg = JSON.stringify(msg);
			debug(`received send:clientMessage = ${smsg}`);
			var loanOfferParameters;
			if(_.isObject(msg)) {
        clientMessage = {
					time: msg.time,
					message: msg.message,
					lastClientSemver: msg.lastClientSemver,
        };
        if(clientMessage.lastClientSemver && semver.gt(clientMessage.lastClientSemver, pjson.version)) {
          clientMessage.lastClientMessage = ` - available ${clientMessage.lastClientSemver}. Please update your app!`;
        } else {
          clientMessage.lastClientMessage = '';
        }
        browserData.clientMessage = clientMessage;
			} else {
				logger.error(`Cannot parse clientMessage ${smsg}`);
				browserData.clientMessage = '';
			}
      emitClientMessageUpdate();
		});


		setTimeout(execTrade, 1);
	};

	self.stop = function() {
	};
};

module.exports = PoloLender;
