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
  webix.ui({
      rows: [
        header,
        tabview,
      ]
  });

  $$("lendingHistoryInputForm").elements["period"].attachEvent("onChange", onPeriodChange);
  webix.extend($$('lendingHistoryTable'), webix.ProgressBar);

  advisorInfoTableUi = $$('advisorInfoTable');
  lendingEngineStatus_apiActivityUi = $$('lendingEngineStatus_apiActivity');
  setupOnEvents();
  startRefreshingStatus();
  startRefreshingLiveUpdateStatus();
});
