poloLender Pro - smart Poloniex lending bot
====================

**poloLender Pro** is an automated engine for lending funds on Poloniex exchange.
poloLender Pro uses advanced statistical calculation in order to maximize profits.

The application code is shared on github at https://github.com/dutu/poloLender/

### Contents
* [What's new](#whats-mew)
* [Supported crypto-currencies](#supported-crypto-currencies)
* [How it works](#how-it-works)
	* Why using statistical calculation is more efficient
* [Setting up the application](#setting-up-the-application)
    * Running locally
    * Running on Heroku
* [Updating the application](#updating-the-application)
    * Running locally
    * Running on Heroku
* [poloLender Pro configuration](#ploLender-pro-configuration)
* [FAQ](#faq)
* [License](#license)


# What's new

A Web interface has been implemented (starting with v0.7.0).

Preview:
![](http://storage2.static.itmages.com/i/17/0406/h_1491488764_5621703_28a89befdf.png)


# Supported crypto-currencies

![](http://i.imgur.com/n2NfChC.jpg)

# How it works

poloLender Pro is:

- an **open source** application written in JavaScript
- runs on [node.js](http://nodejs.org/)
- can either run locally on your computer or can be hosted on a cloud platform (e.g. [Heroku](http://www.heroku.com "Heroku")).

poloLender Pro is an automatic bot which lends funds on Poloniex exchange.

The lending rate is calculated using  statistical calculation in order to maximize profits.

poloLender Pro does not calculate the lending rate itself, instead the poloLender Pro receives the lending rate from **poloLending-Advisor** server.
**poloLending-Advisor** is an on-line server hosed at [http://safe-hollows.crypto.zone](http://safe-hollows.crypto.zone "http://safe-hollows.crypto.zone").

In order to calculate optimal lend offer rate, the server continuously monitors the lend-book (active offers) and also calculates the average loan holding time.
Based on this data and using statistical calculation **poloLending-Advisor** server can inform poloLender Pro clients of the rate with best profit returns.

By using historical information and statistical calculation poloLender Pro is able to give better return rates, as comparing with placing offers only looking at a snapshot of the lend book.

## Why using statistical calculation is more efficient

As it can be seen in the screen-shot below, poloLender Pro, manages to place offers with good rates

![](http://i.imgur.com/DgijTpS.jpg)

### Other bots

Other existing bots are placing loan offers by only looking at a snapshot of the lend-book (active offers available at one point in time).
To find out why snapshot of the lend-book does not give information on best return rate, I have written a bot that places small lend offers at the top of the lend-book every minutes.

As you can see in the screen-shot below, often **the lend book rates vary widely**.
For this reason, figuring out the rate that gives best result is not obvious.

In addition, placing offers "randomly" through the lend-book, expecting a spike is not most efficient.

![](http://i.imgur.com/piaw2hJ.jpg)


----------


# Setting up the application

Running on Heroku is highly recommended to ensure maximum up-time.


## Running locally

1. [Download and install node.js](http://nodejs.org/)

2. [Download and install the latest version of Git](http://git-scm.com/downloads "Download and install the latest version of Git")

3. Clone `poloLender` application source code from github:

    ```
    git clone https://github.com/dutu/poloLender.git
    cd poloLender
    ```
4. Install the dependencies, preparing your system for running the app locally:

    ```
    npm install
    ```

5. Define config vars required for configuring poloLender:
    Rename the file `.env-template` to `.env`, then update the variables in `.env` file with your own values

5. Start the app locally:

    ```
    node server.js
    ```

## Running on Heroku


1. [Create a Heroku account]([https://id.heroku.com/signup/login] "Create a Heroku account") if you don't have one already

2. [Download and install the Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli "Download and install the Heroku CLI").
Once installed, you'll have access to the heroku command from your command line.

3. Log into Heroku:

    ```
    heroku login
    ```

4. Clone `poloLender` application source code from github:

    ```
    git clone https://github.com/dutu/poloLender.git
    cd poloLender
    ```
5. Create an app on Heroku and deploy the code

    ```
    heroku create
    git push heroku master
    heroku ps:scale web=0
    ```

6. Provision the [papertrail](https://devcenter.heroku.com/articles/papertrail) logging add-on
    ```
    heroku addons:create papertrail
    ```

    Note: To help with abuse prevention, Heroku requires account verification for provisioning an add-on . If your account has not been verified, you will be directed to visit the verification site.


7. Open the papertrail console to see the log messages.
    ```
    heroku addons:open papertrail
    ```
> Note: Keep the papertrail console open to monitor progress

8. Define config vars required for configuring poloLender (replace the values below with your own)

:

    $ heroku config:set POLOLENDER_APIKEY={\"key\":\"V**********************t\",\"secret\":\"T*******************************u\"}
    $ heroku config:set POLOLENDER_STARTTIME=2016-02-28T12:27:09+01:00
    $ heroku config:set POLOLENDER_STARTBALANCE={\"BTC\":\"10\", \"ETH\":\"1100\", \"XMR\":\"1000\", \"XRP\":\"80000\", \"DASH\":\"1000\"}
    $ heroku config:set POLOLENDER_LENDMAX={\"BTC\":\"4\", \"ETH\":\"100\", \"XMR\":\"2000\", \"XRP\":\"30000\", \"DASH\":\"100000\"}
    $ heroku config:set POLOLENDER_MINRATE={\"BTC\":\"0\", \"ETH\":\"0\", \"XMR\":\"0\", \"XRP\":\"0\", \"DASH\":\"0\"}
    $ heroku config:set POLOLENDER_REPORTINTERVAL=30

Note: console log times will be displayed in the same timezone as POLOLENDER_STARTTIME

9. Start the application
    ```
    heroku ps:scale web=1
    ```

10. Visit the app in our browser
    ```
    heroku open
    ```

11. [Upgrade your application to Hobby](https://dashboard.heroku.com/# "upgrade to Hobby")
> **Note**: By default the Heroku applications run on Free dyno. Free dyno sleeps after a period of activity. Please see https://devcenter.heroku.com/articles/free-dyno-hours#usage for details. It is highly recommended to upgrade the free Dyno to Hobby. Hobby dyno never sleeps. See: https://www.heroku.com/pricing


# Updating the application

Updating the application when poloLender code is updated on github

## Running locally

1. Stop the poloLender application with `CTRL+C`

2. Update the local clone from github
    ```
    cd poloLender
    git pull origin master
    ```

3. Update dependencies:

    ```
    npm update
    ```

4. Start the app locally:

    ```
    node server.js
    ```

> **Note**: If you are requested to update node.js version, please do so by downloading and installing the applicable version. Go to [http://nodejs.org/node.js](http://nodejs.org/).


## Running on Heroku

1. Update the local clone from github
    ```
    cd poloLender
    git pull origin master
    ```

2. Open the papertrail console to see the log messages
    ```
    heroku addons:open papertrail
    ```

3. Deploy updated code to heroku
    ```
    git push heroku master
    ```
The application will restart automatically with the newly deployed code

# poloLender Pro configuration

Bot configuration is done by setting environment variables or by specifying these in `.env` file.


    # API key for your Poloniex account
    POLOLENDER_APIKEY={"key":"V**********************t","secret":"T*******************************u"}

    # Start time - this is used to calculate and display total profitability
    POLOLENDER_STARTTIME=2016-02-28T12:27:09+01:00

    # Start balance - this is used to calculate and display total profitability
    POLOLENDER_STARTBALANCE={"BTC":"10", "ETH":"1100", "XMR":"1000", "XRP":"80000", "DASH":"1000"}

    # Maximum amounts in your lending account that should be lended by the bot
    POLOLENDER_LENDMAX={"BTC":"4", "ETH":"100", "XMR":"2000", "XRP":"30000", "DASH":"100000"}

    # Minimum lending rate in percent.
    POLOLENDER_MINRATE={"BTC":"0", "ETH":"0", "XMR":"0", "XRP":"0", "DASH":"0"}

    # Report interval in minutes
    POLOLENDER_REPORTINTERVAL=30

Note: console log times will be displayed in the same timezone as POLOLENDER_STARTTIME

# FAQ

See [FAQ](https://github.com/dutu/pololender/faq.md)


# License #

[MIT](LICENSE)
