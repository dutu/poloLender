Poloniex lending bot
====================

**PoloLender** is an automated engine for lending funds on Poloniex exchange.
The lending rate is received from **PoloLending-Advisor** server. **PoloLending-Advisor** is an on-line server which uses advanced statistical calculation to advise on the best lending rate in order to maximize profits.

### Contents
* [Setting up the application](#setting-up-the-application)
    * Running on Heroku
    * Running locally
* [Updating the application](#updating-the-application)
    * Running on Heroku
    * Running locally
* [PoloLender configuration](#ploLender-configuration)



# Setting up the application

Running on Heroku is highly recommended to ensure maximum uptime. 

    
## Running on Heroku


1. [Create a Heroku account](https://signup.heroku.com/dc "Create a Heroku account") if you don't have one already

2. [Download and install the Heroku Toolbelt](https://toolbelt.heroku.com/ "Download and install the Heroku Toolbelt")
Once installed, you'll have access to the heroku command from your command shell.

3. Log into Heroku:

    ```
    $ heroku login
    ```
 
4. Clone `poloLender` application source code from github:

    ```
    $ git clone https://github.com/dutu/poloLender.git
    $ cd poloLender
    ```
5. Create an app on Heroku and deploy the code
    
    ```
    $ heroku create
    $ git push heroku master
    $ heroku ps:scale web=0 poloLender=0
    ```
    
6. Provision the [papertrail](https://devcenter.heroku.com/articles/papertrail) logging add-on
    ```
    $ heroku addons:create papertrail
    ```
    
    Note: To help with abuse prevention, provisioning an add-on requires account verification. If your account has not been verified, you will be directed to visit the verification site.


7. Open the papertrail console to see the log messages. 
    ```
    $ heroku addons:open papertrail
    ```
> Note: Keep the papertrail console open to monitor progress
    
8. Define config vars required for configuring poloLender (replace the values below with your own)
    ```
    $ heroku config:set POLOLENDER_APIKEY='{"key":"V********t","secret":"T***u"}'
    $ heroku config:set POLOLENDER_STARTTIME='2016-02-28T12:27:09+00:00'
    $ heroku config:set POLOLENDER_STARTBALANCE='{"BTC":"10", "ETH":"1100"}'
    $ heroku config:set POLOLENDER_LENDMAX='{"BTC":"4", "ETH":"100"}'
    $ heroku config:set POLOLENDER_REPORTINTERVAL=60
    ```
    
9. Start the application
    ```
    heroku ps:scale poloLender=1
    ```

10. [Upgrade your application to Hobby](https://dashboard.heroku.com/# "upgrade to Hobby")
> **Note**: By default the Heroku application runs on Free dyno. Free dyno sleeps for 6 hours in 24 hours period. It is highly recommended to upgrade the free Dyno to Hobby. Hobby dyno never sleeps. See: https://www.heroku.com/pricing 


## Running locally

1. [Download and install node.js](http://nodejs.org/)

2. [Download and install the latest version of Git](http://git-scm.com/downloads "Download and install the latest version of Git")

3. Clone `poloLender` application source code from github:

    ```
    $ git clone https://github.com/dutu/poloLender.git
    $ cd poloLender
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
    
# Updating the application

## Running on Heroku

1. Update the local clone from github
    ```
    $ cd poloLender
    $ git pull origin master
    ```

2. Open the papertrail console to see the log messages 
    ```
    $ heroku addons:open papertrail
    ```

3. Deploy updated code to heroku 
    ```
    $ git push heroku master
    ```
The application will restart automatically with the newly deployed code 


## Running locally

1. Stop the PoloLender application with `CTRL+C` 

3. Update the local clone from github
    ```
    $ cd poloLender
    $ git pull origin master
    ```

4. Update dependencies:

    ```
    npm update
    ```

5. Start the app locally:

    ```
    node server.js
    ```

# PoloLender Configuration

Bot configuration is done by setting environment variables or by specifying these in `.env` file.


    # API key for your Poloniex account
    POLOLENDER_APIKEY={"key":"V**********************t","secret":"T*******************************u"}
    
    # Start UTC time - this is used to calculate and display total profitability
    POLOLENDER_STARTTIME=2016-02-28T12:27:09+00:00
    
    # Start balance - this is used to calculate and display total profitability
    POLOLENDER_STARTBALANCE={"BTC":"10", "ETH":"1100"}
    
    # Maximum amounts in your lending account that should be lended 
    POLOLENDER_LENDMAX={"BTC":"4", "ETH":"100"}

    #Report interval in minutes (default is 60 minutes)
    POLOLENDER_REPORTINTERVAL=3
     