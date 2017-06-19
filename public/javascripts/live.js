let currentLoansConfig = {
  id: 'currentLoansTable',
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

let liveView = {
  id: 'live',
  template: 'Live trades',
  scroll: 'xy',
  borderless: true,
  type: 'clean',
  cols: [
    { gravity: 0.2 },
    {
      type: 'clean',
      rows: [
        { view:"template", template:"Current Loans", type:"section" },
        currentLoansConfig,
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
};
