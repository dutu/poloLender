let yPos = 0;
let isAutoScroll = true;
let isUpdateLogtrailInProgress = false;
let isInitialView;

const scrollToLast = function scrollToLast() {
  let logtrailListUi = $$("logtrailList");
  logtrailListUi.showItem(logtrailListUi.getLastId());
  yPos = parseInt(logtrailListUi.getScrollState().y);
};

const onLogtrail = function onLogtrail(level, msg, meta) {
  let logtrailListUi = $$("logtrailList");
  logtrailListUi.add({ id: meta.uuid, level: level, timestamp: meta.timestamp, title: `${formatDate(new Date(meta.timestamp))}: ${level}: ${msg}` });
  logtrailListUi.filter('title', $$('logtrailFilter').getValue());
  if (isAutoScroll ) {
    scrollToLast();
  }
};

const loadBuffer = function loadBuffer() {
  if (isUpdateLogtrailInProgress) {
    return;
  }

  let logtrailListUi = $$('logtrailList');
  let yScrollPos = logtrailListUi.getScrollState().y;
  let bufferUp = Math.round(yScrollPos / 16);
  let visibleCount = logtrailListUi.getVisibleCount();
  if (bufferUp < visibleCount * 3) {
    isUpdateLogtrailInProgress = true;
    let needMoreCount = visibleCount * 6;
    let firstRow = logtrailListUi.getItem(logtrailListUi.getFirstId());
    let params = {
      endTime: firstRow && firstRow.timestamp || new Date(),
      count: needMoreCount,
    };
    showProcessingDataMessage();
    socket.emit('returnLogtrailBuffer', params);
  }
};

const updateLogtrail = function updateLogtrail(errMessage, result) {
  hideProcessingDataMessage();
  if (errMessage) {
    webix.message({ type:'error', text: errMessage });
    isUpdateLogtrailInProgress = false;
    return;
  }

  let logtrailListUi = $$('logtrailList');
  result.forEach((item) => {
    if (!logtrailListUi.getItem(item.uuid)) {
      logtrailListUi.add({ id: item.uuid, level: item.level, timestamp: item.timestamp, title: `${formatDate(new Date(item.timestamp))}: ${item.level}: ${item.msg}` }, 0);
    }
  });
  isUpdateLogtrailInProgress = false;
  if (isInitialView) {
    scrollToLast();
    isInitialView = false;
    isAutoScroll = true;
    $$('logtrailScrollButton').setValue('1');
  }
};

const resetLogtrail = function resetLogtrail() {
  $$('logtrailList').clearAll();
  isInitialView = true;
  loadBuffer();
  isAutoScroll = true;
  $$('logtrailScrollButton').setValue('1');
};

const returnLogtrailItemListTemplate = function returnLogtrailItemListTemplate(obj) {
  return `<div class='list-item-${obj.level}'>${obj.title}</div>`;
};

let logtrailToolbarConfig = {
  height: 35,
  view: 'toolbar',
  elements: [
    { view: 'text', id: 'logtrailFilter', label: "Filter", labelWidth: 40,
      on: {
        onTimedKeyPress: function(){
          $$('logtrailList').filter('title', this.getValue());
        }
      }
    },
    {},
    {
      view: 'segmented',
      id: 'logtrailScrollButton',
      value: 1,
      isolate: true,
      options: [{id: 1, value: "Auto-scroll"}, {id: 2, value: "Pause scrolling"}],
      on: {
        onItemClick: function () {
          let v  = this.getValue();
          isAutoScroll = v === '1';
          if (isAutoScroll) {
            scrollToLast();
          }
        }
      }
    }
  ]
};

let logtrailListConfig = {
  body: {
    view: "list",
    id: 'logtrailList',
    template: returnLogtrailItemListTemplate,
    sizeToContent: true,
    scroll: "xy",
    css: 'logtrail-list',
    type: { height: 16 },
    borderless: true,
    select: true,
    data: [],
    on: {
      onAfterScroll: function () {
        let yScrollPos = this.getScrollState().y;
        if ( yScrollPos < yPos) {
          $$('logtrailScrollButton').setValue(2);
          yPos = yScrollPos;
          isAutoScroll = false;
        }

        if (!isAutoScroll) {
          loadBuffer();
        }
      },
      onResize: function () {
//        loadBuffer();
      },
    }
  }
};

let logtrailView = {
  id: 'logtrailView',
  borderless: true,
  type: 'clean',
  sizeToContent: true,
  cols: [
    {
      type: 'clean',
      rows: [
        logtrailToolbarConfig,
        logtrailListConfig,
      ]
    },
  ],
};

let refreshLogtrailView = function refreshLogtrailView() {
  let visibleView = $$('contentTabview').getMultiview().getValue();
  if (visibleView !== 'logtrailView') {
    return;
  }
  isInitialView = true;
  loadBuffer();
};