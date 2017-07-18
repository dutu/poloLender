let connectionMessage = null;
let startedAt = Date.now();

let showConnectionErrorMessage = function showConnectionErrorMessage(){
  if ((!connectionMessage  || !webix.message.pull.connectionError) && Date.now() - startedAt > 3000) {
    connectionMessage = webix.message({
      id: 'connectionError',
      type: "error",
      text: '<span><i class="fa fa-refresh fa-spin fa-fw"></i></span> Trying to connect to poloLender app... <br> There seems to be a connection issue',
      expire: -1,
    });
  }
};

let hideConnectionErrorMessage = function hideConnectionErrorMessage() {
  if (connectionMessage) {
    webix.message.hide(connectionMessage);
    connectionMessage = null;
  }
};

let header = {
  id: 'header',
  view: 'template',
  type: 'header',
  autoheight:true,
  css: 'header',
  borderless: true,
  template: function(obj) { return obj.value; },
  data: { value: 'poloLender Pro' },
};

let tabview = {
  view: 'tabview',
  multiview: { keepViews: true },
  sizeToContent: true,
  id: 'contentTabview',
  animate: { type: "flip", subtype: "vertical" },
  cells:[
    { header: "Status", body:{ view:"scrollview", scroll: "xy", body: statusView } },
    { header: "Performance", body:{ view:"scrollview", scroll: "xy", body: performanceReportView } },
    { header: "Live", body:{ view:"scrollview", scroll: "xy", body: liveView } },
    { header: "History", body:{ view:"scrollview", scroll: "xy", body: historyView } },
    { header: "Settings", body:{ view:"scrollview", scroll: "xy", body: settingsView } },
    { header: "About", body:{ view:"scrollview", scroll: "xy", body: aboutView } },
  ],
};

webix.ready(function () {
  authUi = webix.ui({
    view: 'window',
    head: 'poloLender Pro Authorization',
    modal: true,
    position: 'center',
    width: 380,
    body: {
      view: 'form',
      complexData: true,
      elements: [
        { view: 'text', id: 'token', name: 'token', label: 'Authorization token:', labelWidth: 130, tooltip: "Check your console log and\nenter your read/only or read/write authorization token" },
        { view: 'select', id: 'rememberForDays', name: 'rememberForDays', label: 'Remember token for:', labelWidth: 130, options: [{ id: 0, value: 'this session' }, { id: 1, value: '1 day' }, { id: 7, value: '7 days' }, { id: 30, value: '30 days' }], value: 30, tooltip: "Remember the token and don't ask for it for a number of days" },
        { view: 'button', value: 'Submit',
          click: function (elementId, event) {
            showProcessingDataMessage();
            let auth = this.getFormView().getValues();
            storage.browserAuth = {
              token: auth.token,
              isReadWriteAllowed: false,
              expiresOn: auth.rememberForDays === '0' ? -1 : new Date(Date.now() + parseFloat(auth.rememberForDays) * 24 * 60 * 60 * 1000),
              isChangeEnabled: storage.browserAuth && storage.browserAuth.hasOwnProperty('isChangeEnabled') ? storage.browserAuth.isChangeEnabled : true,
              rememberForDays: auth.rememberForDays,
            };
            store.set('poloLender',  { browserAuth: storage.browserAuth });
            socket.emit('authorization', storage.browserAuth.token);
          }
        }
      ]
    },
    move: true
  });
  authUi.show();

  mainUi = webix.ui({
    rows: [
      header,
      tabview,
    ]
  });
  mainUi.hide();

  let s = store.get('poloLender');
  let isChangeEnabled = s.browserAuth && s.browserAuth.hasOwnProperty('isChangeEnabled') ? s.browserAuth.isChangeEnabled : true;
  setEnableConfigChanges(isChangeEnabled);
  $$("lendingHistoryInputForm").elements["period"].attachEvent("onChange", onPeriodChange);
  webix.extend($$('lendingHistoryTable'), webix.ProgressBar);

  advisorInfoTableUi = $$('advisorInfoTable');
  liveStatusUi = $$('liveStatus');
  setupOnEvents();
  startRefreshingStatus();
  startRefreshingLiveUpdateStatus();

  storage = store.get('poloLender') || {};

  if (!storage || !storage.browserAuth || !storage.browserAuth.token || !storage.browserAuth.expiresOn) {
    storage.browserAuth = {};
    store.set('poloLender',  { browserAuth: {} });
  } else {
    if (storage.browserAuth.expiresOn === 'never' || Date.now() < new Date(storage.browserAuth.expiresOn).getTime()) {
      socket.emit('authorization', storage.browserAuth.token, ``);
    } else {
      webix.message({ type:'error', text: 'Authorization token expired' });
      storage.browserAuth = {};
      store.set('poloLender',  { browserAuth: storage.browserAuth });
    }
  }
});
