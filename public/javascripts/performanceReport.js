

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
  return obj.startBalance && `${parseFloat(obj.startBalance).toFixed(8)})` || '';
};

const returnProfitTemplate = function returnProfitTemplate(obj) {
  return obj.profit && `${obj.profit.toFixed(8)} (${(obj.profitPerDay.toFixed(3))}/day)` || '';
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

const returnWmrPerYearTemplate = function returnWmrPerYearTemplate(obj) {
  if (!obj.wmr) {
    return '';
  }

  return `${(obj.wmr * 365).toFixed(1)}%`;
};

const returnWmrPerYearCiTemplate = function returnWmrPerYearCiTemplate(obj) {
  if (!obj.wmr) {
    return '';
  }

  let paCi = finance.CI(parseFloat(obj.wmr) * 365 / 182, 1, 100, 182) - 100;
  return `${paCi.toFixed(1)}%`;
};

const returnEwmrTemplate = function returnEwmrTemplate(obj) {
  if (!obj.wmr) {
    return '';
  }

  return `${(parseFloat(obj.wmr) * 0.85).toFixed(6)}%`;
};

const returnEwmrPerYearTemplate = function returnEwmrPerYearTemplate(obj) {
  if (!obj.wmr) {
    return '';
  }

  return `${(obj.wmr * 365 * 0.85).toFixed(1)}%`;
};

const returnEwmrPerYearCiTemplate = function returnEwmrPerYearCiTemplate(obj) {
  if (!obj.wmr) {
    return '';
  }

  let paCi = finance.CI(parseFloat(obj.wmr) * 365 * 0.85 / 182, 1, 100, 182) - 100;
  return `${paCi.toFixed(1)}%`;
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
    { id: 'activeLoansCount', header: [{text: 'Active loans', colspan: 2, css: 'table-header-center' },{ text: 'Count' }], adjust: 'data', autowidth: true, tooltip: tooltip },
    { id: 'activeLoansAmount', header:[null, { text: 'Amount', css: 'table-header-center' }], autowidth: true, adjust: true, tooltip: tooltip, cssFormat: alignRight },
    { id: 'profit', header: [{text: 'Profit', colspan: 2, css: 'table-header-center' }, {text: 'Currency', css: 'table-header-center' }], autowidth: true, adjust: true, sort: "int", tooltip: tooltip, template: returnProfitTemplate, cssFormat: alignRight },
    { id: 'profitUSD', header:[null, {text: 'Worth USD', css: 'table-header-center' }], autowidth: true, autoheight: true, adjust: true, tooltip: tooltip, template: returnProfitUSDTemplate, cssFormat: alignRight },
    { id: 'wmr', header: [{text: 'Weighted mean rate', colspan: 3, css: 'table-header-center' },{ text: '/day', css: 'table-header-center' }], autowidth: false, adjust: true, sort: "int", tooltip: tooltip, template: returnWmrTemplate, cssFormat: alignRight },
    { id: 'wmrPerYear', header:[null, { text: '/year', css: 'table-header-center' }], autowidth: true, adjust: true, tooltip: tooltip, template: returnWmrPerYearTemplate, cssFormat: alignRight },
    { id: 'wmrPerCiYear', header:[null, { text: '/year Ci', css: 'table-header-center' }], autowidth: true, adjust: true, tooltip: tooltip, template: returnWmrPerYearCiTemplate, cssFormat: alignRight },
    { id: 'ewmr', header: [{text: 'Effective weighted mean rate', colspan: 3, css: 'table-header-center' },{ text: '/day', css: 'table-header-center' }], autowidth: false, adjust: true, sort: "int", tooltip: tooltip, template: returnEwmrTemplate, cssFormat: alignRight },
    { id: 'ewmrPerYear', header:[null, { text: '/year', css: 'table-header-center' }], autowidth: true, adjust: true, tooltip: tooltip, template: returnEwmrPerYearTemplate, cssFormat: alignRight },
    { id: 'ewmrPerCiYear', header:[null, { text: '/year Ci', css: 'table-header-center' }], autowidth: true, adjust: true, tooltip: tooltip, template: returnEwmrPerYearCiTemplate, cssFormat: alignRight },
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
        { gravity: 1 },
      ]
    },
    { gravity: 0.2 },
  ],
};

let performanceReportTable = [];
let updatePerformanceReport = function updatePerformanceReport(data) {
  let runningDays = parseFloat(moment().diff(poloLenderApp.runningSince, "minutes", true).toString()) / 60 / 24;
  _.forEach(data, (value, key) => {
    let currency = key;
    let performanceData = value;
    const toUSD = function toUSD(amount) {
      if (!performanceData.rateBTC || !performanceData.rateBTCUSD || !amount) {
        return 0;
      }
      return (parseFloat(amount) * parseFloat(performanceData.rateBTC) * parseFloat(performanceData.rateBTCUSD));
    };
    let existingCurrencyDataIndex = _.findIndex(performanceReportTable, { currency: key });
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
    newRow.rateBTCChange = existingCurrencyData && (Math.sign(newRow.rateBTC - existingCurrencyData.rateBTC) || existingCurrencyData.rateBTCChange) || 0;
    newRow.rateBTCUSDChange = existingCurrencyData && (Math.sign(newRow.rateBTCUSD - existingCurrencyData.rateBTCUSD) || existingCurrencyData.rateBTCUSDChange) || 0;
    newRow.wmrChange = existingCurrencyData && (Math.sign(newRow.rateBTC - existingCurrencyData.rateBTC) || existingCurrencyData.wmrChange) || 0;
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
