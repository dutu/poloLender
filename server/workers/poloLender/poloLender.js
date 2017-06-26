const ioClient = require('socket.io-client');
const _ = require('lodash');
const Big = require ('big.js');
const moment = require('moment');
const async = require ('async');
const debug = require('debug')('pololender');
const Bitfinex = require('bitfinex');
const semver = require('semver');
const Poloniex = require('poloniex-api-node');
const winston = require('winston');
const Finance = require('financejs');

require('winston-telegram').Telegram;

const pjson = require('../../../package.json');
let srv = require ('../../core/srv');
let io = srv.io;
let finance = new Finance();

const PoloLender = function(name) {
	const self = this;
	self.me = name;

  let browserData = {};
	let log = srv.logger;
	let logTg = null;
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
      reportTg: moment(0),
    },
		wmr: {}
	};
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
	let advisorInfo = {};
	let clientMessage ={};

	const configDefault = {
		startDate: '',
    startMessage: 'Join poloLender discussion/support group on telegram: https://t.me/cryptozone',
		reportEveryMinutes: 5,
		startBalance: {},
		restartTime: moment(),
		offerMinRate: {},
		offerMaxAmount: {},
		advisor: 'safe-hollows.crypto.zone',
    advisorToken: '',
    maxApiCallsPerDuration: 8,
    apiCallsDurationMS: 1000,
	};
	let config = {};

	let apiCallTimes = [];
	let waitOneMinute = null;
	let callsLast100 = [];

	_.assign(config, configDefault);

	let bfxPublic = new Bitfinex();

	const setConfig = function setConfig() {
		advisorInfo.time = "";
		// API keys
		try {
			ev = self.me.toUpperCase() + "_APIKEY";
			let apiKey = JSON.parse(process.env[ev]);
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
			log.alert(`Environment variable ${ev}  is invalid. Please see documentation at https://github.com/dutu/poloLender/`);
			debug(`${ev}=${process.env[ev]}`);
			log.alert(`Application will now exit. Correct the environment variable ${ev} and start the application again`);
			process.exit(1);
		}

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
			log.error(`Environment variable ${ev} is invalid (should be a number). Please see documentation at https://github.com/dutu/poloLender/`);
			debug(`${ev}=${process.env[ev]}`);
			config.reportEveryMinutes = configDefault.reportEveryMinutes;
		}
		log.info(`Using ${ev}=${config.reportEveryMinutes}`);

		try {
			ev = self.me.toUpperCase() + "_STARTTIME";
			config.startDate = moment(process.env[ev]);
			config.utcOffset = moment.parseZone(process.env[ev]).utcOffset();
		} catch (err) {
			log.error(`Environment variable ${ev} is invalid (should be a date). Please see documentation at https://github.com/dutu/poloLender/`);
			config.startDate = configDefault.startDate;
			config.utcOffset = 0;
			debug(`${ev}=${process.env[ev]}`);
		}
		log.info(`Using ${ev}=${config.startDate}`);

		let startBalance;
		try {
			ev = self.me.toUpperCase() + "_STARTBALANCE";
			startBalance = JSON.parse(process.env[ev]);
		} catch (err) {
			log.error(`Environment variable ${ev} is invalid. Please see documentation at https://github.com/dutu/poloLender/`);
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
        log.error(`Environment variable ${ev} is invalid. Please see documentation at https://github.com/dutu/poloLender/`);
        debug(`${ev}=${process.env[ev]}`);
        throw err;
      }
		});
		val = JSON.stringify(config.startBalance);
		log.info(`Using ${ev}=${val}`);

		let lendMax;
		try {
			ev = self.me.toUpperCase() + "_LENDMAX";
			lendMax = JSON.parse(process.env[ev]);
		} catch (err) {
			log.error(`Environment variable ${ev} is invalid. Please see documentation at https://github.com/dutu/poloLender/`);
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
        log.error(`Environment variable ${ev} is invalid. Please see documentation at https://github.com/dutu/poloLender/`);
        debug(`${ev}=${process.env[ev]}`);
        throw err;
      }
		});
		val = JSON.stringify(config.offerMaxAmount);
		log.info(`Using ${ev}=${val}`);

		let minRate;
		try {
			ev = self.me.toUpperCase() + "_MINRATE";
			minRate = JSON.parse(process.env[ev]);
		} catch (err) {
			log.error(`Environment variable ${ev} is invalid. Please see documentation at https://github.com/dutu/poloLender/`);
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
        log.error(`Environment variable ${ev} is invalid. Please see documentation at https://github.com/dutu/poloLender/`);
        debug(`${ev}=${process.env[ev]}`);
        throw err;
      }
		});
		val = JSON.stringify(config.offerMinRate);
		log.info(`Using ${ev}=${val}`);

		try {
			ev = self.me.toUpperCase() + "_STARTTIME";
			config.restartTime = moment(process.env[ev]);
		} catch (err) {
			log.error(`Environment variable ${ev} is invalid. Please see documentation at https://github.com/dutu/poloLender/`);
			debug(`${ev}=${process.env[ev]}`);
			config.restartTime = moment(0);
		}
		val = config.restartTime.utc().format();
		log.info(`Using ${ev}=${val}`);

    ev = self.me.toUpperCase() + '_TELEGRAM_TOKEN';
		config.telegramToken = process.env[ev];
    ev = self.me.toUpperCase() + '_TELEGRAM_USERID';
    config.telegramUserId = process.env[ev];

    ev = self.me.toUpperCase() + '_TELEGRAM_REPORTINTERVAL';
    val = Number(process.env[ev]);
    if (config.telegramToken && !_.isFinite(val)) {
      log.warning(`Environment variable ${ev} is invalid (should be a number). Please see documentation at https://github.com/dutu/poloLender/`);
      debug(`${ev}=${process.env[ev]}`);
    }

    config.telegramReportIntervalMin = val || config.reportEveryMinutes;
    if (config.telegramToken) {
      log.info(`Using ${ev}=${config.reportEveryMinutes}`);
    }

    ev = self.me.toUpperCase() + '_ADVISOR_TOKEN';
    config.advisorToken = process.env[ev] || "";
  };

  const execTrade = function execTrade() {
    const strAR = function strAR(str, length) {
      if (str.length > length)
        return str;
      var result = "                             " + str;
      result = result.substring(result.length - length);
      return result
    };

    const msgRate = function msgRate(perDayProc, withCi) {
      let perDay = new Big(perDayProc).times(100).toFixed(6);
      let pa = new Big(perDayProc).times(365*100).toFixed(1);
      let paCi = (finance.CI(parseFloat(pa) / 182, 1, 100, 182) - 100).toFixed(1);
      let msg = withCi && `${perDay}% (${pa}% pa, ${paCi}% paCI)` || `${perDay}% (${pa}% pa)`;
      return msg;
    };

    const apiCallLimitDelay = function apiCallLimitDelay(methodName, callback) {
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

    const msgLoanReturned = function msgLoanReturned(element) {
      let canceledAC, createdAt, created, msg,holdingTimeSeconds;
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
      let holdingTimeInSeconds = moment().diff(createdAt, "seconds");
      let htHours = Math.floor(holdingTimeInSeconds / 60 /60);
      let htMin = Math.floor((holdingTimeInSeconds - htHours * 60 *60) / 60);
      let htSec = holdingTimeInSeconds - htHours * 60 *60 - htMin * 60;
      let msgHt = `${htHours}h ${htMin}m ${htSec}s`;
      msg = "Loan returned #" + canceledAC.id + " " + canceledAC.currency + " " + canceledAC.amount + " at " + msgRate(canceledAC.rate) + `, holding time: ${msgHt}`;
      log.info(msg);
    };

    const msgNewCredit = function msgNewCredit(element) {
    let newAC, createdAt, expiresAt, expires, msg;
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
    msg = "Loan taken    #" + newAC.id + " " + newAC.currency + " " + newAC.amount + " at " + msgRate(newAC.rate) + ", created " + newAC.createdAt.utcOffset(config.utcOffset).format("YYYY-MM-DD HH:mm");
    msg += ", expires " + expires;
    log.info(msg);
  };

    const updateActiveLoans = function updateActiveLoans(callback) {
      const updateWithNewActiveLoans = function updateWithNewActiveLoans(newActiveLoans) {
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
				emitActiveLoans();

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
          log.notice("returnActiveLoans: " + err.message);
          if (_.includes(err.message, 'IP has been banned')) {
            log.info('API activity stopped for 1 minute');
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

    const updateActiveOffers = function updateActiveOffers(callback) {
    poloPrivate.returnOpenLoanOffers(function (err, result) {
      let apiMethod = 'returnOpenLoanOffers';
      emitApiCallUpdate({ timestamp: Date.now(), apiServer: 'poloniex', apiMethod: apiMethod, params: [], error: err && err.message || null, data: null });
      if (err) {
        log.notice("returnOpenLoanOffers: " + err.message);
        if (_.includes(err.message, 'throttled') || (err.message === 'Poloniex error 429: Too Many Requests')) {
          log.info('API activity stopped for 1 minute');
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

    const updateAvailableFunds = function updateAvailableFunds(callback) {
    poloPrivate.returnAvailableAccountBalances("lending", function (err, result) {
      let apiMethod = 'returnAvailableAccountBalances';
      emitApiCallUpdate({ timestamp: Date.now(), apiServer: 'poloniex', apiMethod: apiMethod ,params: [], error: err && err.message || null, data: null });
      if (err) {
        log.notice("returnAvailableAccountBalances: " + err.message);
        if (_.includes(err.message, 'throttled') || (err.message === 'Poloniex error 429: Too Many Requests')) {
          log.info('API activity stopped for 1 minute');
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

    const cancelHighOffers = function cancelHighOffers(callback) {
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
              log.notice("cancelHighOffers: NO TRADE");
              return cb(null);
            }

            poloPrivate.cancelLoanOffer(offer.id.toString(), function (err, result) {
              let apiMethod = 'cancelLoanOffer';
              emitApiCallUpdate({ timestamp: Date.now(), apiServer: 'poloniex', apiMethod: apiMethod, params: [], error: err && err.message || null, data: null });
              if (err) {
                log.notice(`cancelLoanOffer: ${err.message} (#${offer.id})`);
                if (_.includes(err.message, 'throttled') || (err.message === 'Poloniex error 429: Too Many Requests')) {
                  log.info('API activity stopped for 1 minute');
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
              log.info(msg);
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

    const postOffers = function postOffers(callback) {
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

        if (amountToTrade.lt(advisorInfo[currency].minOrderAmount || '1')) {
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
          log.notice("Post offer: NO TRADE");
          return callback(new Error("NO TRADE"));
        }

        poloPrivate.createLoanOffer(currency, amount, duration, autoRenew, lendingRate, function (err, result) {
          let apiMethod = 'createLoanOffer';
          emitApiCallUpdate({ timestamp: Date.now(), apiServer: 'poloniex', apiMethod: apiMethod, params: [], error: err && err.message || null, data: null });
          if (err) {
            log.notice("createLoanOffer: " + err.message);
            if (_.includes(err.message, 'throttled') || (err.message === 'Poloniex error 429: Too Many Requests')) {
              log.info('API activity stopped for 1 minute');
              waitOneMinute = Date.now();
            }

            return apiCallLimitDelay(apiMethod, () => callback(null));
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
          log.info(msg);
          return apiCallLimitDelay(apiMethod, () => callback(null));
        });
      },
      function (err){
        callback(err);
      });
  };

    const updateRates = function updateRates(callback) {
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
        log.notice("returnTicker: " + err.message);
        if (_.includes(err.message, 'throttled') || (err.message === 'Poloniex error 429: Too Many Requests')) {
          log.info('API activity stopped for 1 minute');
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

    const updateRateBTCUSD = function updateRateBTCUSD() {
    bfxPublic.ticker("btcusd", function (err, result) {
      if(err) {
        log.notice("bfxPublic.ticker: " + err.message);
        return;
      }

      rateBTCUSD = new Big(result.last_price).toString();
    });

  };

    const report = function report() {
      let shouldRepCon = false;
      let shouldRepTg = false;
      const logRep = function logRep(msg) {
        if (shouldRepCon) log.report(msg);
        if (shouldRepTg) logTg.report(msg);
      };

      let now = moment();
      if (now.diff(status.lastRun.report, "minutes") >= config.reportEveryMinutes) {
        shouldRepCon = true;
        status.lastRun.report = now;
      }

      if (now.diff(status.lastRun.reportTg, "minutes") >= config.telegramReportIntervalMin) {
        shouldRepTg = !!logTg;
        status.lastRun.reportTg = now;
      }

      if (!shouldRepTg && !shouldRepCon) {
        return;
      }

      let msg, since;
      status.offersCount = status.offersCount || status.activeLoansCount;

      // since = startDate.fromNow(true);
      since = now.diff(config.startDate, "days");
      let m = {
        runningForDays: since,
        restartedAgo: self.started.fromNow(),
        restartedAt: self.started.utcOffset(config.utcOffset).format("YYYY-MM-DD HH:mm"),
        offersCount: status.offersCount,
        activeLoans: status.activeLoansCount,
      };
      msg = `♣ poloLender ${pjson.version} running for ${m.runningForDays} days • restarted ${m.restartedAgo} (${m.restartedAt})`;
      msg += ` • Offers/Loans: ${m.offersCount}/${m.activeLoans}`;
      logRep(`${msg}`);

      if (clientMessage.lastClientSemver && semver.gt(clientMessage.lastClientSemver, pjson.version)) {
        logRep(`New poloLender revision available (current: ${pjson.version}, available: ${clientMessage.lastClientSemver}). Visit https://github.com/dutu/poloLender/ to update`);
      }

      if (clientMessage.message) {
        logRep(`${clientMessage.message}`);
      }

      currencies.forEach(function (c, index, array) {
        if (new Big(depositFunds[c]).lte(0)) {
          return;
        }

        let profit = new Big(depositFunds[c]).minus(config.startBalance[c] || '0');
        let minutes = now.diff(config.restartTime, "minutes", true);
        let activeLoansCount = 0;
        let activeLoansAmount = new Big(0);
        activeLoans.forEach(function (l, index, array) {
          if (l.currency === c) {
            activeLoansCount++;
            activeLoansAmount = activeLoansAmount.plus(l.amount);
          }
        });
        let reserved, offerMax, available;
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

        let totalUSD = new Big(rateBTCUSD).times(depositFunds[c]).toFixed(0);
        msg = `${c}: ● TOTAL: ${depositFunds[c]} (USD ${totalUSD}) • ${activeLoansAmount} in ${activeLoansCount} active loans ● PROFIT: ${profit.toFixed(8)} (${profit.div(minutes).times(60*24).toFixed(3)}/day)`;
        if(rateBTCUSD && ratesBTC[c]) {
          let rateCurrencyUSD = new Big(rateBTCUSD).times(ratesBTC[c]).toString();
          msg += ` ≈ USD ${profit.times(rateCurrencyUSD).toFixed(0)} (${profit.times(rateCurrencyUSD).div(minutes).times(60*24).toFixed(2)}/day)`;
        }
        let wmrMsg = msgRate(status.wmr[c], true);
        let ewmr =  msgRate(new Big(status.wmr[c]).times(0.85).toFixed(8), true);
        msg += ` • wmr: ${wmrMsg} ewmr: ${ewmr} alht: ${advisorInfo[c] && advisorInfo[c].averageLoanHoldingTime || ''}`;
        logRep(msg);
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
      let timeout = Math.max(0, config.apiCallsDurationMS - (Date.now() - apiCallTimes[0]), waitOneMinute && 60000 || 0);
      setTimeout(function() {
        if (waitOneMinute) {
          log.info('API activity resumed');
        }
        waitOneMinute = null;

        execTrade();
      }, timeout);
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

	const emitActiveLoans= function emitAdvisorInfoUpdate() {
    srv.io.sockets.emit('loanInfo', {
			activeLoans: activeLoans || [],
			activeOffers: activeOffers || [],
			rateBTCUSD: rateBTCUSD,
			currencies: currencies
		});
  };

  const onBrowserConnection = function onBrowserConnection(client) {
    emitPoloLenderAppUpdate();
    emitAdvisorConnectionUpdate();
    emitClientMessageUpdate();
    emitAdvisorInfoUpdate();
		emitActiveLoans();
  };

  const addTelegramLogger = function addTelegramLogger() {
    if (!config.telegramToken || !config.telegramUserId) {
      log.notice('Bot reports will NOT be sent via telegram (token and/or userId not configured)');
      return;
    }


    let customLogLevels = _.clone(winston.config.syslog.levels);
    delete customLogLevels.emerg;
    customLogLevels.report = 0;
    logTg = new (winston.Logger)({
      levels: customLogLevels,
      exitOnError: false,
      transports: [
        new (winston.transports.Telegram)({
          token : config.telegramToken,
          chatId : config.telegramUserId,
          level: 'report',
          handleExceptions: true,
        }),
      ]
    });
  };

  self.start = function() {
		status.lastRun.speedCount= 0;
		self.started = moment();
		log.report(configDefault.startMessage);
		setConfig();
    addTelegramLogger();
    if (logTg) {
      logTg.report(configDefault.startMessage);
    }

    debug("Starting...");
    poloPrivate = new Poloniex(self.apiKey.key, self.apiKey.secret, { socketTimeout: 60000 });

    srv.io.on('connection', onBrowserConnection);

    socket = ioClient(`http://${config.advisor}/`);
    browserData.advisor = {
      server: config.advisor,
      connection: '',
      authenticate: {},
    };
		socket.on('connect', function () {
      socket.emit('authenticate', { token: config.advisorToken }); //send the jwt
      log.info(`Connected to server ${config.advisor}`);
      browserData.advisor.connection = 'connected';
      emitAdvisorConnectionUpdate();
    });
		socket.on('reconnect', function () {
			log.info(`Reconnected to server ${config.advisor}`);
      browserData.advisor.connection = 'reconnect';
      emitAdvisorConnectionUpdate();
		});
		socket.on("connect_error", function (err) {
			let error = JSON.parse(JSON.stringify(err));
			if (err.message) error.message = err.message;
			log.warning(`Error connecting to server ${config.advisor}: ${JSON.stringify(error)}`);
      browserData.advisor.connection = `connect error ${JSON.stringify(error)}`;
      emitAdvisorConnectionUpdate();
		});
		socket.on("reconnect_error", function (err) {
			let error = JSON.parse(JSON.stringify(err));
			if (err.message) error.message = err.message;
			log.warning(`Error reconnecting to server ${config.advisor}: ${JSON.stringify(error)}`);
      browserData.advisor.connection = `reconnect error ${JSON.stringify(error)}`;
      emitAdvisorConnectionUpdate();
		});
		socket.on("disconnect", function () {
			log.notice(`Disconnected from server ${config.advisor}`);
      browserData.advisor.connection = 'disconnected';
      emitAdvisorConnectionUpdate();
		});
		socket.on("reconnecting", function (attemptNumber) {
			log.info(`Reconnecting to server ${config.advisor} (${attemptNumber})`);
      browserData.advisor.connection = 'reconnecting';
      emitAdvisorConnectionUpdate();
		});
    socket.on("authenticate", function (response) {
      if (response.authorized) {
        let msg = `Authentication with server $${config.advisor} successful`;
        msg += response.message && `: ${response.message}` || '';
        log.info(msg);
      } else {
        let msg = `Advisor authentication error`;
        msg += response.errorCode && ` ${response.errorCode}` || '';
        msg += response.message && `: ${response.message}` || '';
        log.error(msg);
      }
      browserData.advisor.authenticate = response;
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
						bestDuration: value.bestDuration,
						minOrderAmount: value.minOrderAmount || '1',
					};
          browserData.advisorInfo[key] = advisorInfo[key];
        });
			}
			catch (error) {
				log.error(`Cannot parse loanOfferParameters ${smsg}`);
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
				log.error(`Cannot parse clientMessage ${smsg}`);
				browserData.clientMessage = '';
			}
      emitClientMessageUpdate();
		});

		setTimeout(execTrade, 1);
	};

	self.stop = function () {
	};
};

module.exports = PoloLender;
