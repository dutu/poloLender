const returnCurrencyTemplate = function returnCurrencyTemplate (obj) {
  return `<i class="cc ${obj.currency}"></i> ${obj.currency}`;
};

const tooltip = function tooltip(obj) {
  if (obj.tooltip) {
    return obj.tooltip;
  }

  return '';
};

function alignRight(value, config){
  return { "text-align":"right" };
}

let finance = new Finance();