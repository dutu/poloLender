let liveUpdatedAt = null;
let liveStatusUi = null;

const startRefreshingLiveUpdateStatus = function startRefreshingLiveUpdateStatus() {
  setInterval(function refreshLiveUpdateStatus() {
    liveStatusUi.refresh();
  }, 1000/8);
};

const returnLoanRateTemplate = function returnLoanRateTemplate(obj) {
  return obj.rate && `${(obj.rate * 100).toFixed(6)}%` || '';
};

const returnAmountTemplate = function returnLoanRateTemplate(obj) {
  return obj.amount && `${obj.amount.toFixed(8)}` || '';
};

const returnIssuedAtTemplate = function returnDateIssuedTemplate(obj) {
  return obj.issuedAt && formatDate(obj.issuedAt) || '';
};

const returnFeesTemplate = function returnFeesTemplate(obj) {
  return obj.fees && `${obj.fees.toFixed(8)}` || '';
};

const returnExpiresTemplate = function returnExpiresTemplate(obj) {
  return obj.expiresAt && `${formatDate(obj.expiresAt)} (${moment().to(obj.expiresAt)})` || '';
};

const returnIssuedAgoTemplate = function returnDateIssuedTemplate(obj) {
  return obj.issuedAt && `${formatDate(obj.issuedAt)} (${moment().to(obj.issuedAt)})` || '';
};

let liveStatusConfig = {
  autoheight: true, borderless: true, type: 'clean',
  cols: [
    { width: width_col1, autoheight: true, template: 'Updated:' },
    { id: 'liveStatus', width: width_col2,
      template: function (obj) {
        if (!liveUpdatedAt) {
          return '';
        }

        let activityHtml;
        const indicatorOnForMs = 1000/8;
        const banIconTimeoutMs = 60000;
        let ago = Date.now() - liveUpdatedAt;
        if (ago < indicatorOnForMs) {
          activityHtml = `<span style="color:green"><i class="fa fa-circle"></i></span>`;
        }
        if (ago >= indicatorOnForMs && ago < banIconTimeoutMs) {
          activityHtml = `<i class="fa fa-circle-o"></i>`;
        }
        // activityHtml += ` (OK ${(ok/(ok+nok)*100).toFixed(0)}%)`;
        if (ago >= banIconTimeoutMs) {
          activityHtml = `<span style="color:red"><i class="fa fa-ban"></i></span>`;
        }
        activityHtml += ` ${moment(liveUpdatedAt).fromNow(false)}`;
        return activityHtml;
      },
    },
  ]
};

let activeLoansTableConfig = {
  id: 'activeLoansTable',
  view: 'datatable',
  resizeColumn: true,
  autowidth: true,
  autoheight: true,
  select: true,
  drag: true,
  scroll: false,
  columns: [
    { id: 'currency',	header: 'Currency', sort: 'string', adjust: true, tooltip: tooltip, template: returnCurrencyTemplate },
    { id: 'rate', header:[{ text: 'Rate', css: 'table-header-center' }], autowidth: true, adjust: true, sort: "int", tooltip: tooltip, cssFormat: alignRight, template: returnLoanRateTemplate },
    { id: 'amount', header:[{ text: 'Amount', css: 'table-header-center' }], autowidth: true, adjust: true, sort: "int", tooltip: tooltip, cssFormat: alignRight, template: returnAmountTemplate },
    { id: 'duration', header: [{text: 'Duration', css: 'table-header-center' }], autowidth: true, adjust: true, sort: "int", tooltip: tooltip , cssFormat: alignCenter },
    { id: 'issuedAt', header:[{ text: 'Issued', css: 'table-header-center' }], autowidth: true, adjust: true, sort: 'date', tooltip: tooltip, cssFormat: alignRight, template: returnIssuedAtTemplate },
    { id: 'fees', header: [{text: 'Fees', css: 'table-header-center' }], adjust: true, autowidth: true, tooltip: tooltip, sort: "int", cssFormat: alignRight, template: returnFeesTemplate },
    { id: 'expiresAt', header:[{ text: 'Expires', css: 'table-header-center' }], autowidth: true, adjust: true, sort: 'date', tooltip: tooltip, template: returnExpiresTemplate },
  ],
  fixedRowHeight:false,  rowLineHeight:25, rowHeight:25,
  data: [],
  tooltip: true,
};

let openOffersTableConfig = {
  id: 'openOffersTable',
  view: 'datatable',
  resizeColumn: true,
  autowidth: true,
  autoheight: true,
  select: true,
  drag: true,
  scroll: false,
  columns: [
    { id: 'currency',	header: 'Currency', sort: 'string', adjust: true, tooltip: tooltip, template: returnCurrencyTemplate },
    { id: 'rate', header:[{ text: 'Rate', css: 'table-header-center' }], autowidth: true, adjust: true, sort: "int", tooltip: tooltip, cssFormat: alignRight, template: returnLoanRateTemplate },
    { id: 'amount', header:[{ text: 'Amount', css: 'table-header-center' }], autowidth: true, adjust: true, sort: "int", tooltip: tooltip, cssFormat: alignRight, template: returnAmountTemplate },
    { id: 'duration', header: [{text: 'Duration', css: 'table-header-center' }], autowidth: true, adjust: true, sort: "int", tooltip: tooltip , cssFormat: alignCenter },
    { id: 'issuedAt', header:[{ text: 'Issued', css: 'table-header-center' }], autowidth: true, adjust: true, sort: 'date', tooltip: tooltip, template: returnIssuedAgoTemplate },
  ],
  fixedRowHeight:false,  rowLineHeight:25, rowHeight:25,
  data: [],
  tooltip: true,
};

let liveView = {
  id: 'live',
  borderless: true,
  type: 'clean',
  sizeToContent: true,
  cols: [
    { gravity: 0.2 },
    {
      type: 'clean',
      rows: [
        { view:"template", template:"Status", type:"section" },
        liveStatusConfig,
        { gravity: 0.2 },
        { view:"template", template:"Open Offers", type:"section" },
        openOffersTableConfig,
        { gravity: 0.2 },
        { view:"template", template:"Active Loans", type:"section" },
        activeLoansTableConfig,
        { gravity: 1 },
      ]
    },
    { gravity: 0.2 },
  ],
};

let refreshLiveStatusView = function refreshLiveStatusView() {
  let visibleView = $$('contentTabview').getMultiview().getValue();
  if (visibleView !== 'liveView') {
    return;
  }

  liveUpdatedAt = Date.now();
  if (liveStatusUi) {
    liveStatusUi.refresh();
  }

  let activeLoansTableUi = $$('activeLoansTable');
  let existingData = activeLoansTableUi.data.serialize();
  let newData = _.differenceBy(activeLoans, existingData, 'id');
  let dataToParse = newData.map((activeLoan) => {
    let newActiveLoanRow = {
      id: activeLoan.id,
      currency: activeLoan.currency,
      rate: parseFloat(activeLoan.rate),
      amount: parseFloat(activeLoan.amount),
      duration: activeLoan.duration,
      issuedAt: new Date(parseInt(moment.utc(activeLoan.date).format('x'))),
      fees: parseFloat(activeLoan.fees),
      autoRenew: activeLoan.autoRenew,
    };
    newActiveLoanRow.expiresAt = new Date(newActiveLoanRow.issuedAt.getTime() + newActiveLoanRow.duration * 24 * 60 * 60 * 1000);
    if (existingData.length) {
      activeLoansTableUi.add(newActiveLoanRow, 0);
    }
    return newActiveLoanRow;
  });

  if (!existingData.length) {
    activeLoansTableUi.parse(dataToParse);
  }

  let removedData = _.differenceBy(existingData, activeLoans, 'id');
  removedData.forEach((activeLoan) => {
    activeLoansTableUi.remove(activeLoan.id);
  });

  activeLoansTableUi.eachRow((rowId) => {
    let row = activeLoansTableUi.getItem(rowId);
    row.fees = parseFloat(_.find(activeLoans, {id: rowId}).fees);
  });
  activeLoansTableUi.refresh();

  let openOffersTable = [];
  _.forEach(openOffers, (value, key) => {
    let currency = key;
    let currencyOffers = value;
    currencyOffers.forEach((openOffer) => {
      let newOpenOffer = {
        id: openOffer.id,
        currency: currency,
        rate: parseFloat(openOffer.rate),
        amount: parseFloat(openOffer.amount),
        duration: openOffer.duration,
        issuedAt: new Date(parseInt(moment.utc(openOffer.date).format('x'))),
        autoRenew: openOffer.autoRenew,
      };
      openOffersTable.push(newOpenOffer);
    })
  });
  let openOffersTableUi = $$('openOffersTable');
  existingData = openOffersTableUi.data.serialize();
  newData = _.differenceBy(openOffersTable, existingData, 'id');
  newData.reverse();

  newData.forEach((openOffer) => {
    openOffersTableUi.add(openOffer);
  });

  removedData = _.differenceBy(existingData, openOffersTable, 'id');
  removedData.forEach((openOffer) => {
    openOffersTableUi.remove(openOffer.id);
  });

  openOffersTableUi.refresh();
};

let updateLive = function updateLive(data) {
  activeLoans = data.activeLoans;
  openOffers = data.openOffers;
  refreshLiveStatusView();
};
