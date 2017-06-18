'use strict';

const winston = require('winston');
const _ = require('lodash');
const env = require('node-env-file');
const express = require('express');
const logger = require('morgan');
const http = require('http');
const path  = require('path');
const bodyParser = require('body-parser');
const socketIo = require('socket.io');

let Workers = require('./server/workers/workers');
let srv = require ('./server/core/srv');
let config = require('./server/core/config');
let index = require('./routes/index').router;

let httpPort = process.env.PORT || 5000;
let log = srv.logger;

try {
	env('./.env', {verbose: false, overwrite: false});
} catch (err) {
	log.notice(err.message);
}

srv.config = _.cloneDeep(config);

const onError = function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  let port = this;
  let bind = _.isString(port) && `Pipe ${port}` || `Port ${port}`;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES': {
      log.crit(`${bind} requires elevated privileges.\n App will now exit!`);
      process.exit(1);
      break;
    }
    case 'EADDRINUSE': {
      log.crit(`${bind} is already in use.\n App will now exit!`);
      process.exit(1);
      break;
    }
    default: {
      throw error;
    }
  }
};

const onListening = function onListening() {
  let server = this;
  const addr = server.address();
  let bind = _.isString(addr) && `Pipe ${addr}` || `Port ${addr.port}`;
  log.info(`Listening on ${bind}`);
};

const app = express();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
//app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('json spaces', 2);

app.use('/', index);
app.set('port', httpPort);
let httpServer = http.createServer(app);
let onHttpError = _.bind(onError, httpPort);
httpServer.on('error', onHttpError);
let onHttpListening = _.bind(onListening, httpServer);
httpServer.on('listening', onHttpListening);

srv.io = socketIo(httpServer);
httpServer.listen(httpPort);

srv.workers = new Workers();
srv.workers.start();
