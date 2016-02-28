'use strict';

// Declare app level module which depends on filters, and services

angular.module('myApp', [
  'ngRoute',

  'myApp.controllers',
  'myApp.filters',
  'myApp.services',
  'myApp.directives',

  // 3rd party dependencies
  'btford.socket-io'
]).
config(function ($routeProvider, $locationProvider) {
  $routeProvider.
    when('/view1', {
      templateUrl: 'partials/partial1',
      controller: 'MyCtrl1'
    }).
    when('/iodata', {
      templateUrl: 'partials/iodata',
      controller: 'PoloLenderCtrl'
    }).
  when('/about', {
    templateUrl: 'partials/about',
    controller: 'MyCtrl1'
  }).
    otherwise({
      redirectTo: '/view1'
    });

  $locationProvider.html5Mode(true);
});
