# Poloniex lending bot

**PoloLending** is an automated engine for lending funds on Poloniex exchange.
The lending rate is received from **PoloLending-Advisor** server. **PoloLending-Advisor** uses advanced statistical calculation to advise on the best lending rate in order to maximize profits.

> Note: **PoloLending** only works in conjunction with **PoloLending-Advisor**, as it need to receive information about the best lending rate.


## Running Locally

```
npm install
npm start
```

## Running on Heroku

```
heroku create
git push heroku master
heroku open
```

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
