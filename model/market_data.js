async function getTickerMarketPrice(tickerName) {
  return getYFQuote(tickerName);
}

async function getYFQuote(tickerName) {
  try {
    // Dynamic import ensures it’s server-only and not bundled client-side
    const yahooFinance = (await import("yahoo-finance2")).default;

    // `quote` is enough for current price; it’s HTTPS (ok for SSL-required prod)
    const q = await yahooFinance.quote(tickerName);

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
    console.error("SSR yfinance error:", e?.message || e);
  }
}

async function getTickerFundamentals(tickerName) {
  return await getYFQuoteSummary(tickerName);
}
async function getYFQuoteSummary(tickerName) {
  try {
    const yahooFinance = (await import("yahoo-finance2")).default;
    const qs = await yahooFinance.quoteSummary(tickerName, {
      modules: [
        "summaryDetail",
        "defaultKeyStatistics",
        "financialData",
        "price",
      ],
    });

    const S = qs?.summaryDetail || {};
    const K = qs?.defaultKeyStatistics || {};
    const F = qs?.financialData || {};

    // Core building blocks
    const enterpriseValue = num(K?.enterpriseValue);
    const ebitda = num(F?.ebitda);
    const totalRevenueTTM = num(F?.totalRevenue);
    const operatingMargin = num(F?.operatingMargins);
    const grossMargin = num(F?.grossMargins);
    const ebitdaMargin = num(F?.ebitdaMargins);
    const netMargin = num(F?.profitMargins) ?? num(K?.profitMargins);
    const roe = num(F?.returnOnEquity);
    const roa = num(F?.returnOnAssets);
    const currentRatio = num(F?.currentRatio);
    const totalDebt = num(F?.totalDebt);
    const totalCash = num(F?.totalCash);
    const bookValuePerShare = num(K?.bookValue);
    const sharesOutstanding = num(K?.sharesOutstanding);
    const trailingEps = num(K?.trailingEps);
    const pe = num(S?.trailingPE);
    const priceToBook = num(K?.priceToBook);
    const psTTM = num(S?.priceToSalesTrailing12Months);
    const enterpriseToRevenue = num(K?.enterpriseToRevenue);

    // Derived
    const netDebt = (totalDebt ?? 0) - (totalCash ?? 0); // can be negative (net cash)
    const equityBook =
      bookValuePerShare && sharesOutstanding
        ? bookValuePerShare * sharesOutstanding
        : null;
    const ebitTTM =
      operatingMargin && totalRevenueTTM
        ? operatingMargin * totalRevenueTTM
        : null;
    const evRevenue =
      enterpriseToRevenue ??
      (enterpriseValue && totalRevenueTTM
        ? enterpriseValue / totalRevenueTTM
        : null);

    // Ratios (guarded)
    const dy = num(S?.trailingAnnualDividendYield);
    // NOTE: The following usually require balance-sheet time series (assets/liabilities/current assets).
    // We leave them as null if not available from quoteSummary:
    return {
      valuation: [
        { key: "DY", label: "D.Y 12M", value: dy, fmt: "pct" },
        { key: "PE", label: "P/L", value: pe, fmt: "num" },
        { key: "PB", label: "P/VP", value: priceToBook, fmt: "num" },
        {
          key: "VPA",
          label: "VPA",
          value: bookValuePerShare,
          fmt: "money",
        },
        { key: "LPA", label: "LPA", value: trailingEps, fmt: "num" },
        { key: "PSR", label: "P/SR", value: psTTM, fmt: "num" },
      ],
      debt: [
        {
          key: "NetDebtEquity",
          label: "Dív. líquida/PL",
          value: equityBook && equityBook !== 0 ? netDebt / equityBook : null,
          fmt: "num",
        },
        {
          key: "NetDebtEbitda",
          label: "Dív. líquida/EBITDA",
          value: ebitda && ebitda !== 0 ? netDebt / ebitda : null,
          fmt: "num",
        },
        {
          key: "NetDebtEbit",
          label: "Dív. líquida/EBIT",
          value: ebitTTM && ebitTTM !== 0 ? netDebt / ebitTTM : null,
          fmt: "num",
        },
        {
          key: "EVREV",
          label: "EV/Receita",
          value: evRevenue,
          fmt: "num",
        },
        {
          key: "CurrentRatio",
          label: "Liq. corrente",
          value: currentRatio,
          fmt: "num",
        },
      ],
      efficiency: [
        {
          key: "GrossMargin",
          label: "M. Bruta",
          value: grossMargin,
          fmt: "pct",
        },
        {
          key: "EbitdaMargin",
          label: "M. EBITDA",
          value: ebitdaMargin,
          fmt: "pct",
        },
        {
          key: "EbitMargin",
          label: "M. EBIT",
          value: operatingMargin,
          fmt: "pct",
        },
        { key: "NetMargin", label: "M. Líquida", value: netMargin, fmt: "pct" },
      ],
      profitability: [
        { key: "ROE", label: "ROE", value: roe, fmt: "pct" },
        { key: "ROA", label: "ROA", value: roa, fmt: "pct" },
      ],
    };
  } catch (e) {
    console.error("SSR yfinance fundamentals error:", e?.message || e);
  }
}

async function getAnualizedSelicRate() {
  // One Day Delay becuse
  // Reason: API does not specify the exact time of the day this gets updated
  function getPrevBusinessDay() {
    // local time zone
    const today = new Date();
    const dow = today.getDay(); // Sun = 0, Mon = 1

    // Set offset to go back  to reach Friday if Sunday or monday;
    const offset = dow === 0 ? 2 : dow === 1 ? 3 : 1;

    const d = new Date(today);
    d.setDate(d.getDate() - offset); // handles month/year rollovers

    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  const yesterday = getPrevBusinessDay();
  const bcb_api_url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.1178/dados?formato=json&dataInicial=${yesterday}&dataFinal=${yesterday}`;
  console.log(bcb_api_url);

  const res = await fetch(bcb_api_url);
  if (!res.ok) {
    return { error: `HTTP ${res.status}` };
  }
  try {
    const selic_data = await res.json();
    // BCB API returns "Taxa Selic", but we want to show to the user the
    // publicly known rate which is actually the "Meta Selic" which is always
    // <Taxa Selic> + 0.1
    // See: https://www.bcb.gov.br/controleinflacao/historicotaxasjuros
    const selic_rate = num(selic_data[0].valor) + 0.1;
    return selic_rate;
  } catch (e) {
    //exception handling here
    console.error(e);
  }
}

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

const market_data = {
  getTickerMarketPrice,
  getTickerFundamentals,
  getAnualizedSelicRate,
};

export default market_data;
