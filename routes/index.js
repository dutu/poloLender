'use strict';

const express = require('express');

let router = express.Router();

router.get('/', function(req, res, next) {
  res.render('index', { title: 'poloLender Pro' });
});

module.exports.router= router;
