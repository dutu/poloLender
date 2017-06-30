const returnCurrencyTemplate = function returnCurrencyTemplate (obj) {
  return `<i class="cc ${obj.currency}"></i> ${obj.currency}`;
};

const tooltip = function tooltip(obj) {
  if (obj.tooltip) {
    return obj.tooltip;
  }

  return '';
};

const alignRight = function alignRight() {
  return { "text-align":"right" };
};

const alignCenter = function alignCenter() {
  return { "text-align":"center" };
};

const formatDate = function formatDate(date) {
  return webix.i18n.fullDateFormatStr(date);
};

const formatAmount = function amountFormat(amount) {
    return amount && `${amount.toFixed(8)}` || '';
};

const finance = new Finance();
let socket = io();
