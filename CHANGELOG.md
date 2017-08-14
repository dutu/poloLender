# poloLender Pro Changelog

All notable changes to this module are documented in this file.
poloLender application adheres to [Semantic Versioning](http://semver.org/).

## [1.3.3] - 2017-08-11

### Fixed
- performance counter doesn't include first active loan

## [1.3.2] - 2017-08-02

### Added
- performance view shows accumulated unrealized interest  

### Changed
- minimal console output for http server  

## [1.3.1] - 2017-08-02

### Changed
- don't cancel loans offers for unsuported currencies

### Fixed
- active loan fees don't update ([#112](https://github.com/dutu/poloLender/issues/112))
- browser needs refresh to login after after authorization

## [1.3.0] - 2017-07-31

### Changed
- loan offer duration fixed to 60 days for loan offers with rate > 2%

## [1.2.1] - 2017-07-26

### Fixed
- floating-point issue causing loan offer cancelling ([#106](https://github.com/dutu/poloLender/issues/106))

### Changed
- increase performance (buffer size) when scrolling up large logtrail

## [1.2.0] - 2017-07-26

### Added
- Web UI tab for Logtrail
- log console error when telegram userId and token are invalid

### Fixed
- Web UI performance improvements and minor fixes

## [1.1.0] - 2017-07-18

### Added
- Web UI requires authentication
- http port can be set in `config.json` file (setting not available in web GUI)

### Changed
- Currency lending offer is posted at `Min lending rate` when the value is bigger than lending-advisor rate ([#106](https://github.com/dutu/poloLender/issues/106))

## [1.0.0] - 2017-07-12

### Added
- UI tab for Settings
- timestamp for console log output
- display the minimum offer amount in the "status" tab

### Changed
- Configuration is only done through the UI (Settings tab)

## [0.11.0] - 2017-06-26

### Added
- UI for Performance Reports
- UI for Live Reports
- UI for History Reports
- Note on how to rename `.env-template` file to `.env` in Windows

### Changed
- Report now show: profit %, daily war (weighted average rate), ewar (effective war) and APY (annual percentage yield)

### Fixed
- Wrong display of `POLOLENDER_TELEGRAM_REPORTINTERVAL` at startup
- Report show wrong of start balance for currencies except BTC

## [0.10.0] - 2017-06-26

### Added
- Reports show the annual rate with compound interest (paCI) for each currency
- Reports show TOTAL USD worth for each currency
- Reporting interval (minutes) for Telegram reports ce be configured with env variable POLOLENDER_TELEGRAM_REPORTINTERVAL
- Support for Heroku worker dyno
- Env variable POLOLENDER_ADVISOR_TOKEN is added, but not used at the moment. Future use could be to authenticate towards the poloLender advisor server

### Changed
- report color (cyan)   

## [0.9.0] - 2017-06-19

### Added
- Reports can be sent on Telegram   

### Changed
- Reports are logged as 'report' level   
- Reports are colored differently (blue)   

## [0.8.3] - 2017-06-15

### Fixed
- Minimum amount for each currency
- API indicator shows misleading icon
- Error message for connection errors to poloLending-Advisor server
- Pause API activity when IP is throttled  

## [0.8.2] - 2017-05-18

### Changed
- Update socket timeout to 60 seconds to minimize error 429 issued by Cloudflare

## [0.8.1] - 2017-05-15

### Changed
- Stop API activity for 1 minute when Poloniex returns "error 429: Too Many Requests"

## [0.8.0] - 2017-05-11

### Changed
- console log displays the times in the timezone specified in POLOLENDER_STARTTIME env variable

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
