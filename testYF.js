import YahooFinance from "yahoo-finance2";

async function getGlobalMacroNews(count = 10, lang = "en-US", region = "US") {
  // Broad macro queries; merge & de-dupe by UUID
  const queries = ["global economy", "world economy", "macro outlook"];
  const all = await Promise.all(
    queries.map((q) =>
      YahooFinance.search(q, {
        quotesCount: 0,
        newsCount: count,
        lang,
        region,
      }),
    ),
  );

  const seen = new Set();
  const merged = [];
  for (const r of all) {
    for (const a of r.news ?? []) {
      if (a.uuid && !seen.has(a.uuid)) {
        seen.add(a.uuid);
        merged.push(a);
      }
    }
  }

  // Sort by recency; take top N
  merged.sort(
    (a, b) => (b.providerPublishTime ?? 0) - (a.providerPublishTime ?? 0),
  );
  return merged.slice(0, count).map((a) => ({
    id: a.uuid,
    title: a.title,
    url: a.link,
    publisher: a.publisher,
    publishedAt: new Date((a.providerPublishTime ?? 0) * 1000).toISOString(),
    tickers: a.relatedTickers ?? [],
  }));
}
const results = await getGlobalMacroNews();

console.log(results);
