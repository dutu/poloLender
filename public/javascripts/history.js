const returnDurationTemplate = function returnDurationTemplate(obj) {
  return obj.duration && formatDate(obj.duration) || '';
};

const clickRefreshButton = function clickRefreshButton() {
  $$('returnLendingHistoryError').setValue('');
  let lendingHistoryTableUi = $$('lendingHistoryTable');
  lendingHistoryTableUi.clearAll();
  lendingHistoryTableUi.showProgress({ delay: 300000, hide: true });
  let formValues = $$('lendingHistoryInputForm').getValues();
  let params = {
    start: formValues.startDate.getTime() / 1000,
    end: formValues.endDate.getTime() / 1000,
    limit: formValues.limit !== 0 && formValues.limit || null,
  };
  socket.emit('returnLendingHistory', params);
};

const clickExportButton = function clickExportButton() {

};

let onPeriodChange = function onPeriodChange(newv, oldv) {
  let period = parseInt(newv);
  let startDateUi = $$('startDate');
  let endDateUi = $$('endDate');
  switch (period) {
    case 1: {
      startDateUi.setValue(new Date(parseInt(moment().subtract(1, 'days').format('x'))));
      endDateUi.setValue(new Date());
      break;
    }
    case 2: {
      startDateUi.setValue(new Date(parseInt(moment().subtract(7, 'days').format('x'))));
      endDateUi.setValue(new Date());
      break;
    }
    case 3: {
      startDateUi.setValue(new Date(parseInt(moment().subtract(1, 'months').format('x'))));
      endDateUi.setValue(new Date());
      break;
    }
  }
};

let lendingHistoryInputFormConfig = {
  id: 'lendingHistoryInputForm',
  view:"form",
  scroll:false,
  elements: [
    {
      rows: [
        {
          cols: [
            { view: 'datepicker', id: 'startDate', timepicker:true, label: 'Start date', value: new Date(parseInt(moment().subtract(7, 'days').format('x'))), format:'%Y-%m-%d %H:%i', labelPosition: 'top', name: 'startDate', width: 180 },
            { view: 'datepicker', id: 'endDate', timepicker:true, label: 'End date', labelPosition: 'top', value: new Date(), format:'%Y-%m-%d %H:%i', name: 'endDate', width: 180 },
            { view: 'counter', label: 'Limit', labelPosition: 'top', name: 'limit', step: 100, value: 50, min: 0, max: 10000 },
          ]
        },
        { view: 'radio', value: 2, name: 'period', options:[
          { id: 1, value: 'Last day' }, //the initially selected item
          { id: 2, value: 'Last week' },
          { id: 3, value: 'Last month' },
        ] },
        { view: 'label', label: '' },
        {
          cols: [
            {
              id: 'refreshButton',
              autoheight: true,
              view: 'button',
              value: 'Refresh',
              width: 120,
              type:"form",
              click: clickRefreshButton,
            },
            {
              id: 'export',
              view: 'button',
              disabled: true,
              value: 'Export',
              type:"form",
              width: 120,
              click: clickExportButton,
            },
          ]
        },
        { view: 'label', id: 'returnLendingHistoryError', label: '' },
      ]
    }
  ]
};

let lendingHistoryTableConfig = {
  id: 'lendingHistoryTable',
  view: 'datatable',
  resizeColumn: true,
  autowidth: true,
  autoheight: true,
  minHeight: 200,
  minWidth: 898,
  select: true,
  drag: true,
  scroll: false,
  columns: [
    { id: 'currency',	header: 'Currency', sort: 'string', adjust: true, tooltip: tooltip, template: returnCurrencyTemplate },
//    { id: 'id', header:[{ text: 'Id', css: 'table-header-center' }], autowidth: true, adjust: true, sort: "string", tooltip: tooltip, cssFormat: alignRight },
    { id: 'rate', header:[{ text: 'Rate', css: 'table-header-center' }], autowidth: true, adjust: true, sort: "int", tooltip: tooltip, cssFormat: alignRight, template: returnLoanRateTemplate },
    { id: 'amount', header:[{ text: 'Amount', css: 'table-header-center' }], autowidth: true, adjust: true, sort: "int", tooltip: tooltip, cssFormat: alignRight, format: formatAmount },
    { id: 'duration', header: [{text: 'Duration', css: 'table-header-center' }], autowidth: true, adjust: true, sort: "int", tooltip: tooltip , cssFormat: alignRight, format: formatDurationFromDays },
    { id: 'interest', header: [{text: 'Interest', css: 'table-header-center' }], adjust: true, autowidth: true, tooltip: tooltip, sort: "int", cssFormat: alignRight, format: formatAmount },
    { id: 'fee', header: [{text: 'Fee', css: 'table-header-center' }], adjust: true, autowidth: true, tooltip: tooltip, sort: "int", cssFormat: alignRight, format: formatAmount },
    { id: 'earned', header: [{text: 'Earned', css: 'table-header-center' }], adjust: true, autowidth: true, tooltip: tooltip, sort: "int", cssFormat: alignRight, format: formatAmount },
    { id: 'openAt', header:[{ text: 'Open', css: 'table-header-center' }], autowidth: true, adjust: true, sort: 'date', tooltip: tooltip, cssFormat: alignRight, format: formatDate },
    { id: 'closedAt', header:[{ text: 'Closed', css: 'table-header-center' }], autowidth: true, adjust: true, sort: 'date', tooltip: tooltip, cssFormat: alignRight, format: formatDate },
  ],
  fixedRowHeight:false,  rowLineHeight:25, rowHeight:25,
  data: [],
  tooltip: true,
};

let historyView = {
  id: 'history',
  borderless: true,
  type: 'clean',
  sizeToContent: true,
  cols: [
    { gravity: 0.1 },
    {
      type: 'clean',
      rows: [
        { view:"template", template:"Lending History", type:"section" },
        lendingHistoryInputFormConfig,
        lendingHistoryTableConfig,
        { gravity: 1 },
      ]
    },
    { gravity: 0.1 },
  ],
};

let updateLendingHistory = function updateLendingHistory(errMessage, result) {
  let lendingHistoryTableUi = $$('lendingHistoryTable');
  lendingHistoryTableUi.clearAll();
  lendingHistoryTableUi.hideProgress();

  if (errMessage) {
    $$('returnLendingHistoryError').setValue(errMessage);
    return;
  }

  $$('returnLendingHistoryError').setValue(`Fetched ${result.length} loans`);
  let lendingHistoryTable = [];
  result.forEach((loan) => {
    let newLoan = {
      id: loan.id,
      currency: loan.currency,
      rate: parseFloat(loan.rate),
      amount: parseFloat(loan.amount),
      duration: loan.duration,
      interest: parseFloat(loan.interest),
      fee: parseFloat(loan.fee),
      earned: parseFloat(loan.earned),
      openAt: new Date(parseInt(moment.utc(loan.open).format('x'))),
      closedAt: new Date(parseInt(moment.utc(loan.close).format('x'))),
    };
    lendingHistoryTable.push(newLoan);
  });

  lendingHistoryTableUi.clearAll();
  lendingHistoryTableUi.define({
    'data': lendingHistoryTable,
  });
  lendingHistoryTableUi.refreshColumns();
};
