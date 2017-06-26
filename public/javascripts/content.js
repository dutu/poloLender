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

let addCoinMarketCapScript = function addCoinMarketCapScript() {
  if (document.getElementById('coin-market-cap')) return true;

  ((document) => {
    const scriptTag = document.createElement('script');
    scriptTag.async = false;
    scriptTag.id = 'coin-market-cap'
    scriptTag.defer = true;
    scriptTag.src = 'https://files.coinmarketcap.com/static/widget/currency.js';
    scriptTag.type = 'text/javascript';
    document.body.appendChild(scriptTag);
  })(document);
}

let tabview = {
  view: 'tabview',
  multiview: { keepViews: true },
  id: 'contentTabview',
  animate: { type: "flip", subtype: "vertical" },
  cells:[
    { header: "Status", body: statusView },
    { header: "Live", body: liveView, scroll: true },
    { header: "About", body: aboutView },
  ], tabbar:{
    on:{
      onAfterTabClick:function(){
        if (this.getValue() === 'live') addCoinMarketCapScript();
      }
    }
  },
};

function alignRight(value, config){
    return { "text-align":"right" };
}

webix.ready(function () {
  webix.ui({
    view: 'scrollview',
    scroll: '',
    body: {
      type: 'clean',
      id: 'app',
      rows: [
        header,
        tabview,
      ]
    }
  });

  let socket = io();
  socket.on('connect', function () {
    poloLenderAppConnection = 'connected';
    hideConnectionErrorMessage();
    updatePoloLenderApp();
  });
  socket.on('reconnect', function () {
    poloLenderAppConnection = 'connected';
    hideConnectionErrorMessage();
    updatePoloLenderApp();
  });
  socket.on("connect_error", function (err) {
    poloLenderAppConnection = `connect error, ${err.type}: ${err.message}`;
    showConnectionErrorMessage();
    updatePoloLenderApp();
  });
  socket.on("reconnect_error", function (err) {
    poloLenderAppConnection = `reconnect error, ${err.type}: ${err.message}`;
    showConnectionErrorMessage();
    updatePoloLenderApp();
  });
  socket.on('disconnect', function () {
    poloLenderAppConnection = 'disconnected';
    showConnectionErrorMessage();
    updatePoloLenderApp();
  });
  socket.on("reconnecting", function (attemptNumber) {
    poloLenderAppConnection = `reconnecting (${attemptNumber})`;
    showConnectionErrorMessage();
    updatePoloLenderApp();
  });


  let onevent = socket.onevent;
  socket.onevent = function (packet) {
    let args = packet.data || [];
    onevent.call(this, packet);    // original call
    packet.data = ['*'].concat(args);
    onevent.call(this, packet);      // additional call to catch-all
  };
  socket.on('*', function (event, data) {
  });

  socket.on('advisorConnection', updateAdvisorConnection);
  socket.on('clientMessage', updateClientMessage);
  socket.on('advisorInfo', updateAdvisorInfo);
  socket.on('poloLenderApp', updatePoloLenderApp);
  socket.on('apiCallInfo', updateApiCallInfo);
  socket.on('loanInfo', updateLoansInfo);

  loansInfoTableUi = $$('loansInfoTable');
  openLoansInfoTableUi = $$('openLoansInfoTable');
  bitcoinStatusUi = $$('bitcoinStatus');
  advisorInfoTableUi = $$('advisorInfoTable');
  poloLenderApp_restaredAtUi = $$('poloLenderApp_restartedAt');
  poloLenderApp_apiActivityUi = $$('poloLenderApp_apiActivity');

  startRefreshingStatus();
  startRefreshingLoans();
});
