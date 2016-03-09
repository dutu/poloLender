module.exports = (function() {
    'use strict';

    // Module dependencies
    var crypto  = require('crypto'),
        request = require('request'),
        nonce   = require('nonce')();

    // Constants
    var version         = '0.1.0',
        PUBLIC_API_URL  = 'https://poloniex.com/public',
        PRIVATE_API_URL = 'https://poloniex.com/tradingApi',
        USER_AGENT      = 'poloniex.js ' + version;
        //USER_AGENT    = 'Mozilla/5.0 (Windows NT 6.3; WOW64; rv:26.0) Gecko/20100101 Firefox/26.0'


    // Helper methods
    function joinCurrencies(currencyA, currencyB){
        // If only one arg, then return the first
        if (typeof currencyB !== 'string'){
            return currencyA;
        }

        return currencyA + '_' + currencyB;
    }

    function sortParameters(a, b){return 0;
        // Sort `nonce` parameter last, and the rest alphabetically
        return a === 'nonce' || a > b ? 1 : -1; 
    }


    // Constructor
    function Poloniex(key, secret){
        // Generate headers signed by this user's key and secret.
        // The secret is encapsulated and never exposed
        this._getPrivateHeaders = function(parameters){
            var paramString, signature;

            if (!key || !secret){
                throw 'Poloniex: Error. API key and secret required';
            }

            // Sort parameters alphabetically and convert to `arg1=foo&arg2=bar`
            paramString = Object.keys(parameters).sort(sortParameters).map(function(param){
                return encodeURIComponent(param) + '=' + encodeURIComponent(parameters[param]);
            }).join('&');

            signature = crypto.createHmac('sha512', secret).update(paramString).digest('hex');

            return {
                Key: key,
                Sign: signature
            };
        };
    }

    // Currently, this fails with `Error: CERT_UNTRUSTED`
    // Poloniex.STRICT_SSL can be set to `false` to avoid this. Use with caution.
    // Will be removed in future, once this is resolved.
    Poloniex.STRICT_SSL = true;

    // Customisable user agent string
    Poloniex.USER_AGENT = USER_AGENT;

    // Prototype
    Poloniex.prototype = {
        constructor: Poloniex,

        // Make an API request
        _request: function(options, callback){
            if (!('headers' in options)){
                options.headers = {};
            }

            options.json = true;
            options.headers['User-Agent'] = Poloniex.USER_AGENT;
            options.strictSSL = Poloniex.STRICT_SSL;

            request(options, function(err, response, body) {
                if (!err && response.statusCode !== 200) {
                    err =  new Error("Poloniex error " + response.statusCode + ": " + response.statusMessage);
                }
                if (!err && typeof body === 'undefined' || body === null){
                    // Empty response
                    err = new Error("Poloniex error: Empty response");
                }
                if (!err && body.error) {
                    err = new Error(body.error);
                }
                callback(err, body);
            });

            return this;
        },

        // Make a public API request
        _public: function(command, parameters, callback){
            var options;

            if (typeof parameters === 'function'){
                callback = parameters;
                parameters = {};
            }

            parameters || (parameters = {});
            parameters.command = command;
            options = {
                method: 'GET',
                url: PUBLIC_API_URL,
                qs: parameters
            };

            options.qs.command = command;
            return this._request(options, callback);
        },

        // Make a private API request
        _private: function(command, parameters, callback){
            var options;

            if (typeof parameters === 'function'){
                callback = parameters;
                parameters = {};
            }

            parameters || (parameters = {});
            parameters.command = command;
            parameters.nonce = nonce();

            options = {
                method: 'POST',
                url: PRIVATE_API_URL,
                form: parameters,
                headers: this._getPrivateHeaders(parameters)
            };

            return this._request(options, callback);
        },


        /////


        // PUBLIC METHODS

        returnTicker: function(callback){
            return this._public('returnTicker', callback);
        },

        return24Volume: function(callback){
            return this._public('return24hVolume', callback);
        },

        returnOrderBook: function(currencyA, currencyB, callback){
            var parameters = {
                    currencyPair: joinCurrencies(currencyA, currencyB)
                };
            return this._public('returnOrderBook', parameters, callback);
        },

        returnTradeHistory: function(currencyA, currencyB, callback){
            var parameters = {
                currencyPair: joinCurrencies(currencyA, currencyB)
            };
            return this._public('returnTradeHistory', parameters, callback);
        },

        returnLoanOrders: function(currency, limit, callback){
            var parameters;
            if (typeof limit === 'function'){
                callback = limit;
                parameters = {
                    currency: currency
                };
            }
            else {
                parameters = {
                    currency: currency,
                    limit: limit
                };
            }
            return this._public('returnLoanOrders', parameters, callback);
        },


        /////


        // PRIVATE METHODS

        returnBalances: function(callback){
            return this._private('returnBalances', callback);
        },

        returnCompleteBalances: function(account, callback){
            var parameters;
            if (typeof account === 'function'){
                callback = account;
                return this._private('returnCompleteBalances', callback);
            }
            else {
                parameters = {
                    account: account
                };
                return this._private('returnCompleteBalances', parameters, callback);
            }
        },

        myOpenOrders: function(currencyA, currencyB, callback){
            var parameters = {
                    currencyPair: joinCurrencies(currencyA, currencyB)
                };

            return this._private('returnOpenOrders', parameters, callback);
        },

        myTradeHistory: function(currencyA, currencyB, callback){
            var parameters = {
                    currencyPair: joinCurrencies(currencyA, currencyB)
                };

            return this._private('returnTradeHistory', parameters, callback);
        },

        buy: function(currencyA, currencyB, rate, amount, callback){
            var parameters = {
                    currencyPair: joinCurrencies(currencyA, currencyB),
                    rate: rate,
                    amount: amount
                };

            return this._private('buy', parameters, callback);
        },

        sell: function(currencyA, currencyB, rate, amount, callback){
            var parameters = {
                    currencyPair: joinCurrencies(currencyA, currencyB),
                    rate: rate,
                    amount: amount
                };

            return this._private('sell', parameters, callback);
        },

        cancelOrder: function(currencyA, currencyB, orderNumber, callback){
            var parameters = {
                    currencyPair: joinCurrencies(currencyA, currencyB),
                    orderNumber: orderNumber
                };

            return this._private('cancelOrder', parameters, callback);
        },

        withdraw: function(currency, amount, address, callback){
            var parameters = {
                    currency: currency,
                    amount: amount,
                    address: address
                };

            return this._private('withdraw', parameters, callback);
        },

        returnAvailableAccountBalances: function(account, callback){
            var parameters;
            if (typeof account === 'function'){
                callback = account;
                return this._private('returnAvailableAccountBalances', callback);
            }
            else {
                parameters = {
                    account: account
                };
                return this._private('returnAvailableAccountBalances', parameters, callback);
            }
        },

        returnTradableBalances: function(callback){
            return this._private('returnTradableBalances', callback);
        },

        createLoanOffer: function(currency, amount, duration, autoRenew, lendingRate, callback){
            var parameters = {
                currency: currency,
                amount: amount,
                duration: duration,
                autoRenew: autoRenew,
                lendingRate: lendingRate
            };
            return this._private('createLoanOffer', parameters, callback);
        },

        cancelLoanOffer: function(orderNumber, callback){
            var parameters = {
                orderNumber: orderNumber
            };
            return this._private('cancelLoanOffer', parameters, callback);
        },

        returnOpenLoanOffers: function(callback){
            return this._private('returnOpenLoanOffers', callback);
        },

        returnActiveLoans: function(callback){
            return this._private('returnActiveLoans', callback);
        }
    };
    return Poloniex;
})();
