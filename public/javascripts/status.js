let poloLenderApp = {
  lastClientMessage: '',
  runningClientSemver: '',
  restartedAt: '',
};

let advisor = {
  server: '',
  connection: '',
};

let poloLenderAppConnection = '';

let width_col1 = 130;
let width_col2 = 300;
let margin = -6;

let ok = 0;
let nok = 0;

let poloLenderAppConfig = {
  id: 'poloLenderApp',
  autoheight: true, borderless: true, type: 'clean',
  margin: margin,
  padding: 0,
  rows: [
    {
      autoheight: true, borderless: true, type: 'clean',
      cols: [
        { width: width_col1, autoheight: true, template: 'Version:' },
        { id: 'poloLenderApp_version', width: width_col2,
          template: function (obj) {
            return `<b>${poloLenderApp.runningClientSemver}</b> ${poloLenderApp.lastClientMessage}`;
          },
        },
      ]
    },
    {
      autoheight: true, borderless: true, type: 'clean',
      cols: [
        { width: width_col1, autoheight: true, template: 'Restarted:' },
        { id: 'poloLenderApp_restartedAt', width: width_col2,
          template: function (obj) {
            let date = new Date(poloLenderApp.restartedAt);
            return `<b>${webix.i18n.longDateFormatStr(date)}, ${webix.i18n.timeFormatStr(date)} (${moment(date).fromNow(false)})</b>`;
          }
        },
      ]
    },
    {
      autoheight: true, borderless: true, type: 'clean',
      cols: [
        { width: width_col1, autoheight: true, template: 'Poloniex API activity:' },
        { id: 'poloLenderApp_apiActivity', width: width_col2,
          template: function (obj) {
            let activityHtml;
            const indicatorOnForMs = 150;
            const banIconTimeoutMs = 60000;
            let ago = Date.now() - obj.apiCallInfo.timestamp;
            if (ago < indicatorOnForMs) {
              if (obj.apiCallInfo.error) {
                activityHtml = `<span style="color:red"><i class="fa fa-circle"></i></span>`;
                nok++;
              } else {
                activityHtml = `<span style="color:green"><i class="fa fa-circle"></i></span>`;
                ok++;
              }
            }
            if (ago >= indicatorOnForMs && ago < banIconTimeoutMs) {
              activityHtml = `<i class="fa fa-circle-o"></i>`;
            }
            // activityHtml += ` (OK ${(ok/(ok+nok)*100).toFixed(0)}%)`;
            if (ago >= banIconTimeoutMs) {
              activityHtml = `<span style="color:red"><i class="fa fa-ban"></i></span>`;
              if (obj.apiCallInfo.timestamp) {
                activityHtml += ` (last seen ${moment(obj.apiCallInfo.timestamp).fromNow(false)})`;
              }
            }
            return activityHtml;
          },
          data: { apiCallInfo: { error: null, timestamp: 0} },
        },
      ]
    },
  ],
};

let advisorConnectionConfig = {
  id: 'advisorConnection',
  autoheight: true, borderless: true, type: 'clean',
  margin: margin,
  padding: 0,
  rows: [
    {
      autoheight: true, borderless: true, type: 'clean',
      cols: [
        { width: width_col1, autoheight: true, template: 'Running at:' },
        { id: 'advisorConnection_server', width: width_col2,
          template: function (obj) { return `<b>${advisor.server}</b>`; }
        },
      ]
    },
    {
      autoheight: true, borderless: true, type: 'clean',
      cols: [
        { width: width_col1, autoheight: true, template: 'Connection status:' },
        { id: 'advisorConnection_status', width: width_col2,
          template: function (obj) { return `<b>${poloLenderAppConnection === 'connected' && advisor.connection || 'unknown'}</b>`; },
        },
      ]
    },
  ],
};

let tooltip = function tooltip(obj) {
  if (obj.tooltip) {
    return obj.tooltip;
  }

  return '';
};

let returnCurrencyTemplate = function returnCurrencyTemplate (obj) {
  return `<i class="cc ${obj.currency}"></i> ${obj.currency}`;
};

let returnUpdatedAtTemplate = function returnUpdatedAtTemplate (obj) {
  return `${moment(obj.updatedAt).fromNow(false)}`;
};

let returnBestReturnRateTemplate = function returnUpdatedAtTemplate (obj) {
  return `${(parseFloat(obj.bestReturnRate) * 100).toFixed(6)}%`;
};

let advisorInfoTableConfig = {
  id: 'advisorInfoTable',
  view: 'datatable',
  resizeColumn: true,
  autowidth: true,
  autoheight: true,
  select: true,
  drag: true,
  scroll: false,
  columns: [
    { id: 'currency',	header: 'Currency', sort: 'string', adjust: true, tooltip: tooltip, template: returnCurrencyTemplate },
    { id: 'averageLoanHoldingTime', header:'Average loan holding time', autowidth: true, adjust: true, tooltip: tooltip  },
    { id: 'bestReturnRate', header:'Best loan rate', autowidth: true, adjust: true, sort: 'string', tooltip: tooltip, template: returnBestReturnRateTemplate },
    { id: 'bestDuration', header:'Best loan duration', autowidth: true, adjust: true, tooltip: tooltip  },
    { id: 'updatedAt',	header: 'Changed', autowidth: true, adjust: true, tooltip: tooltip, template: returnUpdatedAtTemplate },
  ],
  data: [],
  tooltip: true,
};

let statusView = {
  id: 'status',
  scroll: 'xy',
  borderless: true,
  type: 'clean',
  cols: [
    { gravity: 0.2 },
    {
      type: 'clean',
      rows: [
        { view:"template", template:"poloLender Pro App", type:"section", css: 'section webix_section' },
        poloLenderAppConfig,
        { gravity: 0.1 },
        { view:"template", template:"poloLending-Advisor Server", type:"section" },
        advisorConnectionConfig,
        { gravity: 0.1 },
        { view:"template", template:"poloLending-Advisor Info", type:"section" },
        advisorInfoTableConfig,
        { gravity: 0.05 },
        {
          id: 'clientMessage',
          autoheight: true,
          css: 'client-message',
          template: function (obj) {
            return obj.message;
          },
          data: { message: '' },
        },
        { gravity: 1 },
      ]
    },
    { gravity: 0.2 },
  ],
};


let updatePoloLenderApp = function updatePoloLenderApp(data) {
  if (data) {
    poloLenderApp = data.poloLenderApp;
  }

  $$('poloLenderApp_version').refresh();
  poloLenderApp_restaredAtUi.refresh();
  $$('advisorConnection_status').refresh();
  $$('advisorConnection_server').refresh();
};

let updateAdvisorConnection = function updateAdvisorConnection(data) {
  advisor.server = data.advisor.server;
  advisor.connection = data.advisor.connection;
  $$('advisorConnection_status').refresh();
  $$('advisorConnection_server').refresh();
};

let updateClientMessage = function updateClientMessage(data) {
  poloLenderApp.lastClientSemver = _.has(data, 'clientMessage.lastClientSemver') && data.clientMessage.lastClientSemver || null;
  poloLenderApp.lastClientMessage = _.has(data, 'clientMessage.lastClientMessage') && data.clientMessage.lastClientMessage || '';
  $$('poloLenderApp_version').refresh();
  $$('clientMessage').parse({ message: _.has(data, 'clientMessage.message') && data.clientMessage.message || ''});
};

let updateApiCallInfo = function updateApiCallInfo(data) {
  poloLenderApp_apiActivityUi.parse(data);
};

let advisorInfoTable = [];
let updateAdvisorInfo = function updateAdvisorInfo(data) {
  _.forEach(data.advisorInfo, function (value, key) {
    let currency = key;
    let newCurrencyData = value;
    let existingCurrencyData = _.find(advisorInfoTable, { currency: key });
    if (!existingCurrencyData) {
      let newRow = {
        currency: currency,
        averageLoanHoldingTime: newCurrencyData.averageLoanHoldingTime,
        bestReturnRate: newCurrencyData.bestReturnRate,
        bestDuration: '2 days',
        updatedAt: Date.now(),
      };
      advisorInfoTable.push(newRow);
    } else {
      if (existingCurrencyData.averageLoanHoldingTime !== newCurrencyData.averageLoanHoldingTime || existingCurrencyData.bestReturnRate !== newCurrencyData.bestReturnRate) {
        existingCurrencyData.averageLoanHoldingTime = newCurrencyData.averageLoanHoldingTime;
        existingCurrencyData.bestReturnRate = newCurrencyData.bestReturnRate;
        existingCurrencyData.updatedAt = Date.now();
      }
    }
  });
  let advisorInfoTableUi = $$('advisorInfoTable');
  advisorInfoTableUi.define({
    'data': advisorInfoTable,
  });
  advisorInfoTableUi.refreshColumns();
};

let advisorInfoTableUi;
let poloLenderApp_restaredAtUi;
let poloLenderApp_apiActivityUi;

let startRefreshingStatus = function startRefreshingStatus() {
  setInterval(function refreshTable() {
    advisorInfoTableUi.refreshColumns();
    poloLenderApp_restaredAtUi.refresh();
  }, 1000);

  setInterval(function refreshPoloLenderAppInfo() {
    poloLenderApp_apiActivityUi.refresh();
  }, 50);
};
