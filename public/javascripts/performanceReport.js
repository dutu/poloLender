let rateBTCUSD;

const returnRateBTCTemplate = function returnCurrencyTemplate(obj) {
  let rate;
  let change;
  if (obj.currency === 'BTC') {
    rate = obj.rateBTCUSD && `USD ${new Big(obj.rateBTCUSD).toPrecision(5)}`;
    change = obj.rateBTCUSDChange;
  } else {
    rate = obj.rateBTC && `BTC ${new Big(obj.rateBTC).toPrecision(5)}`;
    change = obj.rateBTCUSDChange;
  }

  if (!rate) {
    return '';
  }

  let changeIcon = ['down', 'right', 'up'][change + 1];
  let changeColor = ['red', 'black', 'green'][change + 1];
  return `${rate} <span style='color:${changeColor}' class='webix_icon fa-caret-${changeIcon}'></span>`;

};

const returnTotalFundsTemplate = function returnTotalFundsTemplate(obj) {
  return obj.totalFunds && `${parseFloat(obj.totalFunds).toFixed(8)}` || '';
};

const returnProfitTemplate = function returnProfitTemplate(obj) {
  return `${obj.profit.toFixed(8)} (${obj.profitPerDay.toFixed(3)}/day)`;
};

const returnProfitPercTemplate = function returnProfitUSDTemplate(obj) {
  return `${obj.profitPerc.toFixed(2)}% (${obj.profitPercPerDay.toFixed(3)}%/day)`;
};

const returnProfitUSDTemplate = function returnProfitUSDTemplate(obj) {
  if (!obj.rateBTC || !obj.rateBTCUSD) {
    return '';
  }

  let profitUSD = parseFloat(obj.profit) * parseFloat(obj.rateBTC) * parseFloat(obj.rateBTCUSD);
  let profitUSDPerDay = parseFloat(obj.profitPerDay) * parseFloat(obj.rateBTC) * parseFloat(obj.rateBTCUSD);
  return `${profitUSD.toFixed(0)} (${profitUSDPerDay.toFixed(2)}/day)`;
};

const returnWmrTemplate = function returnWmrTemplate(obj) {
  if (!obj.wmr) {
    return '';
  }

  let changeIcon = ['down', 'right', 'up'][obj.wmrChange + 1];
  let changeColor = ['red', 'black', 'green'][obj.wmrChange + 1];
  return `${parseFloat(obj.wmr).toFixed(6)}%<span style='color:${changeColor}' class='webix_icon fa-caret-${changeIcon}'></span>`;
};

const returnEwmrTemplate = function returnEwmrTemplate(obj) {
  if (!obj.wmr) {
    return '';
  }

  return `${(parseFloat(obj.wmr) * 0.85).toFixed(6)}%`;
};

const returnAPYTemplate = function returnAPYTemplate(obj) {
  if (!obj.wmr) {
    return '';
  }

  let apy = finance.CI(parseFloat(obj.wmr) * 365 * 0.85 / 182, 1, 100, 182) - 100;
  return `${apy.toFixed(1)}%`;
};

let performanceReportTableConfig = {
  id: 'performanceReportTable',
  view: 'datatable',
  resizeColumn: true,
  autowidth: true,
  autoheight: true,
  select: true,
  drag: true,
  scroll: false,
  columns: [
    { id: 'currency',	header: '', sort: 'string', adjust: true, tooltip: tooltip, template: returnCurrencyTemplate },
    { id: 'rateBTC', header:[{ text: 'Rate', css: 'table-header-center' }], autowidth: true, adjust: true, tooltip: tooltip, template: returnRateBTCTemplate },
    { id: 'startBalance', header:[{ text: 'Start balance', css: 'table-header-center' }], autowidth: true, adjust: true, sort: "int", tooltip: tooltip, cssFormat: alignRight },
    { id: 'totalFunds', header: [{text: 'Current balance', colspan: 2, css: 'table-header-center' }, { text: 'Amount', css: 'table-header-center' }], autowidth: true, adjust: true, sort: "int", tooltip: tooltip , cssFormat: alignRight, template: returnTotalFundsTemplate },
    { id: 'totalFundsUSD', header:[null, { text: 'Worth USD', css: 'table-header-center' }], autowidth: true, adjust: true, tooltip: tooltip, cssFormat: alignRight },
    { id: 'activeLoansCount', header: [{text: 'Active loans', colspan: 2, css: 'table-header-center' },{ text: 'Count' }], adjust: 'data', autowidth: true, minWidth: 51, cssFormat: alignCenter, tooltip: tooltip },
    { id: 'activeLoansAmount', header:[null, { text: 'Amount', css: 'table-header-center' }], autowidth: true, adjust: true, tooltip: tooltip, cssFormat: alignRight },
    { id: 'profit', header:[{text: 'Profit', colspan: 3, css: 'table-header-center' }, {text: 'Currency', css: 'table-header-center' }], autowidth: true, autoheight: true, adjust: true, tooltip: tooltip, template: returnProfitTemplate, cssFormat: alignRight },
    { id: 'profitPerc', header: [null, {text: '%', css: 'table-header-center' }], autowidth: true, adjust: true, sort: "int", tooltip: tooltip, template: returnProfitPercTemplate, cssFormat: alignRight },
    { id: 'profitUSD', header:[null, {text: 'Worth USD', css: 'table-header-center' }], autowidth: true, autoheight: true, adjust: true, tooltip: tooltip, template: returnProfitUSDTemplate, cssFormat: alignRight },
    { id: 'wmr', header: [{text: '<span title="Weighted average rate of active loans">Weighted average rate<sup><i class="webix_icon fa-question-circle-o" style="font-size: 95%"></i></sup></span>', colspan: 2, css: 'table-header-center' },{ text: 'Daily', css: 'table-header-center' }], autowidth: false, adjust: true, sort: "int", tooltip: tooltip, template: returnWmrTemplate, cssFormat: alignRight, tooltip: 'Weighted average rate of active loans' },
    { id: 'ewmr', header: [null, {text: '<span title="Daily rate minus Poloniex commision">effective<sup><i class="webix_icon fa-question-circle-o" style="font-size: 95%"></i></sup></span>', css: 'table-header-center' }], autowidth: false, adjust: true, sort: "int", tooltip: tooltip, template: returnEwmrTemplate, cssFormat: alignRight, tooltip: 'daily rate minus Poloniex commision' },
    { id: 'apy', header:[{ text: '<span title="Annual Percentage Yield">APY<sup><i class="webix_icon fa-question-circle-o" style="font-size: 95%"></i></sup></span>', css: 'table-header-center' }], autowidth: true, adjust: true, tooltip: tooltip, template: returnAPYTemplate, cssFormat: alignRight, tooltip: 'Annual Percentage Yield' },
  ],
  fixedRowHeight:false,  rowLineHeight:25, rowHeight:25,
/*
  on:{
    onAfterLoad:function(){
      webix.delay(function(){
        this.adjustColumn("ewmr");
        this.render();
      }, this);
    },
    onDataUpdate:function(){
      this.adjustColumn("ewmr");
      this.render();
    }
  },
*/
  data: [],
  tooltip: true,
};

let btcAddress = '16oQxZYyFbS5Anju7EUAxTEUq7hBm3qfyu';
let btcDonationsReceived = 0;
let btcDonationsCount = 0;
let usdDonationsReceived = 0;

let donationsConfig = {
  autoheight: true, borderless: true, type: 'clean',
  rows: [
    { template: 'poloLender is a free service<br> If it helped you in any way, if you would to contribute to the project and see it continue as a free service, <br>You can <b>make a donation</b> at BTC address below', autoheight: true,  },
    {
      cols: [
        { view: 'text', width: inputTextWidth * 1.5, readonly: true, value: btcAddress, inputAlign: 'center',},
        {
          view: 'button',
          id: `donationsDonateButton`,
          tooltip: 'Donate bitcoin',
          width: 60,
          type: "htmlbutton", label:"<span class='webix_icon fa-bitcoin'></span>",
          click: function () {
            window.open(`bitcoin:${btcAddress}?amount=0.005`)
          }
        },
        {
          view: 'button',
          id: `donationsCopyButton`,
          tooltip: 'Copy address to clipboard',
          width: 60,
          type: "htmlbutton", label:"<span class='webix_icon fa-copy'></span>",
          click: function () {
            let text = btcAddress;
            if (window.clipboardData && window.clipboardData.setData) {
              // IE specific code path to prevent textarea being shown while dialog is visible.
              return clipboardData.setData("Text", text);

            } else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
              let textarea = document.createElement("textarea");
              textarea.textContent = text;
              textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in MS Edge.
              document.body.appendChild(textarea);
              textarea.select();
              try {
                document.execCommand("copy");  // Security exception may be thrown by some browsers.
                webix.message('BTC address copied to clipboard');
                return;
              } catch (ex) {
                console.warn("Copy to clipboard failed.", ex);
                return false;
              } finally {
                document.body.removeChild(textarea);
              }
            }
          }
        },
        {
          view: 'button',
          id: `donationsScanButton`,
          tooltip: 'Scan QR Code',
          width: 60,
          type: "htmlbutton", label:"<span class='webix_icon fa-qrcode'></span>",
          click: function () {
            authUi = webix.ui({
              view: 'window',
              head: 'poloLender Pro donations',
              modal: true,
              position: 'center',
              autoheight: true,
              width: 450,
              borderless: true, type: 'clean',
              body: {
                rows: [
                  {gravity: 0.2},
                  {
                    cols: [
                      {},
                      {template: `<img src="http://i.imgur.com/cIfRJuU.png" alt="${btcAddress}">`, height: 160},
                      {},
                    ],
                  },
                  {
                    cols: [
                      {},
                      { view: 'text', width: inputTextWidth * 1.5, readonly: true, value: btcAddress, inputAlign: 'center',},
                      {},
                    ],
                  },
                  {gravity: 0.2},
                  {
                    cols :[
                      {},
                      { view: 'button', width: buttonWidth, value: 'Close', type: 'danger',
                        click: function (elementId, event) {
                          authUi.hide();
                        }
                      },
                      {gravity: 0.05},
                    ]
                  }
                ],
              },
              move: true,
            });
            authUi.show();
          }
        },
        {},
      ]
    },
    { id: 'dotationsSoFar', template: function (obj) {
      let msg  = `<br>${btcDonationsCount} donations since July 1, 2017: BTC ${btcDonationsReceived} (USD ${Math.round(btcDonationsReceived * rateBTCUSD) || 0})`;
      msg += '<br>If you have made a donation please also feel free to <a href="mailto:dutu@protonmail.com">drop me a message</a>.';
      msg += '<br>We continue adding features and developing new software, contributors will have priority access to free and premium features/services.';
      return msg;
    }},
    {},
  ]

};

let performanceReportView = {
  id: 'performanceReport',
  borderless: true,
  type: 'clean',
  sizeToContent: true,
  cols: [
    { gravity: 0.2 },
    {
      type: 'clean',
      rows: [
        { view:"template", template:"Performance report", type:"section" },
        performanceReportTableConfig,
        { gravity: 0.2 },
        { view:"template", template:"Donations", type:"section" },
        donationsConfig,
        { gravity: 1 },
      ]
    },
    { gravity: 0.2 },
  ],
};


let performanceReportTable = [];
let performanceReportData = {};

let refreshPerformanceView = function refreshPerformanceView() {
  let visibleView = $$('contentTabview').getMultiview().getValue();
  if (visibleView !== 'performanceView') {
    return;
  }

  $$('dotationsSoFar').refresh();
  let runningDays = parseFloat(moment().diff(poloLenderAppStatusData.runningSince, "minutes", true).toString()) / 60 / 24;
  lendingCurrencies.slice().reverse().forEach((currency) => {
    let performanceData = performanceReportData[currency];
    let existingCurrencyDataIndex = _.findIndex(performanceReportTable, { currency: currency });

    if (existingCurrencyDataIndex > -1 && !performanceData) {
      performanceReportTable.splice(existingCurrencyDataIndex, 1);
    }

    if (!performanceData) {
      return;
    }

    const toUSD = function toUSD(amount) {
      if (!performanceData.rateBTC || !performanceData.rateBTCUSD || !amount) {
        return 0;
      }
      return (parseFloat(amount) * parseFloat(performanceData.rateBTC) * parseFloat(performanceData.rateBTCUSD));
    };
    let existingCurrencyData = existingCurrencyDataIndex > -1 && performanceReportTable[existingCurrencyDataIndex] || null;
    let newRow = {
      currency: currency,
      rateBTC: performanceData.rateBTC || '',
      rateBTCUSD: performanceData.rateBTCUSD || '',
      startBalance: performanceData.startBalance,
      totalFunds: performanceData.totalFunds || 0,
      totalFundsUSD: toUSD(performanceData.totalFunds).toFixed(0),
      activeLoansCount: performanceData.activeLoansCount || 0,
      activeLoansAmount: performanceData.activeLoansAmount || '',
      bestReturnRate: performanceData.bestReturnRate || '',
      profit: (parseFloat(performanceData.totalFunds) - parseFloat(performanceData.startBalance)) || 0,
      wmr: performanceData.wmr,
    };
    newRow.profitPerDay = runningDays && parseFloat(newRow.profit) / runningDays;
    newRow.profitPerc = newRow.profit / parseFloat(performanceData.startBalance) * 100;
    newRow.profitPercPerDay = runningDays && newRow.profitPerc / runningDays;
    newRow.rateBTCChange = existingCurrencyData && (Math.sign(newRow.rateBTC - existingCurrencyData.rateBTC) || existingCurrencyData.rateBTCChange) || 0;
    newRow.rateBTCUSDChange = existingCurrencyData && (Math.sign(newRow.rateBTCUSD - existingCurrencyData.rateBTCUSD) || existingCurrencyData.rateBTCUSDChange) || 0;
    newRow.wmrChange = existingCurrencyData && (Math.sign(newRow.wmr - existingCurrencyData.wmr) || existingCurrencyData.wmrChange) || 0;
    rateBTCUSD = parseFloat(performanceData.rateBTCUSD) || 0;
    if (existingCurrencyDataIndex === -1) {
      performanceReportTable.push(newRow);
    } else {
      performanceReportTable.splice(existingCurrencyDataIndex, 1, newRow);
    }
  });

  let performanceReportTableUi = $$('performanceReportTable');
  performanceReportTableUi.clearAll();
  performanceReportTableUi.define({
    'data': performanceReportTable,
  });
  performanceReportTableUi.refreshColumns();
  ['totalFunds', 'wmr', 'ewmr'].forEach((row) => {
    performanceReportTableUi.adjustColumn(row, 'data');
  });
};

let startUpdateDonations = function startUpdateDonations() {
  webix.ajax(`https://blockexplorer.com/api/addr/${btcAddress}`, function (text,data) {
    let jsonData = JSON.parse(text);
    btcDonationsReceived = jsonData.totalReceived || 0;
    btcDonationsCount = jsonData.txApperances || 0;
    $$('dotationsSoFar').refresh();
    setTimeout(startUpdateDonations, 60 * 1000);
  });
};

let updatePerformanceReport = function updatePerformanceReport(data) {
  performanceReportData = data;
  refreshPerformanceView();
};

