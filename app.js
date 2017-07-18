import debug from 'debug';
import { Workers } from './server/workers';

debug('app');

let workers = new Workers();
workers.start();
