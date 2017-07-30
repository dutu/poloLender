let poloLenderAppStatusData = {};
let lendingEngineStatusData = {};
let advisorEngineStatusData = {
  server: '',
  connection: 'unknown',
  authentication: {
    status: 0,
    message: '',
  }
};

let width_col1 = 130;
let width_col2 = 300;
let margin = -6;

let ok = 0;
let nok = 0;

let poloLenderAppStatusConfig = {
  id: 'poloLenderAppStatusConfig',
  autoheight: true, borderless: true, type: 'clean',
  margin: margin,
  padding: 0,
  rows: [
    {
      autoheight: true, borderless: true, type: 'clean',
      cols: [
        { width: width_col1, autoheight: true, template: 'Running since:' },
        { id: 'poloLenderApp_runningSince', width: width_col2,
          template: function (obj) {
            if (!poloLenderAppStatusData.runningSince) {
              return '';
            }
            let date = new Date(poloLenderAppStatusData.runningSince);
            return `${webix.i18n.longDateFormatStr(date)}, ${webix.i18n.timeFormatStr(date)} (${moment(date).fromNow(false)})`;
          }
        },
      ]
    },
    {
      autoheight: true, borderless: true, type: 'clean',
      cols: [
        { width: width_col1, autoheight: true, template: 'Version:' },
        { id: 'poloLenderApp_version', width: width_col2,
          template: function (obj) {
            if (!poloLenderAppStatusData.runningClientSemver) {
              return ''
            }

            return `${poloLenderAppStatusData.runningClientSemver} ${poloLenderAppStatusData.lastClientMessage || ''}`;
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
            if (!poloLenderAppStatusData.restartedAt) {
              return '';
            }
            let date = new Date(poloLenderAppStatusData.restartedAt);
            return `${webix.i18n.longDateFormatStr(date)}, ${webix.i18n.timeFormatStr(date)} (${moment(date).fromNow(false)})`;
          }
        },
      ]
    },
    {
      id: 'poloLenderApp_clientMessage', autoheight: true, css: 'client-message',
      template: function (obj) {
        return poloLenderAppStatusData.message || '';
      },
    },
  ],
};

let lendingEngineStatusConfig = {
  id: 'lendingEngineStatusConfig',
  autoheight: true, borderless: true, type: 'clean',
  margin: margin,
  padding: 0,
  rows: [
    {
      autoheight: true, borderless: true, type: 'clean',
      cols: [
        { width: width_col1, autoheight: true, template: 'Poloniex API activity:' },
        { id: 'lendingEngineStatus_apiActivity', width: width_col2,
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
    {
      autoheight: true, borderless: true, type: 'clean',
      cols: [
        { width: width_col1, autoheight: true, template: 'Lending engine:' },
        { id: 'lendingEngineStatus_status', width: width_col2,
          template: function (obj) {
            if (lendingEngineStatusData.isTradingEnabled) {
              return `Running`;
            } else {
              let date = new Date(poloLenderAppStatusData.runningSince);
              let msg = `<span style="color:red">Stopped</span>`;
              msg += lendingEngineStatusData.lendingEngineStopReason && `. ${lendingEngineStatusData.lendingEngineStopReason}` || '';
              return msg;
            }
          }
        },
      ]
    },
    {
      cols: [
        { view: 'label',label: '', width: width_col1 },
        {
          view: 'button',
          id: 'lendingEngineStartStopButton',
          width: buttonWidth,
          type: 'form',
          value: 'Start',
          click: function () {
            if (!storage.browserAuth.isReadWriteAllowed) {
              webix.message({ type:'error', text: 'Not authorized!<br>Read/write auth token required' });
              return;
            }

            config.isTradingEnabled = !config.isTradingEnabled;
            config.status.lendingEngineStopReason = 'Manually stopped';
            showProcessingDataMessage();
            socket.emit('updateConfig', config);
          },
        },
        {},
      ]
    },
  ],
};

let advisorEngineStatusConfig = {
  id: 'advisorEngineStatus',
  autoheight: true, borderless: true, type: 'clean',
  margin: margin,
  padding: 0,
  rows: [
    {
      autoheight: true, borderless: true, type: 'clean',
      cols: [
        { width: width_col1, autoheight: true, template: 'Running at:' },
        { id: 'advisorEngine_server', width: width_col2,
          template: function (obj) {
            return `${advisorEngineStatusData.server}`;
          }
        },
      ]
    },
    {
      autoheight: true, borderless: true, type: 'clean',
      cols: [
        { width: width_col1, autoheight: true, template: 'Connection status:' },
        { id: 'advisorEngine_connectionStatus', width: width_col2,
          template: function (obj) {
            return `${advisorEngineStatusData.connection}`;
          },
        },
      ]
    },
    {
      autoheight: true, borderless: true, type: 'clean',
      cols: [
        { width: width_col1, autoheight: true, template: 'Authentication:' },
        { id: 'advisorEngine_authenticationStatus', width: width_col2,
          template: function (obj) {
            return `${advisorEngineStatusData.authentication.message}`;
          },
        },
      ]
    },
  ],
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
    { id: 'averageLoanHoldingTime', header:'Average loan holding time', autowidth: true, adjust: true, tooltip: tooltip, cssFormat: alignRight },
    { id: 'bestReturnRate', header:'Best loan rate', autowidth: true, adjust: true, sort: 'string', tooltip: tooltip, template: returnBestReturnRateTemplate, cssFormat: alignCenter },
    { id: 'bestDuration', header:'Best loan duration', autowidth: true, adjust: true, tooltip: tooltip, cssFormat: alignCenter },
    { id: 'minOrderAmount', header:'Min offer amount', autowidth: true, adjust: true, tooltip: tooltip, cssFormat: alignRight  },
    { id: 'updatedAt',	header: 'Updated', autowidth: true, adjust: true, tooltip: tooltip, template: returnUpdatedAtTemplate },
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
        poloLenderAppStatusConfig,
        { gravity: 0.1 },
        { view:"template", template:"poloLender Pro Lending Engine", type:"section", css: 'section webix_section' },
        lendingEngineStatusConfig,
        { gravity: 0.1 },
        { view:"template", template:"poloLending-Advisor Engine", type:"section" },
        advisorEngineStatusConfig,
        { gravity: 0.1 },
        { view:"template", template:"poloLending-Advisor Info", type:"section" },
        advisorInfoTableConfig,
        { gravity: 1 },
      ]
    },
    { gravity: 0.2 },
  ],
};

let updatePoloLenderAppStatus = function updatePoloLenderAppStatus() {
  poloLenderAppStatusData = {
    runningSince: config.startDate,
    runningClientSemver: status.runningClientSemver,
    lastClientMessage: clientMessage.lastClientMessage,
    restartedAt: status.restarted,
    message: clientMessage.message,
  };

  let visibleView = $$('contentTabview').getMultiview().getValue();
  if (visibleView !== 'statusView') {
    return;
  }

  let poloLenderApp_runningSinceUi = $$('poloLenderApp_runningSince');
  if (poloLenderApp_runningSinceUi) poloLenderApp_runningSinceUi.refresh();
  let poloLenderApp_versionUi = $$('poloLenderApp_version');
  if (poloLenderApp_versionUi) poloLenderApp_versionUi.refresh();
  let poloLenderApp_restartedAtUi = $$('poloLenderApp_restartedAt');
  if (poloLenderApp_restartedAtUi) poloLenderApp_restartedAtUi.refresh();
  let poloLenderApp_clientMessageUi = $$('poloLenderApp_clientMessage');
  if (poloLenderApp_clientMessageUi) poloLenderApp_clientMessageUi.refresh();
};

let updateLendingEngineStatus = function updateLendingEngineStatus() {
  lendingEngineStatusData = {
    isTradingEnabled: config.isTradingEnabled,
    lendingEngineStopTime: config.status && config.status.lendingEngineStopTime || '',
    lendingEngineStopReason: config.status && config.status.lendingEngineStopReason || '',
  };

  let visibleView = $$('contentTabview').getMultiview().getValue();
  if (visibleView !== 'statusView') {
    return;
  }

  $$('lendingEngineStatus_status').refresh();
  $$('lendingEngineStatus_apiActivity').refresh();
  let lendingEngineStartStopButtonUi = $$('lendingEngineStartStopButton');
  lendingEngineStartStopButtonUi.define('type', lendingEngineStatusData.isTradingEnabled && 'danger' || 'form');
  lendingEngineStartStopButtonUi.setValue(lendingEngineStatusData.isTradingEnabled && 'Stop' || 'Start');
  lendingEngineStartStopButtonUi.refresh();
};

let updateApiCallInfo = function updateApiCallInfo(data) {
  lendingEngineStatus_apiActivityUi.parse(data);
};

let updateAdvisorEngineStatus = function updateAdvisorEngineStatus() {
  advisorEngineStatusData = {
    server: config.lendingAdvisor && config.lendingAdvisor.server || '',
    connection: status.lendingAdvisor && status.lendingAdvisor.connection || '',
    authentication: status.lendingAdvisor && status.lendingAdvisor.authentication || { status: 0, message: '' },
  };

  let visibleView = $$('contentTabview').getMultiview().getValue();
  if (visibleView !== 'statusView') {
    return;
  }

  $$('advisorEngine_server').refresh();
  $$('advisorEngine_connectionStatus').refresh();
};

let advisorInfoTable = [];
let advisorInfo = {};

let refreshAdvisorInfo = function refreshAdvisorInfo() {
  let visibleView = $$('contentTabview').getMultiview().getValue();
  if (visibleView !== 'statusView') {
    return;
  }

  _.forEach(advisorInfo, (value, key) => {
    if (key === 'time') {
      return;
    }

    let currency = key;
    let newCurrencyData = value;
    let existingCurrencyData = _.find(advisorInfoTable, { currency: key });
    if (!existingCurrencyData) {
      let newRow = {
        currency: currency,
        averageLoanHoldingTime: newCurrencyData.averageLoanHoldingTime,
        bestReturnRate: newCurrencyData.bestReturnRate,
        bestDuration: '2 days',
        minOrderAmount: newCurrencyData.minOrderAmount,
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

let updateAdvisorInfo = function updateAdvisorInfo(data) {
  advisorInfo = data;
  refreshAdvisorInfo();
};

let advisorInfoTableUi;
let lendingEngineStatus_apiActivityUi = null;

let startRefreshingStatus = function startRefreshingStatus() {
  setInterval(function refreshPoloLenderAppStatus() {
    let visibleView = $$('contentTabview').getMultiview().getValue();
    if (visibleView !== 'statusView') {
      return;
    }

    $$('poloLenderApp_runningSince').refresh();
    $$('poloLenderApp_restartedAt').refresh();
    $$('poloLenderApp_clientMessage').refresh();
  }, 5000);

  lendingEngineStatus_apiActivityUi = $$('lendingEngineStatus_apiActivity');
  setInterval(function refreshPoloLenderAppInfo() {
    let visibleView = $$('contentTabview').getMultiview().getValue();
    if (visibleView !== 'statusView') {
      return;
    }

    lendingEngineStatus_apiActivityUi.refresh();
  }, 1000/8);
};

let refreshStatusView = function refreshStatusView() {
  refreshAdvisorInfo();
  updateAdvisorEngineStatus();
  updateLendingEngineStatus();
  updatePoloLenderAppStatus();
};
