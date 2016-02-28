# Poloniex lending bot

**PoloLending** is an automated engine for lending funds on Poloniex exchange.
The lending rate is received from **PoloLending-Advisor**.

**PoloLending-Advisor** uses advanced statistical calculation to advise on the best lending rate.

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

    # PoloLending-Advisor server details
    POLOLENDER_ADVISOR=safe-hollows.crypto.zone
    
    # API key for your Poloniex account
    POLOLENDER_APIKEY={"key":"V********************************t","secret":"T************************************u"}
    
    # Maximum amounts in your lending account that should be lended 
    POLOLENDER_TRADEMAX={"BTC":"4", "ETH":"100"}

    # Reserve amounts in your lending account (do not lend) 
    POLOLENDER_RESERVE={"BTC":"0.5", "ETH":"10"}
    
    # Send back to PoloLending-Advisor information on loan holding time. It is highly recommended to keep this option on as it greatly improves best lending rate calculation  
    POLOLENDER_LOANHOLDINGTIME=true
