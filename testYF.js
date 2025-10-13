import YahooFinance from "yahoo-finance2";

const results = await YahooFinance.fundamentalsTimeSeries("WEGE3.SA", {
  type: "trailing",
  module: "all",
});

console.log(results);
