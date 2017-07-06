const finance = new Finance();

const labelWidth = 100;
const inputTextWidth = 200;
const buttonWidth = 120;
let savingDataMessage = null;

let config = {};
let status = {};
let clientMessage = {};

const showSavingDataMessage = function showSavingDataMessage() {
  savingDataMessage = webix.message({
    id: 'savingData',
    text: '<i class="fa fa-circle-o-notch fa-spin fa-fw"></i> Saving data...',
    expire: -1,
  });
};

const hideProcessingDataMessage = function hideSavingDataMessage() {
  webix.message.hide(savingDataMessage);
};

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
  let format = webix.Date.dateToStr('%Y-%m-%d %H:%i:%s');
  return format(date);
};

const formatAmount = function amountFormat(amount) {
    return amount && `${amount.toFixed(8)}` || '';
};

const formatDurationFromSeconds = function formatDurationFromDays(timeInSeconds) {
  let hours = Math.floor(timeInSeconds / 60 /60);
  let hoursStr = hours && `${Math.floor(timeInSeconds / 60 /60)}h` || '';
  let minutes = Math.floor((timeInSeconds - hours * 60 *60) / 60);
  let minutesStr = hoursStr !== '' && `0${minutes}`.substr(-2, 2) || `${minutes || ''}`;
  minutesStr += minutesStr !== '' && 'm' || '';
  let seconds = timeInSeconds - hours * 60 *60 - minutes * 60;
  let secondsStr = minutesStr !== '' && `0${seconds}`.substr(-2, 2) || seconds.toString();
  secondsStr += 's';
  return `${hoursStr} ${minutesStr} ${secondsStr}`;
};

const formatDurationFromDays = function formatDurationFromDays(days) {
  let timeInSeconds = Math.round(days * 24 * 60 * 60);
  return formatDurationFromSeconds(timeInSeconds);
};
