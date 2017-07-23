let yPos = 0;
let isAutoScroll = true;
const scrollToLast = function scrollToLast() {
  let logtrailListUi = $$("logtrailList");
  logtrailListUi.showItem(logtrailListUi.getLastId());
  yPos = parseInt(logtrailListUi.getScrollState().y);
};

const onLogtrail = function onLogtrail(level, msg, meta) {
  let logtrailListUi = $$("logtrailList");
  logtrailListUi.add({ level: level, title: `${formatDate(new Date())}: ${level}: ${msg}` });
  logtrailListUi.filter('title', $$('logtrailFilter').getValue());
  if (isAutoScroll ) {
    scrollToLast();
  }
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
      onAfterScroll: function() {
        if (this.getScrollState().y < yPos) {
          $$('logtrailScrollButton').setValue(2);
          yPos = this.getScrollState().y;
          isAutoScroll = false;
        }
      }
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

