import ioClient from 'socket.io-client';
import _ from 'lodash';
import Big from 'big.js';
import moment from 'moment';
import async from 'async';
import debug from 'debug';
import Bitfinex from 'bitfinex';
import semver from 'semver';
import Poloniex from 'poloniex-api-node';

import { log, logTg, addTelegramLogger } from '../../loggers';
import { msgApy, msgLoanReturned, msgNewCredit, msgRate, strAR } from './msg';
import { migrateConfig } from './dbMigrate';
import { io } from '../../httpServer';
import { connectDb, getConfig, saveConfig } from './config';
import { debugApiCallDuration, debugCycleDuration, debugTimer } from './debug';

debug('pololender');

const pjson = require('../../../package.json');

export const PoloLender = function(name) {
	const self = this;
	self.me = name;

	let logTg = null;
	let poloPrivate;
	let socket;
	let currencies = [];
	let status = {
		restarted: moment().utc().format(),
    runningClientSemver: pjson.version,
		activeLoansCount: 0,
		count: 0,
		lastRun: {
			report: moment(0),
      reportTg: moment(0),
    },
		wmr: {},
    lendingAdvisor: {
		  connection: '',
    },
	};
	let performanceReports = {};
	let anyCanceledOffer;
  let anyNewLoans = {};
  let activeLoans = [];
  let activeOffers = {};
  let anyChangedLoans = {};
  let availableFunds = {};
  let depositFunds = {};
  let ev;
  let ratesBTC = {
    BTC: '1',
  };
  let rateBTCUSD;
	let advisorInfo = {};
	let clientMessage = {};
	let liveData = {
	  activeLoans: [],
    openOffers: [],
  };

	let config = {};
	self.config = config;
	let apiCallTimes = [];
	let waitOneMinute = null;
	let callsLast100 = [];

	let bfxPublic = new Bitfinex();
  let poloPublic = new Poloniex();

  let _debugApiCallDuration = _.bind(debugApiCallDuration, this);
  let _debugCycleDuration = _.bind(debugCycleDuration, this);

  const emitConfigUpdate = function emitConfigUpdate() {
    io.sockets.emit('configUpdate', config);
  };

  const emitStatusUpdate = function emitStatusUpdate() {
    io.sockets.emit('statusUpdate', status);
  };

  const emitClientMessageUpdate = function emitClientMessageUpdate() {
    io.sockets.emit('clientMessageUpdate', clientMessage);
  };

  const emitApiCallUpdate = function emitApiCallUpdate(apiCallInfo) {
    let data = {
      apiCallInfo: {
        timestamp: apiCallInfo.timestamp,
        error: apiCallInfo.error,
      },
    };

    io.sockets.emit('apiCallInfo', data);
  };

  const emitPerformanceUpdate = function emitPerformanceUpdate() {
    performanceReports = {};
    currencies.forEach(currency => {
      if ((!depositFunds[currency] || parseFloat(depositFunds[currency]) === 0) && (!config.startBalance[currency] || parseFloat(config.startBalance[currency]) === 0)) {
        return;
      }

      let wmr = new Big(status.wmr[currency] || 0).times(100);
      performanceReports[currency] = {
        startBalance: config.startBalance[currency] || 0,
        totalFunds: depositFunds[currency] || 0,
        activeLoansCount: _.filter(activeLoans, { currency: currency }).length,
        activeLoansAmount: _.filter(activeLoans, { currency: currency }).reduce((sum, activeLoan) => { return sum = sum.plus(activeLoan.amount) }, new Big(0)).toFixed(8),
        rateBTC: ratesBTC[currency],
        rateBTCUSD: rateBTCUSD,
        wmr: wmr.toFixed(6),
      };
    });

    io.sockets.emit('performanceReport', performanceReports);
  };

  const emitLiveUpdate = function emitLiveUpdate() {
    io.sockets.emit('liveUpdates', liveData);
  };

  const emitAdvisorInfoUpdate = function emitAdvisorInfoUpdate() {
    io.sockets.emit('advisorInfo', advisorInfo);
  };

  const onReturnLendingHistory = function onReturnLendingHistory(data) {
    poloPrivate.returnLendingHistory(data.start, data.end, data.limit, (err, result) => {
      if (err) {
        log.notice(`returnLendingHistory: ${err.message}`);
      }

      io.sockets.emit('lendingHistory', err && err.message || null, result);
    })
  };

  const onUpdateConfig = function (newConfig, source) {
    config = newConfig;
    saveConfig(config, (err, newConfig) => {
      io.sockets.emit('updatedConfig', err, config, source);
    });
  };

  const onBrowserConnection = function onBrowserConnection(socket) {
    socket.on('returnLendingHistory', onReturnLendingHistory);
    socket.on(`updateConfig`, onUpdateConfig);
    emitConfigUpdate();
    emitStatusUpdate();
    emitClientMessageUpdate();
    emitAdvisorInfoUpdate();
    emitPerformanceUpdate();
    emitLiveUpdate();
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

  const setupBrowserComms = function setupBrowserComms() {
    io.on('connection', onBrowserConnection);
  };

  const setupAdvisorComms = function setupAdvisorComms() {
    socket = ioClient(`http://${config.lendingAdvisor.server}/`);
    status.lendingAdvisor = {
      connection: '',
      authentication: {
        status: 200,
        message: '',
      },
    };
    socket.on('connect', function () {
      socket.emit('authentication', { token: config.lendingAdvisor.accessToken }); //send the jwt
      log.info(`Connected to server ${config.lendingAdvisor.server}`);
      status.lendingAdvisor.connection = 'connected';
      emitStatusUpdate();
    });
    socket.on('reconnect', function () {
      log.info(`Reconnected to server ${config.lendingAdvisor.server}`);
      status.lendingAdvisor.connection = 'reconnect';
      emitStatusUpdate();
    });
    socket.on("connect_error", function (err) {
      let error = JSON.parse(JSON.stringify(err));
      if (err.message) error.message = err.message;
      log.warning(`Error connecting to server ${config.lendingAdvisor.server}: ${JSON.stringify(error)}`);
      status.lendingAdvisor.connection = `connect error ${JSON.stringify(error)}`;
      emitStatusUpdate();
    });
    socket.on("reconnect_error", function (err) {
      let error = JSON.parse(JSON.stringify(err));
      if (err.message) error.message = err.message;
      log.warning(`Error reconnecting to server ${config.lendingAdvisor.server}: ${JSON.stringify(error)}`);
      status.lendingAdvisor.connection = `reconnect error ${JSON.stringify(error)}`;
      emitStatusUpdate();
    });
    socket.on("disconnect", function () {
      log.notice(`Disconnected from server ${config.lendingAdvisor.server}`);
      status.lendingAdvisor.connection = 'disconnected';
      emitStatusUpdate();
    });
    socket.on("reconnecting", function (attemptNumber) {
      log.info(`Reconnecting to server ${config.lendingAdvisor.server} (${attemptNumber})`);
      status.lendingAdvisor.connection = 'reconnecting';
      emitStatusUpdate();
    });
    socket.on("authentication", function (response) {
      status.lendingAdvisor.authentication = response;
      if (response.status === 200) {
        let msg = `Authentication with server $${config.lendingAdvisor.server} successful`;
        msg += response.status && `: ${response.message}` || '';
        log.info(msg);
      } else {
        let msg = `Advisor authentication error`;
        msg += response.status && ` ${response.status}` || '';
        msg += response.message && `: ${response.message}` || '';
        log.error(msg);
      }
      emitStatusUpdate();
    });
    socket.on("send:loanOfferParameters", function (msg) {
      let smsg = JSON.stringify(msg);
      debug(`received send:loanOfferParameters = ${smsg}`);
      let loanOfferParameters;
      try {
        advisorInfo.time = msg.time;
        delete msg.time;
        _.forOwn(msg, function(value, key) {
          advisorInfo[key] = {
            averageLoanHoldingTime: value.averageLoanHoldingTime,
            bestReturnRate: value.bestReturnRate,
            bestDuration: value.bestDuration,
            minOrderAmount: value.minOrderAmount || '1',
          };
        });
      }
      catch (error) {
        log.error(`Cannot parse loanOfferParameters ${smsg}`);
        debug(`Cannot parse loanOfferParameters: ${error.message}`);
      }
      emitAdvisorInfoUpdate();
    });
    socket.on("send:clientMessage", function (msg) {
      let smsg = JSON.stringify(msg);
      debug(`received send:clientMessage = ${smsg}`);
      let loanOfferParameters;
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
      } else {
        log.error(`Cannot parse clientMessage ${smsg}`);
      }
      emitClientMessageUpdate();
    });
  };

  const updateActiveLoans = function updateActiveLoans(callback) {
    const updateWithNewActiveLoans = function updateWithNewActiveLoans(newActiveLoans) {
      const dateNow = Date.now();
      let found;
      activeLoans.forEach(function (element, index, array) {
        found = _.find(newActiveLoans, {id: element.id});
        if (typeof found === "undefined") {
          let returnedLoan = {
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
          msgNewCredit(element, config);
          anyChangedLoans[element.currency] = true;
          anyNewLoans[element.currency] = true;
          status.activeLoansCount++;
        }
      });
      activeLoans = newActiveLoans;

      let currenciesNewActiveLoans = [];
      newActiveLoans.forEach(function (element, index, array) {
        currenciesNewActiveLoans.push(element.currency)
      });
      currenciesNewActiveLoans = _.uniq(currenciesNewActiveLoans);
    };

    poloPrivate.returnActiveLoans(function (err, result) {
      let apiMethod = 'returnActiveLoans';
      emitApiCallUpdate({ timestamp: Date.now(), apiServer: 'poloniex', apiMethod: apiMethod, params: [], error: err && err.message || null, data: null });
      let newActiveLoans;
      if (err) {
        log.notice("returnActiveLoans: " + err.message);
        if (_.includes(err.message, 'IP has been banned')) {
          log.info('API activity stopped for 1 minute');
          waitOneMinute = Date.now();
        }

        return apiCallLimitDelay(apiMethod, () => callback(err));
      }


      newActiveLoans = result.hasOwnProperty("provided") ? result.provided : [];
      liveData.activeLoans = newActiveLoans;
      updateWithNewActiveLoans(newActiveLoans);
      // update wmr
      currencies.forEach(function (c, index, array) {
        let sum = new Big(0);
        let sumOfProd = new Big(0);
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

      liveData.openOffers = result;
      currencies.forEach(function (c, i, a) {
        let newActiveOffers;
        newActiveOffers = result[c] || [];
        let newOffers = false;
        newActiveOffers.forEach(function (element, index, array) {
          newOffers = newOffers || !_.find(activeOffers[c], { id: element.id });
        });
        activeOffers[c] = newActiveOffers;
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
            let msg;
            let offerRate;
            let amountTrading;

            offerRate = new Big(offer.rate);
            if (offerRate.eq(advisorInfo[currency] && advisorInfo[currency].bestReturnRate || '0.05')){
              // lend offers is on correct price
              return cb(null);
            }

            if (!(config.offerMaxAmount[currency] === "")) {
              // only if we are reserving any amount check if we are already trading more then offerMaxAmount
              amountTrading = new Big(depositFunds[currency]).minus(availableFunds[currency]);
              if(amountTrading.gte(config.offerMaxAmount[currency] || 9999999)) {
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
    let curr = _.intersection(Object.keys(advisorInfo), currencies);
    async.forEachOfSeries(curr,
      // for each currency
      function(currency, index, callback) {
        let amountTrading;
        let amountToTrade;
        let amount;
        let amountMaxToTrade;
        let duration;
        let autoRenew;
        let lendingRate;
        let minRate;

        if (config.offerMaxAmount[currency] === '') {
          amountToTrade = new Big(availableFunds[currency]);       // we are not reserving any funds
        }
        else {
          amountTrading = new Big(depositFunds[currency]).minus(availableFunds[currency]);
          amountMaxToTrade = new Big(config.offerMaxAmount[currency] || 9999999).minus(amountTrading);

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
        minRate = new Big(config.offerMinRate[currency] || 0);
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
          let newAO = {
            id: result.orderID,
            currency: currency,
            amount: strAR(new Big(amount).toFixed(8), 14),
            rate: strAR(new Big(lendingRate).toFixed(8), 7),
            period: duration
          };
          let msg = `Loan offered  #${newAO.id} ${newAO.currency} ${newAO.amount} at ` + msgRate(newAO.rate) + `, duration ${newAO.period} days`;
          log.info(msg);
          return apiCallLimitDelay(apiMethod, () => callback(null));
        });
      },
      function (err){
        callback(err);
      });
  };

  const updateRates = function updateRates() {
    poloPublic.returnTicker(function (err, result) {
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
        return;
      }

      currencies.forEach((currency) => {
        let pair = `BTC_${currency}`;
        if (result[pair]) {
          ratesBTC[currency] = result[pair].last || '0';
        }
      });
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
    emitPerformanceUpdate();

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

    if (config.telegramReports && config.telegramReports.isEnabled && config.telegramReports.reportEveryMin && now.diff(status.lastRun.reportTg, "minutes") >= config.telegramReports.reportEveryMin) {
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
    let utcOffset = moment.parseZone(config.startDate).utcOffset();
    let m = {
      runningForDays: since,
      restartedAgo: self.started.fromNow(),
      restartedAt: self.started.utcOffset(utcOffset).format("YYYY-MM-DD HH:mm"),
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

      msg = `${c}: ● TOTAL: ${depositFunds[c]} `;
      if(rateBTCUSD && ratesBTC[c]) {
        let totalUSD = new Big(rateBTCUSD).times(ratesBTC[c]).times(depositFunds[c]).toFixed(0);
        msg += `(USD ${totalUSD}) `;
      }
      msg += `• ${activeLoansAmount} in ${activeLoansCount} active loans ● PROFIT: ${profit.toFixed(8)} (${profit.div(minutes).times(60*24).toFixed(3)}/day)`;
      msg += ` = ${(profit/config.startBalance[c] * 100).toFixed(2)}% (${(profit/config.startBalance[c] * 100 /(minutes/60/24) ).toFixed(2)}%/day)`;
      if(rateBTCUSD && ratesBTC[c]) {
        let rateCurrencyUSD = new Big(rateBTCUSD).times(ratesBTC[c]).toString();
        msg += ` ≈ USD ${profit.times(rateCurrencyUSD).toFixed(0)} (${profit.times(rateCurrencyUSD).div(minutes).times(60*24).toFixed(2)}/day)`;
      }
      let wmrMsg = msgRate(status.wmr[c]);
      let ewmrMsg =  msgRate(new Big(status.wmr[c]).times(0.85).toFixed(8));
      let apyMsg = msgApy(status.wmr[c]);
      msg += ` • Daily war: ${wmrMsg} ewar: ${ewmrMsg} • APY: ${apyMsg} • alht: ${advisorInfo[c] && advisorInfo[c].averageLoanHoldingTime || ''}`;
      logRep(msg);
    });
  };

  let currentApiKey = {};
  const execTrade = function execTrade() {
    async.series(
      {
        updateConfig: function (callback) {
          getConfig((err, newConfig) => {
            if (err) {
              return callback(err);
            }

            if (!_.isEqual(currentApiKey, config.apiKey)) {
              currentApiKey = config.apiKey;
              poloPrivate = new Poloniex(currentApiKey.key, currentApiKey.secret, { socketTimeout: 60000 });
            }

            if (!config.isTradingEnabled && newConfig.isTradingEnabled) {
              log.info('execTrades: Lending engine has been enabled!');
            }

            if (config.isTradingEnabled && !newConfig.isTradingEnabled) {
              log.warning('execTrades: Lending engine has been disabled!');
            }

            if (!_.isEqual(config, newConfig)) {
              config = newConfig;
              emitConfigUpdate();
            }

            config = newConfig;
            self.config = newConfig;
            callback(null);
          });
        },
        isTradingEnabled: function (callback) {
          let err = !config.isTradingEnabled && new Error('Trading is disabled') || null;
          if (!config.isTradingEnabled) {
            log.warning('execTrades: Lending engine is disabled!', { lcl: 'lendingDisabled', llim: 5 * 60 });
          }
          callback(err, err && err.message || 'OK');
        },
        updates: function (callback) {
          let method = config.advancedSettings.parallelApiExecution && 'parallel' || 'series';
          let step = config.advancedSettings.parallelApiExecution && config.advancedSettings.nonceDelay || 0;
          let nonceDelay = -step;
          async[method] (
            {
              updateRates: function (callback) {
                nonceDelay += step;
                _.delay(function (callback) {
                  _debugCycleDuration();
                  _debugApiCallDuration('updateRates');
                  updateRateBTCUSD();
                  updateRates();
                  callback(null);
                }, nonceDelay, callback);
              },
              updateActiveLoans: function(callback){
                nonceDelay += step;
                _.delay(function (callback) {
                  _debugApiCallDuration('updateActiveLoans');
                  updateActiveLoans(function (err) {
                    if (err && (err.message.toLowerCase().includes('invalid api key') || err.message.toLowerCase().includes('api key and secret required'))) {
                      config.isTradingEnabled = false;
                      config.status.lendingEngineStopReason = err.message;
                      log.warning(`execTrades: Lending engine will be disabled`);
                      saveConfig(config, (err, config) => {
                        emitConfigUpdate();
                        callback(err, "OK");
                      });
                    } else {
                      callback(err, err && err.message || "OK");
                    }
                  });
                }, nonceDelay, callback);
              },
              updateActiveOffers: function(callback) {
                nonceDelay += step;
                _.delay(function (callback) {
                  _debugApiCallDuration('updateActiveOffers');
                  updateActiveOffers(function (err) {
                    callback(err, err && err.message || "OK");
                  });
                }, nonceDelay, callback);
              },
              updateBalances: function(callback) {
                nonceDelay += step;
                _.delay(function (callback) {
                  _debugApiCallDuration('updateBalances');
                  updateAvailableFunds(function (err) {
                    if (err) {
                      return callback(err, err.message);
                    }

                    currencies.forEach(function (c, index, array) {
                      let amountActiveOffers = new Big(0);
                      let amountActiveLoans = new Big(0);
                      if (_.isArray(activeOffers[c]))
                        activeOffers[c].forEach(function (o, index, array) {
                          amountActiveOffers = amountActiveOffers.plus(o.amount);
                        });
                      activeLoans.forEach(function (l, index, array) {
                        if (l.currency == c)
                          amountActiveLoans = amountActiveLoans.plus(l.amount);
                      });
                      depositFunds[c] = amountActiveOffers.plus(amountActiveLoans).plus(availableFunds[c] || 0).toFixed(8);
                    });
                    callback(null, "OK");
                  });
                }, nonceDelay, callback);
              },
            },
            function (err) {
              callback(err);
            });
        },
        emitLiveUpdate: function (callback) {
          _debugApiCallDuration('emitLiveUpdate');
          emitLiveUpdate();
          callback(null, 'OK');
        },
        report: function (callback) {
          _debugApiCallDuration('report');
          report();
          callback(null, 'OK');
        },
        cancelHighOffers: function (callback) {          // cancel offers if price is too high
          _debugApiCallDuration('cancelHighOffers');
          cancelHighOffers(function (err){
            callback(null, err && err.message || "OK");
          });
        },
        updateAvailableFunds: function (callback) {
          _debugApiCallDuration('updateAvailableFunds');
          if (!anyCanceledOffer) {
            return callback(null, "OK");
          }

          updateAvailableFunds(function (err) {
            anyCanceledOffer = false;
            callback(err, err && err.message || "OK");
          });
        },
        postOffers: function (callback) {
          _debugApiCallDuration('postOffers');
          postOffers(function (err){
            callback(err, err && err.message || "OK");
          });
        },
      },
      function(err, results) {
        if (!err) {
          status.lastRun.speedCount++;
        }

        apiCallTimes.splice(0, apiCallTimes.length + 1 - config.maxApiCallsPerDuration);
        let timeNow = Date.now();
        let timeout = Math.max(0, config.apiCallsDurationMS - (timeNow - apiCallTimes[0]), waitOneMinute && 60000 || 0);
        setTimeout(function() {
          if (waitOneMinute) {
            log.info('API activity resumed');
          }
          waitOneMinute = null;

          execTrade();
        }, timeout);
      });
  };

  const getCurrencies = function getCurrencies(callback) {
    let err;
    async.doWhilst(
      function returnCurrencies(callback) {
        poloPublic.returnCurrencies((error, result) => {
          err = error;
          let apiMethod = 'returnCurrencies';
          emitApiCallUpdate({
            timestamp: Date.now(),
            apiServer: 'poloniex',
            apiMethod: apiMethod,
            params: [],
            error: err && err.message || null,
            data: null
          });

          if (err) {
            log.notice(`${apiMethod}: ${err.message}`);
            if (_.includes(err.message, 'throttled') || (err.message === 'Poloniex error 429: Too Many Requests')) {
              log.info('API activity stopped for 1 minute');
              waitOneMinute = Date.now();
            }

            return apiCallLimitDelay(apiMethod, () => callback(null));
          }

          currencies = Object.keys(result);
          return apiCallLimitDelay(apiMethod, () => callback(null));
        });
      },
      function isError() {
        return err;
      },
      function () {
        callback(null);
      }
    );
  };

  const setupConfig = function setupConfig(callback) {
    async.series(
      [
        function (callback) {
          migrateConfig((err) => {
            if(err) {
              log.error(`migrateConfig: could not migrate the config`);
            }
            callback(err);
          })
        },
        function (callback) {
          getConfig((err, result) => {
            if (err) {
              log.crit(`Cannot load config: ${err.message}`);
            } else {
              config = result;
              self.config = result;
            }
            callback(err);
          });
        },
        function initialSetup(callback) {
          currentApiKey = config.apiKey;
          poloPrivate = new Poloniex(currentApiKey.key, currentApiKey.secret, { socketTimeout: 60000 });
          setupBrowserComms();
          setupAdvisorComms();
          addTelegramLogger(config.telegramReports && config.telegramReports.telegramToken, config.telegramReports && config.telegramReports.telegramUserId);
          callback(null);
        },
      ],
      function (err) {
        callback(err);
      });
  };

  self.start = function() {
    debug("Starting...");
    status.lastRun.speedCount= 0;
    self.started = moment();
    async.parallel(
      [
        getCurrencies,
        setupConfig,
      ],
      function (err) {
        if (err) {
          log.crit(`Application could not start and will now exit!`);
          return;
        }

        log.report(config.startMessage);
        if (logTg) {
          logTg.report(config.startMessage);
        }
        execTrade();
      });
	};

	self.stop = function () {
	};
};
