"use strict";
//Contains server state (global variables)

var name = "poloLender";
exports.name = name;

var config = {};
exports.config = config;

var workers = [];
exports.workers = workers;

var io = null;
exports.io = io;

var logger = require("./logger");
exports.logger = logger;

