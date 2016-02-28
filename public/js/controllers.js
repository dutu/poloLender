'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
	controller('AppCtrl', function ($scope, socket) {
		$scope.ioLoanOfferParametersStrings = [];
	    socket.on('send:name', function (data) {
	      $scope.name = data.name;
	    });
	  }).
	controller('MyCtrl1', function ($scope, socket) {
		socket.on('send:time', function (data) {
			$scope.time = data.time;
		});
	}).
	controller('PoloLenderCtrl', function ($scope, socket) {
		socket.on('send:loanOfferParameters', function (data) {
			$scope.ioLoanOfferParametersStrings.unshift(JSON.stringify(data));
			if ($scope.ioLoanOfferParametersStrings.length == 6) {
				$scope.ioLoanOfferParametersStrings.splice(5,1);
			}
		});
	}).
	controller('MyCtrl2', function ($scope) {
    // write Ctrl here
  });
