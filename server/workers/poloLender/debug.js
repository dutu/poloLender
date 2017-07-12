import { log } from '../../loggers'

export let debugTimer = {
  call: '',
  time: Date.now(),
  cycle: Date.now(),
};

export const debugApiCallDuration = function debugApiCallDuration(apiMethodName) {
  if (!this.config.debug.debugApiCallDuration) {
    return
  }

  let timeNow = Date.now();
  log.warning(`apiCall: ${debugTimer.call}, duration: ${timeNow - debugTimer.time} ms`);
  debugTimer.call = apiMethodName;
  debugTimer.time = timeNow;
};
export const debugCycleDuration = function debugCycleDuration() {
  if (!this.config.debug.debugApiCallDuration) {
    return
  }

  let timeNow = Date.now();
  log.warning(`cicle duration: ${timeNow - debugTimer.cycle} ms`);
  debugTimer.cycle =timeNow;
};
