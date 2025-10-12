import YahooFinance from "yahoo-finance2";

const results = await YahooFinance.quote("AAPL");

console.log(results);
