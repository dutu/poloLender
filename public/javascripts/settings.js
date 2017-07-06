let appConfig = {};
let startSettingsConfig = {
  id: 'startSettings',
  view: 'form',
  complexData: true,
  elements: [
    {
      rows: [
        {
          cols: [
            { view: 'label',label: 'Start date', width: labelWidth },
            { view: 'datepicker', id: 'startDateConfig', timepicker:true, disabled: true, value: new Date(parseInt(moment(appConfig.startDate).format('x'))), format:'%Y-%m-%d %H:%i', name: 'startDate', width: 180 },
            {},
          ]
        },
        {
          cols: [
            { view: 'label',label: '', width: labelWidth },
            {
              view: 'button',
              id: 'changeAndSetStartDateButton',
              width: buttonWidth,
              type: 'form',
              value: 'Change',
              click: function () {
                let startSettings = $$('startSettings').getValues();
                let startDateConfigUi = $$('startDateConfig');
                let changeAndSetButtonUi = $$('changeAndSetStartDateButton');
                let cancelEditSettingsButtonUi = $$('cancelEditStartSettingsButton');
                if (startDateConfigUi.isEnabled()) {
                  showSavingDataMessage();
                  cancelEditSettingsButtonUi.disable();
                  socket.emit('updateConfig.startSettings', startSettings);
                } else {
                  changeAndSetButtonUi.define('type', 'form');
                  changeAndSetButtonUi.setValue('Update');
                  changeAndSetButtonUi.refresh();
                  cancelEditSettingsButtonUi.show();
                  cancelEditSettingsButtonUi.enable();
                  startDateConfigUi.enable();
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
                setStartSetings();
                let changeAndSetButtonUi = $$('changeAndSetStartDateButton');
                let cancelEditButtonUi = $$('cancelEditStartSettingsButton');
                changeAndSetButtonUi.define('type', '');
                changeAndSetButtonUi.setValue('Change');
                changeAndSetButtonUi.refresh();
                cancelEditButtonUi.hide();
                let startDateConfigUi = $$('startDateConfig');
                startDateConfigUi.disable();
              },
            },
            {},
          ]
        },
      ]
    }
  ]
};

let apiKeySettingsConfig = {
  id: 'apiKeySettings',
  rows: [
    {
      cols: [
        { view: 'label',label: 'Key', width: labelWidth },
        { view: 'text', id: 'secret', name: 'secret', width: inputTextWidth, disabled: true, value: 'secret' },
        {},
      ]
    },
    {
      cols: [
        { view: 'label',label: 'Password', width: labelWidth },
        {
          view: 'text',
          id: 'password',
          type: 'password',
          name: 'password',
          width: inputTextWidth,
          disabled: true,
          value: '**************************',
        },
        {},
      ]
    },
    {
      cols: [
        { view: 'label',label: '', width: labelWidth },
        {
          view: 'button',
          id: 'changeAndSetApiKeyButton',
          width: buttonWidth,
          type:"form",
          value: 'Change',
          click: function () {
            let newUsername = $$('apiKeySettings').getValues();
          },
        },
        {
          view: 'button',
          id: 'cancelUsernameButton',
          width: buttonWidth,
          type:"form",
          hidden: true,
          value: 'Cancel',
          click: function () {
          },
        },
        {},
      ]
    },
  ]
};

let settingsView = {
  id: 'settings',
  scroll: 'xy',
  borderless: true,
  type: 'clean',
  cols: [
    { gravity: 1 },
    {
      type: 'clean',
      rows: [
        { view:"template", template:"Start Settings", type:"section", css: 'section webix_section' },
        startSettingsConfig,
        { gravity: 0.1 },
        { view:"template", template:"API Key", type:"section", css: 'section webix_section' },
        apiKeySettingsConfig,
        { gravity: 1 },
      ]
    },
    { gravity: 1 },
  ],
};

let setStartSetings = function setStartSetings() {
  let startSettingsUi = $$('startSettings');
  let values = {
    startDate: new Date(parseInt(moment(appConfig.startDate).format('x'))),
    startBalance: appConfig.startBalance,
  };
  startSettingsUi.setValues(values);
  let changeAndSetStartDateButtonUi = $$('changeAndSetStartDateButton');
  let cancelEditStartSettingsButtonUi = $$('cancelEditStartSettingsButton');
  let startDateConfigUi = $$('startDateConfig');
  startDateConfigUi.disable();
  cancelEditStartSettingsButtonUi.hide();
  changeAndSetStartDateButtonUi.define('type', '');
  changeAndSetStartDateButtonUi.setValue('Change');
  changeAndSetStartDateButtonUi.refresh();
};

let updateConfig = function updateAppConfig(config) {
  appConfig = config;
  setStartSetings();
};

let updatedAppConfig = {
  startSettings: function (errMessage, config) {
    hideProcessingDataMessage();
    if (errMessage) {
      webix.message({
        type: "error",
        text: `Error updating settings: ${errMessage}`,
      });
    } else {
      appConfig = config;
      setStartSetings();
      webix.message({
        text: `Start settings updated`,
      });

    }
  }
};