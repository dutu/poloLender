
// let client = new Faye.Client(`http://${window.location.hostname}:8000/`);

let sendGetBalances = function sendGetBalances() {
  let balanceTable = $$('balanceTable');
  balanceTable.clearAll();
  balanceTable.showProgress({ delay: 300000, hide: true });
  client.publish('/getBalances', {
    settings: {},
  });
};

let header = {
  id: 'header',
  view: 'template',
  type: 'header',
  autoheight:true,
  css: 'header',
  borderless: true,
  template: function(obj) { return obj.value; },
  data: { value: 'xBalance' },
};

let tooltip = function tooltip(obj) {
  if (obj.tooltip) {
    return obj.tooltip;
  }

  return "";
};

let columns = [
  { id: "timestamp",	header: "Date", sort: "int", autowidth: true, format: webix.Date.dateToStr("%Y-%m-%d %H:%i"), footer:{text:"Total:", colspan:3}, adjust:true, tooltip: tooltip },
  { id: "exchange",	header: "Exchange", sort: "string", adjust:true, tooltip: tooltip  },
  { id: "accountName", header:"Account name", autowidth: true, adjust:true, sort: "string", tooltip: tooltip  },
  { id: "subAccount", header:"Subaccount", autowidth: true, adjust:true, sort: "string", tooltip: tooltip  },
];

let balanceTableConfig = {
  id: 'balanceTable',
  view: 'datatable',
  resizeColumn: true,
//  autoheight: true,
  minHeight:50,
  select: true,
  drag: true,
  footer: true,
  columns: webix.copy(columns),
  data: [],
  tooltip: true,
  scheme: {
    $change: function (item) {
      if (item.error)
        item.$css = "row-error";
    }
  }
};

let balanceView = {
  rows: [
    {
      cols: [
/*
        {
          id: 'refreshButton',
          autoheight: true,
          view: 'button',
          css: 'btn-primary',
          value: 'Refresh',
          width: 120,
          click: sendGetBalances,
        },
*/
        {
          id: 'exportButton',
          view: 'button',
          disabled: true,
          css: 'btn-danger',
          value: 'Export to Excel',
          width: 120,
//          click: clickCancelEditStrategy,
        },
        {},
      ]
    },
    balanceTableConfig,
  ]
};

let tabview = {
  view: 'tabview',
  multiview: { keepViews: true },
  id: 'profileTabview',
  animate: { type: "flip", subtype: "vertical" },
  cells:[
    { header: "Balance", body: balanceView },
//    { header: "Settings", body: settingsView },
    { header: "About", body: aboutView },
  ],
};

function alignRight(value, config){
    return { "text-align":"right" };
}

let updateBalanceTable = function updateBalanceTable(balances) {
  let balanceTable = [];
  let columnsTable = [
    { id: "timestamp",	header: "Date", sort: "int", autowidth: true, format: webix.Date.dateToStr('%Y-%m-%d %H:%i'), footer: { text: 'Total:', colspan: 3 }, adjust: true, tooltip: tooltip },
    { id: "exchange",	header: "Exchange", sort: "string", adjust: true, tooltip: tooltip },
    { id: "accountName", header:"Account name", autowidth: true, adjust: true, sort: "string", tooltip: tooltip  },
    { id: "subAccount", header:"Subaccount", autowidth: true, adjust: true, sort: "string", tooltip: tooltip  },
  ];

  columnsTable.push({ id: 'worthBTC',	header: { text: 'worthBTC', css:{ "text-align":"center" } }, cssFormat: alignRight, sort: "int", autowidth: true, adjust: true, tooltip: tooltip, footer: { content: "sumCol", css: { "text-align":"center" }  } });
  balances.forEach(account => {
    let balanceRow = {
      accountName: account.accountName,
      exchange: account.exchange,
      timestamp: new Date(account.timestamp),
      subAccount: account.subAccount,
      worthBTC: "0",
    };

    let worthBTC = 0;
    if (Array.isArray(account.totalBalance)) {
      account.totalBalance.forEach(currencyBalance => {
        balanceRow[currencyBalance.currency] = currencyBalance.amount;
        worthBTC += parseFloat(currencyBalance.worthBTC);
        let currencyColumn = columnsTable.find(column => {
          return column.id === currencyBalance.currency
        });
        if (!currencyColumn) {
          columnsTable.push({
            id: currencyBalance.currency,
            header: { text: currencyBalance.currency, css: { "text-align":"center" } },
            cssFormat: alignRight,
            adjust: true,
            tooltip: tooltip,
            footer: { content: "sumCol", css:{ "text-align":"center" } },
          });
        }
      });
    } else {
      webix.message({
        type: 'error',
        text: `${account.exchange}['${account.accountName}'] error: ${account.error || 'Unknown error'}`,
      });
      balanceRow.subAccount = 'ERROR';
      balanceRow.error = true;
      balanceRow.tooltip = account.error || 'Unknown error';
    }
    balanceRow.worthBTC = worthBTC.toFixed(8);
    balanceTable.push(balanceRow);
  });
  $$('balanceTable').hideProgress();
  $$('balanceTable').clearAll();
  $$('balanceTable').define({
    'columns': columnsTable,
    'data': balanceTable,
  });
  $$("balanceTable").refreshColumns();
};

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

  let socket = io(`http://${window.location.hostname}:3000`);
  socket.on('connect', function(){
    console.log('connect');
  });
  socket.on('dataUpdate', function(data){
    console.log(JSON.stringify(data));
  });
  socket.on('disconnect', function(){
    console.log('disconnect');
  });

  /*
    let balanceTable = $$("balanceTable");

    webix.extend(balanceTable, webix.ProgressBar);
    webix.event(window, "resize", function(){ balanceTable.adjust(); });

    webix.ui.datafilter.sumCol = webix.extend({
      refresh: function(master, node, value){
        let result = 0;
        master.data.each(function(obj){
          result += obj[value.columnId] && parseFloat(obj[value.columnId]) || 0;
        });

        node.firstChild.innerHTML = `<div style="text-align: right; font-weight: bold;">${result.toFixed(8)}</div>`;
      }
    }, webix.ui.datafilter.summColumn);

  */
});

