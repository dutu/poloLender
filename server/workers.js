import _ from 'lodash';

import { log } from './loggers';
import { PoloLender } from './workers/poloLender/poloLender';

export class Workers {
  constructor() {
    this.workers = [];
  }

  start() {
    log.warning(`*****  poloLender is restarting...  *****`);
    const startWorker = function startWorker(worker) {
      if(_.isFunction(worker.start)) {
        worker.start();
      } else {
        log.crit(`Workers: Worker ${worker.me} cannot not start`);
      }
    };

    let poloLender = new PoloLender("poloLender");
    this.workers.push(poloLender);

    this.workers.forEach(worker => startWorker(worker));
  }

  closeGracefully(signal) {
    const graceTimeout = 100;
    process.exit();
    log.notice("%s: received signal (%s) on %s, shutting down gracefully in %s ms'", this.me,
      signal,
      new Date().toString('T'),
      graceTimeout
    );
    setTimeout(function() {
      log.notice('(x) forcefully shutting down',graceTimeout);
      process.exit();
    }, graceTimeout);

    this.workers.forEach((worker) => {
        if (_.isFunction(worker.closeGracefully)) {
            worker.closeGracefully();
        }
    });
    };
}
