import debug from 'debug';
import { httpServerStart } from './server/httpServer';
import { Workers } from './server/workers';

debug('app');

httpServerStart();
let workers = new Workers();
workers.start();
