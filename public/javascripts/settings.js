let lendingAdvisorServers = ['safe-hollows.crypto.zone'];
let appConfig = {};

let settingsName = 'browserAuth';
let browserAuthConfig = {
  id: `${settingsName}Settings`,
  view: 'form',
  borderless: true,
  type: 'clean',
  complexData: true,
  elements: [
    {
      rows: [
        { view: 'template', template:"Browser UI authorization", type: 'section', /*css: 'section webix_section'*/ },
        {
          cols: [
            { view: 'label',label: 'Enable config changes', width: labelWidth, tooltip: 'Enable/Disable config changes' },
            { view: 'checkbox', id: 'browserAuth.isChangeEnabled', name: 'browserAuth.isChangeEnabled', value: 0, tooltip: 'Enable/Disable config changes',
              on: { onChange: setEnableConfigChanges },
            },
            {},
          ]
        },
        {
          cols: [
            { view: 'label',label: 'Auth token', width: labelWidth, tooltip: 'Check your console log and\nenter your read/only or read/write authorization token'  },
            { view: 'text', id: 'browserAuth.token', name: 'browserAuth.token', width: inputTextWidth * 1.5, disabled: true, value: '', tooltip: 'Check your console log and\nenter your read/only or read/write authorization token', validate: webix.rules.isNotEmpty },
            {},
          ]
        },
        {
          cols: [
            { view: 'label',label: 'Remember token for:', width: labelWidth, tooltip: 'Remember the token and don\'t ask for it for a number of days' },
            { view: 'select', id: 'browserAuth.rememberForDays', name: 'browserAuth.rememberForDays', width: buttonWidth, disabled: true, options: [{ id: 0, value: 'this session' }, { id: 1, value: '1 day' }, { id: 7, value: '7 days' }, { id: 30, value: '30 days' }], value: 30, tooltip: "Remember the token and don't ask for it for a number of days" },
            {},
          ]
        },
        {
          cols: [
            { view: 'label',label: 'New token', width: labelWidth, tooltip: '' },
            {
              view: 'button',
              id: `browserAuth.generateNewToken`,
              width: buttonWidth,
              disabled: true,
              value: 'Generate',
              click: function () {
                let settingsValues = this.getFormView().getValues();
                if (!storage.browserAuth.isReadWriteAllowed) {
                  webix.message({ type:'error', text: 'Not authorized!<br>Read/write auth token required' });
                  return;
                }

                socket.emit('generateNewToken', settingsValues.browserAuth.tokenExpiresIn);
                showProcessingDataMessage();
              },
            },
            { view: 'select', id: 'browserAuth.tokenExpiresIn', name: 'browserAuth.tokenExpiresIn', width: buttonWidth, disabled: true, options: [{ id: 0, value: 'never expires' }, { id: 1, value: 'valid for 1 day' }, { id: 7, value: 'valid for 7 days' }, { id: 30, value: 'valid for 30 days' }], value: '30', tooltip: "Token validity duration" },
            {},
          ]
        },

        {
          cols: [
            { view: 'label',label: '', width: labelWidth },
            {
              view: 'button',
              id: `change${settingsName}SettingsButton`,
              width: buttonWidth,
              value: 'Change',
              click: function () {
                let fields = ['browserAuth.token', 'browserAuth.rememberForDays', 'browserAuth.tokenExpiresIn', 'browserAuth.generateNewToken'];
                let settingsValues = this.getFormView().getValues();
                let formId = this.getFormView().config.id;
                let changeSettingsButtonUi = $$(`change${formId}Button`);
                let cancelEditSettingsButtonUi = $$(`cancelEdit${formId}Button`);
                if ($$(fields[0]).isEnabled()) {
                  let isValid = this.getFormView().validate();
                  if (!isValid) {
                    webix.message({ type:'error', text: 'Invalid values' });
                    return;
                  }

                  showProcessingDataMessage();
                  //cancelEditSettingsButtonUi.disable();
                  socket.emit('validateToken', settingsValues.browserAuth.token );
                } else {
                  changeSettingsButtonUi.define('type', 'form');
                  changeSettingsButtonUi.setValue('Update');
                  changeSettingsButtonUi.refresh();
                  cancelEditSettingsButtonUi.show();
                  cancelEditSettingsButtonUi.enable();
                  fields.forEach(field => $$(field).enable());
                }
              },
            },
            {
              view: 'button',
              id: `cancelEdit${settingsName}SettingsButton`,
              width: buttonWidth,
              type: 'danger',
              hidden: true,
              value: 'Cancel',
              click: function () {
                let fields = ['browserAuth.token', 'browserAuth.rememberForDays', 'browserAuth.tokenExpiresIn', 'browserAuth.generateNewToken'];
                let formId = this.getFormView().config.id;
                this.getFormView().clearValidation();
                updatedConfigHandlers[formId]();
                let changeSettingsButtonUi = $$(`change${formId}Button`);
                let cancelEditSettingsButtonUi = $$(`cancelEdit${formId}Button`);
                changeSettingsButtonUi.define('type', '');
                changeSettingsButtonUi.setValue('Change');
                changeSettingsButtonUi.refresh();
                cancelEditSettingsButtonUi.hide();
                fields.forEach(field => $$(field).disable());
              },
            },
            {},
          ]
        },
      ]
    }
  ],
};

settingsName = 'apiKey';
let apiKeySettingsConfig = {
  id: `${settingsName}Settings`,
  view: 'form',
  borderless: true,
  type: 'clean',
  complexData: true,
  elements: [
    {
      rows: [
        { view: 'template', template:"API Key", type: 'section', /*css: 'section webix_section'*/ },
        {
          cols: [
            { view: 'label',label: 'Key', width: labelWidth, tooltip: 'Poloniex API key'  },
            { view: 'text', id: 'apiKey.key', name: 'apiKey.key', width: inputTextWidth * 1.5, disabled: true, value: '', tooltip: 'Poloniex API key', validate: webix.rules.isNotEmpty },
            {},
          ]
        },
        {
          cols: [
            { view: 'label',label: 'Secret', width: labelWidth, tooltip: 'Poloniex API secret' },
            { view: 'text', id: 'apiKey.secret', name: 'apiKey.secret', width: inputTextWidth * 1.5, disabled: true, value: '', tooltip: 'Poloniex API secret', validate: webix.rules.isNotEmpty },
            {},
          ]
        },
        {
          cols: [
            { view: 'label',label: '', width: labelWidth },
            {
              view: 'button',
              id: `change${settingsName}SettingsButton`,
              width: buttonWidth,
              value: 'Change',
              click: function () {
                let fields = ['apiKey.key', 'apiKey.secret'];
                let settingsValues = this.getFormView().getValues();
                let formId = this.getFormView().config.id;
                let changeSettingsButtonUi = $$(`change${formId}Button`);
                let cancelEditSettingsButtonUi = $$(`cancelEdit${formId}Button`);
                if ($$(fields[0]).isEnabled()) {
                  let isValid = this.getFormView().validate();
                  if (!isValid) {
                    webix.message({ type:'error', text: 'Invalid values' });
                    return;
                  }

                  showProcessingDataMessage();
                  cancelEditSettingsButtonUi.disable();
                  config.apiKey = settingsValues.apiKey;
                  socket.emit('updateConfig', config, `${formId}`);
                } else {
                  if (!storage.browserAuth.isReadWriteAllowed) {
                    webix.message({ type:'error', text: 'Not authorized!<br>Read/write auth token required' });
                    return;
                  }

                  $$('apiKey.secret').setValue('');
                  changeSettingsButtonUi.define('type', 'form');
                  changeSettingsButtonUi.setValue('Update');
                  changeSettingsButtonUi.refresh();
                  cancelEditSettingsButtonUi.show();
                  cancelEditSettingsButtonUi.enable();
                  fields.forEach(field => $$(field).enable());
                }
              },
            },
            {
              view: 'button',
              id: `cancelEdit${settingsName}SettingsButton`,
              width: buttonWidth,
              type: 'danger',
              hidden: true,
              value: 'Cancel',
              click: function () {
                let fields = ['apiKey.key', 'apiKey.secret'];
                let formId = this.getFormView().config.id;
                this.getFormView().clearValidation();
                updatedConfigHandlers[formId]();
                let changeSettingsButtonUi = $$(`change${formId}Button`);
                let cancelEditSettingsButtonUi = $$(`cancelEdit${formId}Button`);
                changeSettingsButtonUi.define('type', '');
                changeSettingsButtonUi.setValue('Change');
                changeSettingsButtonUi.refresh();
                cancelEditSettingsButtonUi.hide();
                fields.forEach(field => $$(field).disable());
              },
            },
            {},
          ]
        },
      ]
    }
  ],
};

let startSettingsConfig = {
  id: 'startSettings',
  borderless: true,
  type: 'clean',
  view: 'form',
  complexData: true,
  elements: [
    {
      rows: [
        { view: 'template', template:"Start Settings", type: 'section', /*css: 'section webix_section'*/ },
        {
          cols: [
            { view: 'label', label: 'Start date', width: labelWidth, tooltip: 'Used to calculate profitability' },
            { view: 'datepicker', id: 'startDateConfig', timepicker: true, disabled: true, value: new Date(parseInt(moment(appConfig.startDate).format('x'))), format:'%Y-%m-%d %H:%i', name: 'startDate', width: inputTextWidth },
            {},
          ]
        },
        {
          cols: [
            { view: 'label',label: 'Start balance', width: labelWidth, tooltip: 'Used to calculate profitability'  },
            { view: 'label', width: 180 },
//            { view: "label", label: '<i class="webix_icon fa-question-circle-o" style="font-size: 95%">', tooltip:"Used to calculate profitability" },
            {},
          ]
        },
        {
          cols: [
            { view: 'label',label: '', width: labelWidth },
            {
              view: 'button',
              id: 'changeAndSetStartSettingsButton',
              width: buttonWidth,
              value: 'Change',
              click: function () {
                let startSettingsUi = $$('startSettings');
                let isValid = startSettingsUi.validate();
                if (!isValid) {
                  return;
                }

                let startSettings = startSettingsUi.getValues();
                let startDateConfigUi = $$('startDateConfig');
                let changeAndSetButtonUi = $$('changeAndSetStartSettingsButton');
                let cancelEditSettingsButtonUi = $$('cancelEditStartSettingsButton');
                if (startDateConfigUi.isEnabled()) {
                  let isValid = this.getFormView().validate();
                  if (!isValid) {
                    webix.message({ type:'error', text: 'Invalid values' });
                    return;
                  }

                  showProcessingDataMessage();
                  cancelEditSettingsButtonUi.disable();
                  config.startDate = startSettings.startDate;
                  config.startBalance = startSettings.startBalance;
                  socket.emit('updateConfig', config, 'startSettings');
                } else {
                  if (!storage.browserAuth.isReadWriteAllowed) {
                    webix.message({ type:'error', text: 'Not authorized!<br>Read/write auth token required' });
                    return;
                  }

                  changeAndSetButtonUi.define('type', 'form');
                  changeAndSetButtonUi.setValue('Update');
                  changeAndSetButtonUi.refresh();
                  cancelEditSettingsButtonUi.show();
                  cancelEditSettingsButtonUi.enable();
                  startDateConfigUi.enable();
                  lendingCurrencies.forEach((currency) => {
                    $$(`startBalance.${currency}`).enable();
                  });
                }
              },
            },
            {
              view: 'button',
              id: 'cancelEditStartSettingsButton',
              width: buttonWidth,
              type: 'danger',
              hidden: true,
              value: 'Cancel',
              click: function () {
                this.getFormView().clearValidation();
                updatedConfigHandlers.startSettings();
                let changeAndSetButtonUi = $$('changeAndSetStartSettingsButton');
                let cancelEditButtonUi = $$('cancelEditStartSettingsButton');
                changeAndSetButtonUi.define('type', '');
                changeAndSetButtonUi.setValue('Change');
                changeAndSetButtonUi.refresh();
                cancelEditButtonUi.hide();
                let startDateConfigUi = $$('startDateConfig');
                startDateConfigUi.disable();
                lendingCurrencies.forEach((currency) => {
                  $$(`startBalance.${currency}`).disable();
                });
              },
            },
            {},
          ]
        },
      ]
    }
  ],
};

lendingCurrencies.forEach((currency) => {
  let currencyConfig = {
      cols: [
        { view: 'label', label: '', width: 28 },
        { view: 'label',label: returnCurrencyTemplate({ currency: currency }), width: labelWidth - 28 },
        { view: 'text', id: `startBalance.${currency}`, name: `startBalance.${currency}`, width: inputTextWidth / 4*3, disabled: true, value: 0, validate: webix.rules.isNumber },
      ]
    };
  startSettingsConfig.elements[0].rows.splice(3, 0, currencyConfig);
});

settingsName = 'lending';
let lendingSettingsConfig = {
  id: `${settingsName}Settings`,
  view: 'form',
  borderless: true,
  type: 'clean',
  complexData: true,
  elements: [
    {
      rows: [
        { view: 'template', template:"Lending engine", type: 'section', /*css: 'section webix_section'*/ },
        {
          cols: [
            { view: 'label', label: '', width: labelWidth },
            { view: 'label', label: 'Min lending rate', width: inputTextWidth / 4*3, tooltip: 'The lending engine\nwill not place loan offers under this rate', validate: webix.rules.isNumber },
            { view: 'label', label: 'Max lending amount', width: inputTextWidth / 4*3, tooltip: 'Total amount of each currency\nthe lending engine will lend', validate: webix.rules.isNumber },
            {},
          ]
        },
        {
          cols: [
            { view: 'label',label: '', width: labelWidth },
            {
              view: 'button',
              id: `change${settingsName}SettingsButton`,
              width: buttonWidth,
              value: 'Change',
              click: function () {
                let fields = [];
                lendingCurrencies.forEach((currency) => {
                  fields.push(`offerMinRate.${currency}`);
                  fields.push(`offerMaxAmount.${currency}`);
                  });
                let settingsValues = this.getFormView().getValues();
                let formId = this.getFormView().config.id;
                let changeSettingsButtonUi = $$(`change${formId}Button`);
                let cancelEditSettingsButtonUi = $$(`cancelEdit${formId}Button`);
                if ($$(fields[0]).isEnabled()) {
                  let isValid = this.getFormView().validate();
                  if (!isValid) {
                    webix.message({ type:'error', text: 'Invalid values' });
                    return;
                  }

                  showProcessingDataMessage();
                  cancelEditSettingsButtonUi.disable();
                  config.offerMinRate = settingsValues.offerMinRate;
                  config.offerMaxAmount = settingsValues.offerMaxAmount;
                  socket.emit('updateConfig', config, `${formId}`);
                } else {
                  if (!storage.browserAuth.isReadWriteAllowed) {
                    webix.message({ type:'error', text: 'Not authorized!<br>Read/write auth token required' });
                    return;
                  }

                  changeSettingsButtonUi.define('type', 'form');
                  changeSettingsButtonUi.setValue('Update');
                  changeSettingsButtonUi.refresh();
                  cancelEditSettingsButtonUi.show();
                  cancelEditSettingsButtonUi.enable();
                  fields.forEach(field => $$(field).enable());
                }
              },
            },
            {
              view: 'button',
              id: `cancelEdit${settingsName}SettingsButton`,
              width: buttonWidth,
              type: 'danger',
              hidden: true,
              value: 'Cancel',
              click: function () {
                let fields = [];
                lendingCurrencies.forEach((currency) => {
                  fields.push(`offerMinRate.${currency}`);
                  fields.push(`offerMaxAmount.${currency}`);
                });
                let formId = this.getFormView().config.id;
                this.getFormView().clearValidation();
                updatedConfigHandlers[formId]();
                let changeSettingsButtonUi = $$(`change${formId}Button`);
                let cancelEditSettingsButtonUi = $$(`cancelEdit${formId}Button`);
                changeSettingsButtonUi.define('type', '');
                changeSettingsButtonUi.setValue('Change');
                changeSettingsButtonUi.refresh();
                cancelEditSettingsButtonUi.hide();
                fields.forEach(field => $$(field).disable());
              },
            },
            {},
          ]
        },
      ]
    }
  ],
};

lendingCurrencies.forEach((currency) => {
  let currencyConfig = {
    cols: [
      { view: 'label', label: '', width: 28 },
      { view: 'label',label: returnCurrencyTemplate({ currency: currency }), width: labelWidth - 28 },
      { view: 'text', id: `offerMinRate.${currency}`, name: `offerMinRate.${currency}`, width: inputTextWidth / 4*3, disabled: true, value: 0, validate: webix.rules.isNumber },
      { view: 'text', id: `offerMaxAmount.${currency}`, name: `offerMaxAmount.${currency}`, width: inputTextWidth / 4*3, disabled: true, value: 0, validate: webix.rules.isNumber },
      {},
    ]
  };
  lendingSettingsConfig.elements[0].rows.splice(2, 0, currencyConfig);
});

settingsName = 'consoleReports';
let consoleReportsSettingsConfig = {
  id: `${settingsName}Settings`,
  view: 'form',
  borderless: true,
  type: 'clean',
  complexData: true,
  elements: [
    {
      rows: [
        { view: 'template', template:"Console reports", type: 'section', /*css: 'section webix_section'*/ },
        {
          cols: [
            { view: 'label',label: 'Console reports interval', width: labelWidth, tooltip: 'Period in minutes for console reports' },
            { view: 'counter', id: 'reportEveryMinutes', name: 'reportEveryMinutes', width: inputTextWidth, disabled: true, step: 60, value: 60 * 12, min: 1, max: 60 * 24, tooltip: 'Period in minutes for console reports' },
            {},
          ]
        },
        {
          cols: [
            { view: 'label',label: '', width: labelWidth },
            {
              view: 'button',
              id: `change${settingsName}SettingsButton`,
              width: buttonWidth,
              value: 'Change',
              click: function () {
                let fields = ['reportEveryMinutes'];
                let settingsValues = this.getFormView().getValues();
                let formId = this.getFormView().config.id;
                let changeSettingsButtonUi = $$(`change${formId}Button`);
                let cancelEditSettingsButtonUi = $$(`cancelEdit${formId}Button`);
                if ($$(fields[0]).isEnabled()) {
                  showProcessingDataMessage();
                  cancelEditSettingsButtonUi.disable();
                  config.reportEveryMinutes = settingsValues.reportEveryMinutes;
                  socket.emit('updateConfig', config, `${formId}`);
                } else {
                  if (!storage.browserAuth.isReadWriteAllowed) {
                    webix.message({ type:'error', text: 'Not authorized!<br>Read/write auth token required' });
                    return;
                  }

                  changeSettingsButtonUi.define('type', 'form');
                  changeSettingsButtonUi.setValue('Update');
                  changeSettingsButtonUi.refresh();
                  cancelEditSettingsButtonUi.show();
                  cancelEditSettingsButtonUi.enable();
                  fields.forEach(field => $$(field).enable());
                }
              },
            },
            {
              view: 'button',
              id: `cancelEdit${settingsName}SettingsButton`,
              width: buttonWidth,
              type: 'danger',
              hidden: true,
              value: 'Cancel',
              click: function () {
                let fields = ['reportEveryMinutes'];
                let formId = this.getFormView().config.id;
                this.getFormView().clearValidation();
                updatedConfigHandlers[formId]();
                let changeSettingsButtonUi = $$(`change${formId}Button`);
                let cancelEditSettingsButtonUi = $$(`cancelEdit${formId}Button`);
                changeSettingsButtonUi.define('type', '');
                changeSettingsButtonUi.setValue('Change');
                changeSettingsButtonUi.refresh();
                cancelEditSettingsButtonUi.hide();
                fields.forEach(field => $$(field).disable());
              },
            },
            {},
          ]
        },
        {},
      ]
    }
  ],
};

let validateTelegramData = function validateTelegramData(value, key){
  let formValues = this.getValues();
  return formValues.telegramReports.isEnabled ? value !== '' : true;
};

settingsName = 'telegramReports';
let telegramReportsSettingsConfig = {
  id: `${settingsName}Settings`,
  view: 'form',
  borderless: true,
  type: 'clean',
  complexData: true,
  elements: [
    {
      rows: [
        { view: 'template', template:"Telegram reports", type: 'section', /*css: 'section webix_section'*/ },
        {
          cols: [
            { view: 'label',label: 'Enable telegram reports', width: labelWidth, tooltip: 'Enable/Disable Telegram reports' },
            { view: 'checkbox', id: 'telegramReports.isEnabled', name: 'telegramReports.isEnabled', value: 0, disabled: true, tooltip: 'Enable/Disable Telegram reports',
              on: { onChange: function (newValue, oldValue) { newValue === 0 && this.getFormView().clearValidation(); } },
            },
            {},
          ]
        },
        {
          cols: [
            { view: 'label',label: 'Telegram reports interval', width: labelWidth, tooltip: 'Period in minutes for console reports'  },
            { view: 'counter', id: 'telegramReports.reportEveryMin', name: 'telegramReports.reportEveryMin', width: inputTextWidth, disabled: true, step: 60, value: 60 * 12, min: 1, max: 60 * 24, tooltip: 'Period in minutes for telegram reports' },
            {},
          ]
        },
        {
          cols: [
            { view: 'label',label: 'Telegram userId', width: labelWidth, tooltip: 'Telegram userId'  },
            { view: 'text', id: 'telegramReports.telegramUserId', name: 'telegramReports.telegramUserId', width: inputTextWidth, disabled: true, value: '', tooltip: 'Telegram UserId', validate: validateTelegramData },
            {},
          ]
        },
        {
          cols: [
            { view: 'label',label: 'Telegram token', width: labelWidth, tooltip: 'Telegram bot token'  },
            { view: 'text', id: 'telegramReports.telegramToken', name: 'telegramReports.telegramToken', width: inputTextWidth, disabled: true, value: '', tooltip: 'Telegram bot token', validate: validateTelegramData },
            {},
          ]
        },
        {
          cols: [
            { view: 'label',label: '', width: labelWidth },
            {
              view: 'button',
              id: `change${settingsName}SettingsButton`,
              width: buttonWidth,
              value: 'Change',
              click: function () {
                let fields = ['telegramReports.isEnabled', 'telegramReports.reportEveryMin', 'telegramReports.telegramUserId', 'telegramReports.telegramToken'];
                let settingsValues = this.getFormView().getValues();
                let formId = this.getFormView().config.id;
                let changeSettingsButtonUi = $$(`change${formId}Button`);
                let cancelEditSettingsButtonUi = $$(`cancelEdit${formId}Button`);
                if ($$(fields[0]).isEnabled()) {
                  let isValid = this.getFormView().validate();
                  if (!isValid) {
                    webix.message({ type:'error', text: 'Invalid values' });
                    return;
                  }

                  showProcessingDataMessage();
                  cancelEditSettingsButtonUi.disable();
                  config.telegramReports = settingsValues.telegramReports;
                  socket.emit('updateConfig', config, `${formId}`);
                } else {
                  if (!storage.browserAuth.isReadWriteAllowed) {
                    webix.message({ type:'error', text: 'Not authorized!<br>Read/write auth token required' });
                    return;
                  }

                  changeSettingsButtonUi.define('type', 'form');
                  changeSettingsButtonUi.setValue('Update');
                  changeSettingsButtonUi.refresh();
                  cancelEditSettingsButtonUi.show();
                  cancelEditSettingsButtonUi.enable();
                  fields.forEach(field => $$(field).enable());
                }
              },
            },
            {
              view: 'button',
              id: `cancelEdit${settingsName}SettingsButton`,
              width: buttonWidth,
              type: 'danger',
              hidden: true,
              value: 'Cancel',
              click: function () {
                let fields = ['telegramReports.isEnabled', 'telegramReports.reportEveryMin', 'telegramReports.telegramUserId', 'telegramReports.telegramToken'];
                let formId = this.getFormView().config.id;
                this.getFormView().clearValidation();
                updatedConfigHandlers[formId]();
                let changeSettingsButtonUi = $$(`change${formId}Button`);
                let cancelEditSettingsButtonUi = $$(`cancelEdit${formId}Button`);
                changeSettingsButtonUi.define('type', '');
                changeSettingsButtonUi.setValue('Change');
                changeSettingsButtonUi.refresh();
                cancelEditSettingsButtonUi.hide();
                fields.forEach(field => $$(field).disable());
              },
            },
            {},
          ]
        },
        {},
      ]
    }
  ],
};

settingsName = 'lendingAdvisor';
let lendingAdvisorSettingsConfig = {
  id: `${settingsName}Settings`,
  view: 'form',
  borderless: true,
  type: 'clean',
  complexData: true,
  elements: [
    {
      rows: [
        { view: 'template', template:"Lending advisor", type: 'section', /*css: 'section webix_section'*/ },
        {
          cols: [
            { view: 'label',label: 'Lending advisor server', width: labelWidth, tooltip: 'Lending advisor server name' },
            { view: 'select', id: 'lendingAdvisor.server', name: 'lendingAdvisor.server', width: inputTextWidth, options: lendingAdvisorServers, value: 0, disabled: true, tooltip: 'Lending advisor server name' },
            {},
          ]
        },
        {
          cols: [
            { view: 'label',label: 'Access token', width: labelWidth, tooltip: 'Access token for lending advisor\n(not used)'  },
            { view: 'text', id: 'lendingAdvisor.accessToken', name: 'lendingAdvisor.accessToken', width: inputTextWidth, disabled: true, value: '', tooltip: 'Access token for lending advisor\n(not used)' },
            {},
          ]
        },
        {
          cols: [
            { view: 'label',label: '', width: labelWidth },
            {
              view: 'button',
              id: `change${settingsName}SettingsButton`,
              width: buttonWidth,
              value: 'Change',
              click: function () {
                let fields = ['lendingAdvisor.server', 'lendingAdvisor.accessToken'];
                let settingsValues = this.getFormView().getValues();
                let formId = this.getFormView().config.id;
                let changeSettingsButtonUi = $$(`change${formId}Button`);
                let cancelEditSettingsButtonUi = $$(`cancelEdit${formId}Button`);
                if ($$(fields[0]).isEnabled()) {
                  let isValid = this.getFormView().validate();
                  if (!isValid) {
                    webix.message({ type:'error', text: 'Invalid values' });
                    return;
                  }

                  showProcessingDataMessage();
                  cancelEditSettingsButtonUi.disable();
                  config.lendingAdvisor = settingsValues.lendingAdvisor;
                  socket.emit('updateConfig', config, `${formId}`);
                } else {
                  if (!storage.browserAuth.isReadWriteAllowed) {
                    webix.message({ type:'error', text: 'Not authorized!<br>Read/write auth token required' });
                    return;
                  }

                  changeSettingsButtonUi.define('type', 'form');
                  changeSettingsButtonUi.setValue('Update');
                  changeSettingsButtonUi.refresh();
                  cancelEditSettingsButtonUi.show();
                  cancelEditSettingsButtonUi.enable();
                  fields.forEach(field => $$(field).enable());
                }
              },
            },
            {
              view: 'button',
              id: `cancelEdit${settingsName}SettingsButton`,
              width: buttonWidth,
              type: 'danger',
              hidden: true,
              value: 'Cancel',
              click: function () {
                let fields = ['lendingAdvisor.server', 'lendingAdvisor.accessToken'];
                let formId = this.getFormView().config.id;
                this.getFormView().clearValidation();
                updatedConfigHandlers[formId]();
                let changeSettingsButtonUi = $$(`change${formId}Button`);
                let cancelEditSettingsButtonUi = $$(`cancelEdit${formId}Button`);
                changeSettingsButtonUi.define('type', '');
                changeSettingsButtonUi.setValue('Change');
                changeSettingsButtonUi.refresh();
                cancelEditSettingsButtonUi.hide();
                fields.forEach(field => $$(field).disable());
              },
            },
            {},
          ]
        },
        {},
      ]
    }
  ],
};

let settingsView = {
  id: 'settings',
  borderless: true,
  type: 'clean',
  cols: [
    {},
    {
      type: 'clean',
      rows: [
        browserAuthConfig,
        { view: 'template', template: '', height: 20},
        apiKeySettingsConfig,
        { view: 'template', template: '', height: 20},
        startSettingsConfig,
        { view: 'template', template: '', height: 20},
        lendingSettingsConfig,
        { view: 'template', template: '', height: 20},
        consoleReportsSettingsConfig,
        { view: 'template', template: '', height: 20},
        telegramReportsSettingsConfig,
        { view: 'template', template: '', height: 20},
        lendingAdvisorSettingsConfig,
      ]
    },
    {},
  ],
};

const onTokenValidated = function onTokenValidated(data) {
  let authClient = data;
  hideProcessingDataMessage();
  if (!authClient.isReadAllowed) {
    webix.message({ type:'error', text: 'Invalid token' });
    return;
  }

  let settingsValues = $$('browserAuthSettings').getValues();

  if (!authClient.isReadWriteAllowed && settingsValues.browserAuth.isChangeEnabled) {
    webix.message({ type:'error', text: 'Cannot enable config changes!\nNeed read/write auth token' });
  }

  storage.browserAuth = {
    token: authClient.token,
    isReadWriteAllowed: authClient.isReadWriteAllowed,
    expiresOn: new Date(Date.now() + parseFloat(settingsValues.browserAuth.rememberForDays || 0) * 24 * 60 * 60 * 1000),
    isChangeEnabled: settingsValues.browserAuth.isChangeEnabled,
    rememberForDays: settingsValues.browserAuth.rememberForDays,
  };
  store.set('poloLender',  { browserAuth: storage.browserAuth });
//  socket.emit('authorization', storage.browserAuth.token, null);

  webix.message({
    text: `Config updated`,
  });
  updatedConfigHandlers.browserAuthSettings();
};

const onNewTokenGenerated = function onNewTokenGenerated(data) {
  let authClient = data;
  hideProcessingDataMessage();
  let settingsValues = $$('browserAuthSettings').getValues();
  storage.browserAuth = {
    token: authClient.token,
    isReadWriteAllowed: authClient.isReadWriteAllowed,
    expiresOn: new Date(Date.now() + parseFloat(settingsValues.browserAuth.rememberForDays || 0) * 24 * 60 * 60 * 1000),
    isChangeEnabled: settingsValues.browserAuth.isChangeEnabled,
    rememberForDays: settingsValues.browserAuth.rememberForDays,
  };
  store.set('poloLender',  { browserAuth: storage.browserAuth });
  //socket.emit('authorization', storage.browserAuth.token, null);

  webix.message({
    text: `Config updated`,
  });
  updatedConfigHandlers.browserAuthSettings();
};

updatedConfigHandlers.browserAuthSettings = function updatedConfigHandlers_browserAuthSettings() {
  let formId = 'browserAuthSettings';
  let fields = ['browserAuth.token', 'browserAuth.rememberForDays', 'browserAuth.tokenExpiresIn', 'browserAuth.generateNewToken'];

  let browserAuth = _.defaultsDeep(storage.browserAuth, $$(formId).getValues().browserAuth);
  browserAuth.isChangeEnabled = storage.browserAuth.isReadWriteAllowed ? browserAuth.isChangeEnabled : false;
  browserAuth.rememberForDays = storage.browserAuth.rememberForDays;
  $$(formId).setValues({ browserAuth: storage.browserAuth});

  let changeSettingsButtonUi = $$(`change${formId}Button`);
  let cancelEditSettingsButtonUi = $$(`cancelEdit${formId}Button`);
  cancelEditSettingsButtonUi.hide();
  changeSettingsButtonUi.define('type', '');
  changeSettingsButtonUi.setValue('Change');
  changeSettingsButtonUi.refresh();

  fields.forEach(field => $$(field).disable());
};

updatedConfigHandlers.startSettings = function updatedConfigHandlers_startSettings() {
  let values = {
    startDate: new Date(parseInt(moment(config.startDate).format('x'))),
    startBalance: config.startBalance,
  };
  _.forEach(values.startBalance, (startBalance, currency) => {
    if (startBalance[currency] === '') {
      startBalance[currency] = 0;
    }
  });
  $$('startSettings').setValues(values);
  let changeAndSetStartSettingsButtonUi = $$('changeAndSetStartSettingsButton');
  let cancelEditStartSettingsButtonUi = $$('cancelEditStartSettingsButton');
  $$('startDateConfig').disable();
  lendingCurrencies.forEach((currency) => {
    $$(`startBalance.${currency}`).disable();
  });
  cancelEditStartSettingsButtonUi.hide();
  changeAndSetStartSettingsButtonUi.define('type', '');
  changeAndSetStartSettingsButtonUi.setValue('Change');
  changeAndSetStartSettingsButtonUi.refresh();
};

updatedConfigHandlers.apiKeySettings = function updatedConfigHandlers_apiKeySettings() {
  let formId = 'apiKeySettings';
  let fields = ['apiKey.key', 'apiKey.secret'];

  $$(formId).setValues({ apiKey: config.apiKey });

  let changeSettingsButtonUi = $$(`change${formId}Button`);
  let cancelEditSettingsButtonUi = $$(`cancelEdit${formId}Button`);
  cancelEditSettingsButtonUi.hide();
  changeSettingsButtonUi.define('type', '');
  changeSettingsButtonUi.setValue('Change');
  changeSettingsButtonUi.refresh();
  fields.forEach(field => $$(field).disable());
};

updatedConfigHandlers.lendingSettings = function updatedConfigHandlers_lendingSettings() {
  let formId = 'lendingSettings';
  let fields = [];
  lendingCurrencies.forEach((currency) => {
    fields.push(`offerMinRate.${currency}`);
    fields.push(`offerMaxAmount.${currency}`);
  });

  lendingCurrencies.forEach((currency) => {
    if (!Number.isFinite(parseFloat(config.offerMinRate[currency]))) {
      config.offerMinRate[currency] = 0;
    }

    if (!Number.isFinite(parseFloat(config.offerMaxAmount[currency]))) {
      config.offerMaxAmount[currency] = 9999999;
    }
  });

  let values = {
    offerMinRate: config.offerMinRate,
    offerMaxAmount: config.offerMaxAmount,
  };

  $$(formId).setValues(values);

  let changeSettingsButtonUi = $$(`change${formId}Button`);
  let cancelEditSettingsButtonUi = $$(`cancelEdit${formId}Button`);
  cancelEditSettingsButtonUi.hide();
  changeSettingsButtonUi.define('type', '');
  changeSettingsButtonUi.setValue('Change');
  changeSettingsButtonUi.refresh();
  fields.forEach(field => $$(field).disable());
};

updatedConfigHandlers.consoleReportsSettings = function updatedConfigHandlers_consoleReportsSettings() {
  let formId = 'consoleReportsSettings';
  let fields = ['reportEveryMinutes'];

  $$(formId).setValues({reportEveryMinutes: config.reportEveryMinutes});

  let changeSettingsButtonUi = $$(`change${formId}Button`);
  let cancelEditSettingsButtonUi = $$(`cancelEdit${formId}Button`);
  cancelEditSettingsButtonUi.hide();
  changeSettingsButtonUi.define('type', '');
  changeSettingsButtonUi.setValue('Change');
  changeSettingsButtonUi.refresh();
  fields.forEach(field => $$(field).disable());
};

updatedConfigHandlers.telegramReportsSettings = function updatedConfigHandlers_telegramReportsSettings() {
  let formId = 'telegramReportsSettings';
  let fields = ['telegramReports.isEnabled', 'telegramReports.reportEveryMin', 'telegramReports.telegramUserId', 'telegramReports.telegramToken'];

  $$(formId).setValues({ telegramReports: config.telegramReports });

  let changeSettingsButtonUi = $$(`change${formId}Button`);
  let cancelEditSettingsButtonUi = $$(`cancelEdit${formId}Button`);
  cancelEditSettingsButtonUi.hide();
  changeSettingsButtonUi.define('type', '');
  changeSettingsButtonUi.setValue('Change');
  changeSettingsButtonUi.refresh();
  fields.forEach(field => $$(field).disable());
};

updatedConfigHandlers.lendingAdvisorSettings = function updatedConfigHandlers_lendingAdvisorSettings() {
  let formId = 'lendingAdvisorSettings';
  let fields = ['lendingAdvisor.server', 'lendingAdvisor.accessToken'];

  $$(formId).setValues({ lendingAdvisor: config.lendingAdvisor });

  let changeSettingsButtonUi = $$(`change${formId}Button`);
  let cancelEditSettingsButtonUi = $$(`cancelEdit${formId}Button`);
  cancelEditSettingsButtonUi.hide();
  changeSettingsButtonUi.define('type', '');
  changeSettingsButtonUi.setValue('Change');
  changeSettingsButtonUi.refresh();
  fields.forEach(field => $$(field).disable());
};
