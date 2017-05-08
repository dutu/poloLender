# poloLender Pro Changelog

All notable changes to this module are documented in this file.
poloLender application adheres to [Semantic Versioning](http://semver.org/).

## [0.7.2] - 2017-05-09

### Fixed
- update dependency on `poloniex-api-node` module for better handling of Poloniex API errors
- only update currency list only when all set of API calls is complete
 
### Changed
- only show status for coins with balance > 0


## [0.7.1] - 2017-04-21

### Added
- console shows USD profit for every applicable currency

### Changed
- more robust API calls throttling to comply with Poloniex limits
- support any currency for which lendingRate is received from **poloLending-Advisor** server 

## [0.7.0] - 2017-04-06

### Added
- Web interface

## [0.6.1] - 2017-03-28

### Added
- API calls throttling to comply with Poloniex limits

### Changed
- update dependency on Poloniex API wrapper to correctly show API error message details

## [0.6.0] - 2017-01-24

### Added
- support for lending Dash (DASH)

## [0.5.0] - 2016-10-11

### Added
- support for minimum lend rates

## [0.4.0] - 2016-09-16

### Added
- support for lending Ripple (XRP)

## [0.3.0] - 2016-08-26

### Added
- support for lending Monero (XMR)

### Changed
- node.js 6.x.x is required

### Fixed
- fix clientMessage log output  

## [0.2.0] - 2016-03-15

### Fixed
- fix handling env variable numbers
- fix Polonex API error handling
- fix API call timeout when Poloniex doesn't send any response back

### Added
- add logging clientMessage
- add logging console log when new bot version is available

### Changed


## [0.1.0] - 2016-03-01
First release
