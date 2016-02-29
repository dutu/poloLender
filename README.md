# Poloniex lending bot

**PoloLender** is an automated engine for lending funds on Poloniex exchange.
The lending rate is received from **PoloLending-Advisor** server. **PoloLending-Advisor** uses advanced statistical calculation to advise on the best lending rate in order to maximize profits.

> Note: **PoloLender** only works in conjunction with **PoloLending-Advisor**, as it need to receive information about the best lending rate.


## Running Locally


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
    
5. Start the app locally



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
    $ heroku ps:scale web=0
    ```
    
6. Provision the [papertrail](https://devcenter.heroku.com/articles/papertrail) logging add-on
    ```
    $ heroku addons:create papertrail
    ```
    
    Note: To help with abuse prevention, provisioning an add-on requires account verification. If your account has not been verified, you will be directed to visit the verification site.


7. Visit the papertrail console to see the log messages. 
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
    $ heroku config:set POLOLENDER_REPORTINTERVAL=3
    ```
    
9. Start the application
    ```
    heroku ps:scale web=1
    ```

10. [Upgrade your application to Hobby](https://dashboard.heroku.com/# "upgrade to Hobby")
    

## Configuring the PoloLending

Bot configuration is done by setting environment variables or by specifying these in `.env` file.


    # API key for your Poloniex account
    POLOLENDER_APIKEY={"key":"V********************************t","secret":"T************************************u"}
    
    # Start UTC time - this is used to calculate and display total profitability
    POLOLENDER_STARTTIME=2016-02-28T12:27:09+00:00
    
    # Start balance - this is used to calculate and display total profitability
    POLOLENDER_STARTBALANCE={"BTC":"10", "ETH":"1100"}
    
    # Maximum amounts in your lending account that should be lended (default is all available amounts in lending account) 
    POLOLENDER_LENDMAX={"BTC":"4", "ETH":"100"}

    #Report interval in minutes (default is 60 minutes)
    POLOLENDER_REPORTINTERVAL=3
        
    # Send back to PoloLending-Advisor information on loan holding time. It is highly recommended to keep this option on as it greatly improves best lending rate calculation  
    POLOLENDER_LOANHOLDINGTIME=true
