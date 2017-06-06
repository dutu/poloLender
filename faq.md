# FAQ

**Q1: Can you add support for lending additional crypto currency**

Yes, please [raise an issue on github](https://github.com/dutu/pololender/issues)

---

**Q2: Where can I donate some coins to support the project?**

If this bot helped you in any way, you can always leave me a tip at (BTC) **1DTNRjLcBKug24YbXKaYm7JQMWMjZszYNa**  

---

**Q3: How is the loan offer rate calculated?**

The rate is calculated based on the history of the lending rates and the average loan holding time. Based on these parameters the rate with best return is calculated. 

The **average loan holding time** is a key parameter for determining the time the bot should wait with an offer at a higher rate, and the time when it should lower the rate (when statistically it's more profitable to lend at a lower rate).

*Taking the average loan holding time into calculation is one of the main characteristic of this lending algorithm and where its power and profitability are. This is also what it differentiates it from other lending bots.*

---

**Q4: The bot is not lowering offered rates for several hours. Why is this happening?**

As explained at **Q4** above, the algorithm for determining the rate with the best return takes into calculation the **average loan holding time**. Based on the value of the average holding time, the bot will wait shorter or longer before offering loans at lower rates.

During the periods when the average loan holding time is higher (e.g. +8hours) and it is more profitable to wait longer for lending at a higher rate.

On the contrary, when the average loan holding time is shorter (e.g. 1hour) and it would be more profitable to wait less at a high rate and place offers at a lower rate quicker. 

The optimal waiting time and the best return rate are mathematically calculated and at times it may look counterintuitive: 

Users have reported situations when they perceive the bot is lowering the rate to quick; at the same time situations when they perceive the bot is not lowering the rate quick enough.   

---

**Q5: The bot is offering loans at a low rate and after couple of hours the lending rates are higher. Why is this happening and why is the bot not waiting longer for higher rates?**

See Q3 and Q4 above.
