let returnRateTemplate = function returnRateTemplate (obj) {
  return `${(parseFloat(obj.rate) * 100).toFixed(6)}%`;
};

let autoRenewTemplate = function autoRenewTemplate (obj) {
  return obj.autoRenew
    ? `<span style="color:red"><i class="fa fa-circle"></i></span>`
    : `<span style="color:green"><i class="fa fa-circle"></i></span>`;
}

let daysTemplate = function daysTemplate (obj) {
  return `${obj.duration} days`;
}

let convertToUSD = function convertToUSD (number) {
  return `$${number}`;
}

let utcToNow = function utcToNow (obj) {
  return moment.utc(obj.date).local().format('ddd MM/DD/YY hh:mma');
}

let rateBTCUSD = '0';

let bitcoinStatus = {
  id: 'bitcoinStatus',
  autoheight: true, borderless: true, type: 'clean',
  margin: margin,
  padding: 0,
  data: [],
  rows: [
    {
      autoheight: true, borderless: true, type: 'clean',
      cols: [
        { width: width_col1, autoheight: true, template: 'Bitcoin/USD:' },
        { id: 'rateBTCUSD', width: width_col2,
          template: function () {
            return convertToUSD(rateBTCUSD);
          },
        },
      ]
    }
  ]
};

let openLoansConfig = {
  id: 'openLoansInfoTable',
  view: 'datatable',
  resizeColumn: true,
  autowidth: true,
  autoheight: true,
  select: true,
  drag: true,
  scroll: false,
  columns: [
    { id: 'currency',	header: 'Currency', sort: 'string', adjust: true, tooltip: tooltip, template: returnCurrencyTemplate },
    { id: 'rate', header:'Loan Rate', sort: 'string', autowidth: true, adjust: true, tooltip: tooltip, template: returnRateTemplate  },
    { id: 'amount', header:'Amount', sort: 'string', autowidth: true, adjust: true, tooltip: tooltip  },
    { id: 'duration', header:'Duration', sort: 'string', autowidth: true, adjust: true, tooltip: tooltip, template: daysTemplate },
    { id: 'updatedAt',	header: 'Changed', autowidth: true, adjust: true, tooltip: tooltip, template: returnUpdatedAtTemplate },
  ],
  data: [],
  tooltip: true,
};

let currentLoansConfig = {
  id: 'loansInfoTable',
  view: 'datatable',
  resizeColumn: true,
  autowidth: true,
  autoheight: true,
  select: true,
  drag: true,
  scroll: false,
  columns: [
    { id: 'currency',	header: 'Currency', sort: 'string', adjust: true, tooltip: tooltip, template: returnCurrencyTemplate },
    { id: 'rate', header:'Loan Rate', sort: 'string', autowidth: true, adjust: true, tooltip: tooltip, template: returnRateTemplate  },
    { id: 'amount', header:'Amount', sort: 'string', autowidth: true, adjust: true, tooltip: tooltip  },
    { id: 'duration', header:'Duration', sort: 'string', autowidth: true, adjust: true, tooltip: tooltip, template: daysTemplate },
    { id: 'autoRenew', header:'Auto Renew', sort: 'string', autowidth: true, adjust: true, tooltip: tooltip, template: autoRenewTemplate },
    { id: 'date',	header: 'Date Issued', sort: 'string', autowidth: true, adjust: true, tooltip: tooltip, template: utcToNow},
    { id: 'fees', header:'Fees Earned', sort: 'string', autowidth: true, adjust: true, tooltip: tooltip  },
    { id: 'updatedAt',	header: 'Changed', autowidth: true, adjust: true, tooltip: tooltip, template: returnUpdatedAtTemplate },
  ],
  data: [],
  tooltip: true,
};

let liveView = {
  id: 'live',
  template: 'Live trades',
  scroll: 'xy',
  borderless: true,
  type: 'clean',
  cols: [
    { gravity: 0.2 },
    {
      type: 'clean',
      rows: [
        { view:"template", template:"Basic Info", type:"section" },
        bitcoinStatus,
        { view:"template", template:"Open Loans", type:"section" },
        openLoansConfig,
        { gravity: 0.1 },
        { view:"template", template:"Current Loans", type:"section" },
        currentLoansConfig,
        { gravity: 0.1 },
      ]
    },
    { gravity: 0.2 },
  ],
};


let openLoansInfoTable = [];
let existingRow;
const fieldsToCompare = ['currency', 'rate', 'amount', 'duration'];
let updateOpenLoansInfo = function updateOpenLoansInfo(data) {
  _.forEach(data.openLoans, function (loan) {
    existingRow = _.find(openLoansInfoTable, function(row) {
      return loan.id === row.id;
    });

    let newRow = {
      currency: loan.currency,
      rate: loan.rate,
      amount: loan.amount,
      duration: loan.duration,
      updatedAt: Date.now()
    };

    if (!existingRow || !_.isEqual(_.pick(existingRow, fieldsToCompare), _.pick(newRow, fieldsToCompare))) {
      openLoansInfoTable.push(newRow);
    }
  });
  openLoansInfoTableUi = $$('openLoansInfoTable');
  openLoansInfoTableUi.define({
    'data': _.uniq(openLoansInfoTable),
  });
  openLoansInfoTableUi.refreshColumns();
};



let loansInfoTable = [];
let existingLoanRow;
const activeLoansFieldsToCompare = ['currency', 'rate', 'amount', 'duration', 'autoRenew', 'date', 'fees'];
let updateActiveLoansInfo = function updateActiveLoansInfo(data) {
  _.forEach(data.activeLoans, function (loan) {
    existingLoansRow = _.find(loansInfoTable, function(row) {
      return loan.id === row.id;
    });

    let newRow = {
      id: loan.id,
      currency: loan.currency,
      rate: loan.rate,
      amount: loan.amount,
      duration: loan.duration,
      autoRenew: loan.autoRenew,
      date: loan.date,
      fees: loan.fees,
      updatedAt: Date.now()
    };

    if (!existingLoansRow || !_.isEqual(_.pick(existingLoansRow, activeLoansFieldsToCompare), _.pick(newRow, activeLoansFieldsToCompare))) {
      loansInfoTable.push(newRow);
    }
  });
  let loansInfoTableUi = $$('loansInfoTable');
  loansInfoTableUi.define({
    'data': _.uniq(loansInfoTable),
  });
  loansInfoTableUi.refreshColumns();
};

let loansInfoTableUi;
let openLoansInfoTableUi;
let rateBTCUSDUi = $$('rateBTCUSD');

let startRefreshingLoans = function startRefreshingLoans() {
  setInterval(function refreshTable() {
    loansInfoTableUi.refreshColumns();
    openLoansInfoTableUi.refreshColumns();
    rateBTCUSDUi.refresh();
  }, 1000);
};


let updateLoansInfo = function updateLoansInfo(data) {
  updateActiveLoansInfo(data);
  updateOpenLoansInfo(data);
  rateBTCUSD = data.rateBTCUSD;
  rateBTCUSDUi = $$('rateBTCUSD');
  //rateBTCUSDUi.refresh();
}
