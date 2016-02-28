"use strict";
//Contains server state (global variables)

var mongoose = require ("mongoose");

var name = "xWo";
exports.name = name;

var config = {};
exports.config = config;

var workers = [];
exports.config = workers;

var ws = null;
exports.config = ws;

var logger = require("./logger");
exports.logger = logger;

var db = mongoose.connection;
exports.db = db;

