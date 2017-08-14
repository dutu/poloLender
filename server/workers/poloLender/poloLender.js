import ioClient from 'socket.io-client';
import _ from 'lodash';
import Big from 'big.js';
import moment from 'moment';
import async from 'async';
import debug from 'debug';
import Bitfinex from 'bitfinex';
import semver from 'semver';
import Poloniex from 'poloniex-api-node';
import uniqid from 'uniqid';

import { httpServerStart } from '../../httpServer';
import { log, addTelegramLogger } from '../../loggers';
import { msgApy, msgLoanReturned, msgNewCredit, msgRate, strAR } from './msg';
import { migrateConfig } from './dbMigrate';
import { io } from '../../httpServer';
import { connectDb, getConfig, saveConfig } from './config';
import { debugApiCallDuration, debugCycleDuration, debugTimer } from './debug';
import { getLogTrailItems } from "./logtrail";

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
	let authClients = [];
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

  const isWriteAllowed = function isWriteAllowed(cliendId) {
    let authClient = _.find(authClients, { id: cliendId });
    return authClient && authClient.isReadWriteAllowed;
  };

  const isReadAllowed = function isReadAllowed(cliendId) {
    let authClient = _.find(authClients, { id: cliendId });
    return authClient && authClient.isReadAllowed;
  };

  const authClientsEmit = function authClientsEmit() {
    let args = [...arguments];
    _.filter(authClients, {isReadAllowed: true}).forEach((authClient) => {
      let client = io.sockets.clients().connected[authClient.id];
       if (client) {
         client.emit.apply(client, args);
       }
    });
  };

  const emitConfigUpdate = function emitConfigUpdate() {
    let configWitoutSecret = _.cloneDeep(config);
    configWitoutSecret.apiKey.secret = '●●●●●';
    authClientsEmit('configUpdate', configWitoutSecret);
  };

  const emitStatusUpdate = function emitStatusUpdate() {
    authClientsEmit('statusUpdate', status);
  };

  const emitClientMessageUpdate = function emitClientMessageUpdate() {
    authClientsEmit('clientMessageUpdate', clientMessage);
  };

  const emitApiCallUpdate = function emitApiCallUpdate(apiCallInfo) {
    let data = {
      apiCallInfo: {
        timestamp: apiCallInfo.timestamp,
        error: apiCallInfo.error,
      },
    };

    authClientsEmit('apiCallInfo', data);
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

    authClientsEmit('performanceReport', performanceReports);
  };

  const emitLiveUpdate = function emitLiveUpdate() {
    authClientsEmit('liveUpdates', liveData);
  };

  const emitAdvisorInfoUpdate = function emitAdvisorInfoUpdate() {
    authClientsEmit('advisorInfo', advisorInfo);
  };

  const onAuthorization = function onAuthorization(data) {
    let token = data;
    let authClient = {
      id: this.id,
      isReadAllowed: config.authToken.readOnly === token || config.authToken.readWrite === token,
      isReadWriteAllowed: config.authToken.readWrite === token,
    };

    let authClientIndex = _.findIndex(authClients, { id: authClient.id });
    if (authClientIndex === -1) {
      authClients.push(authClient);
    } else {
      authClients.splice(authClientIndex, 0, authClient);
    }

    let client = io.sockets.clients().connected[authClient.id];
    client.emit('authorized', authClient);

    if (authClient.isReadAllowed) {
      emitConfigUpdate();
      emitStatusUpdate();
      emitClientMessageUpdate();
      emitAdvisorInfoUpdate();
      emitPerformanceUpdate();
      emitLiveUpdate();
    }
  };

  const onValidateToken = function onValidateToken(token) {
    let authClient = {
      id: this.id,
      token: token,
      isReadAllowed: config.authToken.readOnly === token || config.authToken.readWrite === token,
      isReadWriteAllowed: config.authToken.readWrite === token,
    };

    let client = io.sockets.clients().connected[authClient.id];
    if (client) {
      client.emit('tokenValidated', authClient);
    }
  };

  const onGenerateNewToken = function onGenerateNewToken(data) {
    let clientId = this.id;
    if (!isWriteAllowed(clientId)) {
      return;
    }

    let tokenExpiresIn = data;
    let tokenExpiresOn = tokenExpiresIn === '0' ? 'never' : new Date(Date.now() + parseFloat(tokenExpiresIn) * 24 * 60 *60 * 1000);

    config.authToken = {
      readOnly: uniqid('ro-'),
      readWrite: uniqid('rw-'),
      tokenExpiresOn: tokenExpiresOn,
    };
    saveConfig(config);

    console.log(`Your read/only authorization token is: ${config.authToken.readOnly}`);
    console.log(`Your read/write authorization token is: ${config.authToken.readWrite}`);
    console.log(`Token expires on: ${config.authToken.tokenExpiresOn}`);

    let authClient = {
      id: clientId,
      token: config.authToken.readWrite,
      isReadAllowed: true,
      isReadWriteAllowed: true,
    };

    let client = io.sockets.clients().connected[clientId];
    if (client) {
      client.emit('newTokenGenerated', authClient);
    }
  };

  const onReturnLendingHistory = function onReturnLendingHistory(data) {
    poloPrivate.returnLendingHistory(data.start, data.end, data.limit, (err, result) => {
      if (err) {
        let msg = `returnLendingHistory: ${err.message}`;
        log.notice(msg);
      }

      authClientsEmit('lendingHistory', err && err.message || null, result);
    })
  };

  const onUpdateConfig = function (newConfig, source) {
    if (!isWriteAllowed(this.id)) {
      return;
    }

    if (newConfig.apiKey.secret === '●●●●●') {
      newConfig.apiKey.secret = config.apiKey.secret;
    }

    config = newConfig;
    saveConfig(config, (err, newConfig) => {
      let configWitoutSecret = _.cloneDeep(config);
      configWitoutSecret.apiKey.secret = '●●●●●';
      authClientsEmit('updatedConfig', err && err.message || null, configWitoutSecret, source);
    });
  };

  const onReturnLogtrailBuffer = function onReturnLogtrailBuffer(params) {
    let clientId = this.id;
    if (!isReadAllowed(clientId)) {
      return;
    }

    getLogTrailItems(params, (errMessage, result) => {
      let client = io.sockets.clients().connected[clientId];
      if (client) {
        client.emit('logtrailBuffer', errMessage, result);
      }
    });
  };

  const onBrowserConnection = function onBrowserConnection(socket) {
    socket.on('authorization', onAuthorization);
    socket.on(`validateToken`, onValidateToken);
    socket.on(`generateNewToken`, onGenerateNewToken);
    socket.on('returnLendingHistory', onReturnLendingHistory);
    socket.on('returnLogtrailBuffer', onReturnLogtrailBuffer);
    socket.on(`updateConfig`, onUpdateConfig);

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
      let msg = `Connected to server ${config.lendingAdvisor.server}`;
      log.info(msg);
      status.lendingAdvisor.connection = 'connected';
      emitStatusUpdate();
    });
    socket.on('reconnect', function () {
      let msg = `Reconnected to server ${config.lendingAdvisor.server}`;
      log.info(msg);
      status.lendingAdvisor.connection = 'reconnect';
      emitStatusUpdate();
    });
    socket.on("connect_error", function (err) {
      let error = JSON.parse(JSON.stringify(err));
      if (err.message) error.message = err.message;
      let msg = `Error connecting to server ${config.lendingAdvisor.server}: ${JSON.stringify(error)}`;
      log.warning(msg);
      status.lendingAdvisor.connection = `connect error ${JSON.stringify(error)}`;
      emitStatusUpdate();
    });
    socket.on("reconnect_error", function (err) {
      let error = JSON.parse(JSON.stringify(err));
      if (err.message) error.message = err.message;
      let msg = `Error reconnecting to server ${config.lendingAdvisor.server}: ${JSON.stringify(error)}`;
      log.warning(msg);
      status.lendingAdvisor.connection = `reconnect error ${JSON.stringify(error)}`;
      emitStatusUpdate();
    });
    socket.on("disconnect", function () {
      let msg = `Disconnected from server ${config.lendingAdvisor.server}`;
      log.notice(msg);
      status.lendingAdvisor.connection = 'disconnected';
      emitStatusUpdate();
    });
    socket.on("reconnecting", function (attemptNumber) {
      let msg =`Reconnecting to server ${config.lendingAdvisor.server} (${attemptNumber})`;
      log.info(msg);
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
        let msg = `Cannot parse loanOfferParameters ${smsg}`;
        log.error(msg);
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
          clientMessage.lastClientMessage = ` - Newer version available: <a href="https://github.com/dutu/poloLender/blob/master/CHANGELOG.md">${clientMessage.lastClientSemver}</a>. Please update your app!`;
        } else {
          clientMessage.lastClientMessage = '';
        }
      } else {
        let msg = `Cannot parse clientMessage ${smsg}`;
        log.error(msg);
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
        let msg = "returnActiveLoans: " + err.message;
        log.notice(msg);
        if (_.includes(err.message, 'IP has been banned')) {
          let msg = 'API activity stopped for 1 minute';
          log.info(msg);
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
        let msg = "returnOpenLoanOffers: " + err.message;
        log.notice(msg);
        if (_.includes(err.message, 'throttled') || (err.message === 'Poloniex error 429: Too Many Requests')) {
          let msg = 'API activity stopped for 1 minute';
          log.info(msg);
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
        let msg = "returnAvailableAccountBalances: " + err.message;
        log.notice(msg);
        log.notice(msg);
        if (_.includes(err.message, 'throttled') || (err.message === 'Poloniex error 429: Too Many Requests')) {
          let msg = 'API activity stopped for 1 minute';
          log.info(msg);
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
        if (!advisorInfo[currency]) {
          return callback(null)
        }

        async.forEachOfSeries(activeOffersOneCurrency,
          //for each offer in the array (for respective currency)
          function (offer, index, cb) {
            let msg;
            let offerRate;
            let amountTrading;

            offerRate = parseFloat(offer.rate);
            let recommendedRate = parseFloat(advisorInfo[currency] && advisorInfo[currency].bestReturnRate || '0.05');
            let minRate = parseFloat(new Big(config.offerMinRate[currency] || 0).div(100).toString());
            recommendedRate = Math.max(minRate, recommendedRate);
            if (offerRate === recommendedRate){
              // lend offers is on correct price
              amountTrading = new Big(depositFunds[currency]).minus(availableFunds[currency]);
              if(amountTrading.lte(config.offerMaxAmount[currency] || 9999999)) {
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
                let msg = `cancelLoanOffer: ${err.message} (#${offer.id})`;
                log.notice(msg);
                if (_.includes(err.message, 'throttled') || (err.message === 'Poloniex error 429: Too Many Requests')) {
                  let msg = 'API activity stopped for 1 minute';
                  log.info(msg);
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
        let advisorRate = parseFloat(advisorInfo[currency] && advisorInfo[currency].bestReturnRate || '0.05');
        duration = advisorInfo[currency] && advisorInfo[currency].bestDuration || '2';
        autoRenew = "0";

        let minRate = parseFloat(config.offerMinRate[currency] || 0) / 100;
        let lendingRate = Math.max(minRate, advisorRate).toString();

        if (process.env[self.me+"_NOTRADE"] === "true") {
          log.notice("Post offer: NO TRADE");
          return callback(new Error("NO TRADE"));
        }

        if (parseFloat(lendingRate) > 0.02) {
          duration = '60';
        }

        poloPrivate.createLoanOffer(currency, amount, duration, autoRenew, lendingRate, function (err, result) {
          let apiMethod = 'createLoanOffer';
          emitApiCallUpdate({ timestamp: Date.now(), apiServer: 'poloniex', apiMethod: apiMethod, params: [], error: err && err.message || null, data: null });
          if (err) {
            let msg = "createLoanOffer: " + err.message;
            log.notice(msg);
            if (_.includes(err.message, 'throttled') || (err.message === 'Poloniex error 429: Too Many Requests')) {
              let msg = 'API activity stopped for 1 minute';
              log.info(msg);
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
        let msg = "returnTicker: " + err.message;
        log.notice(msg);
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
        let msg = "bfxPublic.ticker: " + err.message;
        log.notice(msg);
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
      let minutes = now.diff(config.startDate, "minutes", true);
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
      msg += ` = ${(profit/config.startBalance[c] * 100).toFixed(2)}% (${(profit/config.startBalance[c] * 100 /(minutes/60/24) ).toFixed(3)}%/day)`;
      if(rateBTCUSD && ratesBTC[c]) {
        let rateCurrencyUSD = new Big(rateBTCUSD).times(ratesBTC[c]).toString();
        msg += ` ≈ USD ${profit.times(rateCurrencyUSD).toFixed(0)} (${profit.times(rateCurrencyUSD).div(minutes).times(60*24).toFixed(3)}/day)`;
      }
      let wmrMsg = msgRate(status.wmr[c]);
      let ewmrMsg =  msgRate(new Big(status.wmr[c]).times(0.85).toFixed(8));
      let apyMsg = msgApy(status.wmr[c]);
      msg += ` • Daily war: ${wmrMsg} ewar: ${ewmrMsg} • APY: ${apyMsg} • alht: ${advisorInfo[c] && advisorInfo[c].averageLoanHoldingTime || ''}`;
      logRep(msg);
    });
  };

  let currentApiKey = {};
  let currentTelegramUserInfo = {};
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

            if (currentTelegramUserInfo.telegramUserId !== config.telegramReports.telegramUserId || currentTelegramUserInfo.telegramToken !== config.telegramReports.telegramToken) {
              currentTelegramUserInfo.telegramUserId = config.telegramReports.telegramUserId;
              currentTelegramUserInfo.telegramToken = config.telegramReports.telegramToken;
              logTg = addTelegramLogger(config.telegramReports && config.telegramReports.telegramToken, config.telegramReports && config.telegramReports.telegramUserId);
            }

            if (!config.isTradingEnabled && newConfig.isTradingEnabled) {
              let msg  = 'execTrades: Lending engine has been enabled!';
              log.info(msg);
            }

            if (config.isTradingEnabled && !newConfig.isTradingEnabled) {
              let msg = 'execTrades: Lending engine has been disabled!';
              log.warning(msg);
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
                      let msg = `execTrades: Lending engine will be disabled`;
                      log.warning(msg);
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
            let msg = 'API activity resumed';
            log.info(msg);
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
            let msg = `${apiMethod}: ${err.message}`;
            log.notice(msg);
            if (_.includes(err.message, 'throttled') || (err.message === 'Poloniex error 429: Too Many Requests')) {
              let msg = 'API activity stopped for 1 minute';
              log.info(msg);
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
          if (!config.authToken || !config.authToken.readOnly || !config.authToken.readWrite) {
            config.authToken = {
              readOnly: uniqid('ro-'),
              readWrite: uniqid('rw-'),
              tokenExpiresOn: 'never',
            };
            saveConfig(config)
          }

          console.log(`Your read/only authorization token is: ${config.authToken.readOnly}`);
          console.log(`Your read/write authorization token is: ${config.authToken.readWrite}`);
          console.log(`Token expires on: ${config.authToken.tokenExpiresOn}`);

          httpServerStart(config.port);
          currentApiKey = config.apiKey;
          poloPrivate = new Poloniex(currentApiKey.key, currentApiKey.secret, { socketTimeout: 60000 });
          setupBrowserComms();
          setupAdvisorComms();
          logTg = addTelegramLogger(config.telegramReports && config.telegramReports.telegramToken, config.telegramReports && config.telegramReports.telegramUserId);
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
    async.series(
      [
        setupConfig,
        getCurrencies,
      ],
      function (err) {
        if (err) {
          log.crit(`Application could not start and will now exit!`);
          return;
        }

        log.report(config.startMessage);
        if (logTg && config.telegramReports.isEnabled) {
          logTg.report(config.startMessage);
        }
        execTrade();
      });
	};

	self.stop = function () {
	};
};
