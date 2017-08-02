import http from 'http';
import _ from 'lodash';
import express from 'express';
import path from 'path';
import favicon from 'serve-favicon';
import logger from 'morgan';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import lessMiddleware from 'less-middleware';
import socketIo from 'socket.io';

import { log } from './loggers';
import { router as index } from '../routes/index';

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

export let io = null;

export const httpServerStart = function httpServerStart(port) {
  const app = express();

// view engine setup
  app.set('views', path.join(__dirname, '/../views'));
  app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
  app.use(logger('tiny'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(lessMiddleware(path.join(__dirname, '/../public')));
  app.use(express.static(path.join(__dirname, '/../public')));
  app.set('json spaces', 2);

  app.use('/', index);

// catch 404 and forward to error handler
  app.use((req, res, next) => {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

// error handler
  app.use((err, req, res, next) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
//    res.render('error');
  });


  const httpPort = process.env.PORT || port || '5000';
  app.set('port', httpPort);

  const httpServer = http.createServer(app);
  const onErrorHttp = _.bind(onError, httpPort);
  httpServer.on('error', onErrorHttp);
  const onListeningHttp = _.bind(onListening, httpServer);
  httpServer.on('listening', onListening);
  httpServer.listen(httpPort);
  io = socketIo(httpServer);
};
