poloLender Pro - smart Poloniex lending bot
====================

**poloLender Pro** is an automated engine for lending funds on Poloniex exchange.
poloLender Pro uses advanced statistical calculation to maximize profits.

The application code is open source and shared on github at https://github.com/dutu/poloLender/

**Join poloLender discussion/support group on telegram: https://t.me/cryptozone**

### Contents
* [Features](#features)
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
* [FAQ](https://github.com/dutu/poloLender/blob/master/faq.md)
* [License](#license)


# Features

* **Simple**. Easy use. 
* **Best profitability** ensured by using statistical calculation.
* Funds are always lent at best return rates, no configurtation required, just **set-and-forget**.
* **Reports** can be sent to your phone **on Telegram** messenger.
* **Web interface** (under developement, new features being added).
* Can **run locally** on your PC **or in the cloud** (heroku).
* **Activelly supported**. **Join** poloLender discussion/support group **on telegram: [https://t.me/cryptozone](https://t.me/cryptozone)** or [raise an issue](https://github.com/dutu/poloLender/issues).   

# What's new

Configuration is now done through the web UI (Settings tab)

![](http://i.imgur.com/VSjGuor.jpg)

# Supported crypto-currencies

![](http://i.imgur.com/wj8Bf6o.jpg)

> Note: As of July 25, support for lending XMR, XRP, ETH and CLAM is temporarly suspended. This is due low lending rates for these particular currencies and also the need of resources to keep lending support active (funds and computing power). If you'd like to see lending support restored, please contact me on [telegram support group](https://t.me/cryptozone) or [raise an issue on Github](https://github.com/dutu/poloLender/issues).     
 

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

5. Start the app locally:

    ```
    npm start
    ```

6. Open the poloLender Pro app in your browser:

    Open your internet browser and type in the URL [http://localhost:5000](http://localhost:5000)


7. Enter authentication token when requested 
	> Note: The authentication tokens are generated by the poloLender app and displayed in the console log when the app starts-up
	

8. Got to 'Settings' tab to set your poloLender configuration


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

6. Provision the [papertrail](https://devcenter.heroku.com/articles/papertrail) and [mLab](https://elements.heroku.com/addons/mongolab) add-ons

    ```
    heroku addons:create papertrail
    heroku addons:create mongolab
    ```

    Note: The add-ons are free; however, to help with abuse prevention, Heroku requires account verification for provisioning an add-on . If your account has not been verified, you will be directed to visit the verification site.


7. Open the papertrail console to see the log messages.

    ```
    heroku addons:open papertrail
    ```
	> Note: Keep the papertrail console open to monitor progress


8. Start the application

    ```
    heroku ps:scale web=1
    ```

9. Open the poloLenderPro in your browser

    ```
    heroku open
    ```


10. Enter authentication token when requested 
	> Note: The authentication tokens are generated by the poloLender app and displayed in the console log when the app starts-up

	
11. Got to 'Settings' tab to set your poloLender configuration


12. [Upgrade your application to Hobby](https://dashboard.heroku.com/# "upgrade to Hobby")

	> Note: By default the Heroku applications run on Free dyno. Free dyno sleeps after a period of activity. Please see https://devcenter.heroku.com/articles/free-dyno-hours#usage for details. It is highly recommended to upgrade the free Dyno to Hobby. Hobby dyno never sleeps. See: https://www.heroku.com/pricing


# Updating the application

Updating the application when poloLender code is updated on github

## Running locally

1. Stop the poloLender application with `CTRL+C`

2. Update the local clone from github

    ```
    cd poloLender
    git fetch --all
	git reset --hard origin/master
    ```

3. Update dependencies:

    ```
    npm update
    ```

4. Start the app locally:

    ```
    npm start
    ```

6. Visit poloLender app in your internet browser and verify the app settings

	> Note: The authentication tokens are generated by the poloLender app and displayed in the console log when the app starts-up



## Running on Heroku

1. Update the local clone from github
    
    ```
    cd poloLender
    git fetch --all
	git reset --hard origin/master
    ```

2. Verify that both `papertrail:choklad` and `mongolab:sandbox` are provisioned for your app 

    ```
    heroku addons
    ```

3. If addons above are not provisioned, provision the missing addons
    ```
    heroku addons:create mongolab
    ```
    and/or
    ```
    heroku addons:create papertrail
    ````
 
4. Open the papertrail console to see the log messages
    
    ```
    heroku addons:open papertrail
    ```

5. Deploy updated code to heroku
    
    ```
    git push heroku master
    ```

	The application will restart automatically with the newly deployed code

6. Visit poloLender app in your internet browser and verify the app settings 

	> Note: The authentication tokens are generated by the poloLender app and displayed in the console log when tha app starts-up


# FAQ

See [FAQ](https://github.com/dutu/poloLender/blob/master/faq.md)


# License #

[MIT](LICENSE)
