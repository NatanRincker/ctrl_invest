import YahooFinance from "yahoo-finance2";

async function getYFQuote(tickerName) {
  try {
    // Dynamic import ensures it’s server-only and not bundled client-side
    //const yahooFinance = await require("yahoo-finance2").default;
    const yf = new YahooFinance();

    // `quote` is enough for current price; it’s HTTPS (ok for SSL-required prod)
    const q = await yf.quote(tickerName);

    // Pick the best available price field
    const candidates = [
      q?.regularMarketPrice,
      q?.postMarketPrice,
      q?.preMarketPrice,
      q?.ask,
      q?.bid,
    ];
    const firstNumeric = candidates.find((v) => Number.isFinite(Number(v)));
    if (Number.isFinite(Number(firstNumeric))) {
      return Number(firstNumeric);
    }
  } catch (e) {
    console.error("SSR yahoo-finance2 error:", e?.message || e);
  }
}

console.log(await getYFQuote("AAPL"));
