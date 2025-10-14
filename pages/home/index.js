// pages/home/index.js
import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../../infra/clientController";
import { useRouter } from "next/router";
import AppShell from "../../components/layout/AppShell";
import market_data from "model/market_data";
import dynamic from "next/dynamic";
const DonutChart = dynamic(() => import("../../components/charts/DonutChart"), {
  ssr: false,
});

export default function HomePage({ positionsSSR = [], assetTypesSSR = [] }) {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userErr, setUserErr] = useState("");

  const [positions] = useState(positionsSSR);
  const [loading] = useState(false);
  const [err] = useState("");

  // currencies: code -> {code,name,symbol}
  const [, setCurrencies] = useState([]);
  const [currencyMap, setCurrencyMap] = useState({}); // code -> symbol

  // Fetch username/profile
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setUserLoading(true);
        const r = await fetch("/api/v1/user", { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (active) setUser(data);
      } catch (e) {
        if (active) setUserErr("Failed to load user.");
      } finally {
        if (active) setUserLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Fetch currencies (build code -> symbol map)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch("/api/v1/currencies", { credentials: "include" });
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Object.values(data || {});
        const cleaned = arr
          .filter(Boolean)
          .map(({ code, name, symbol }) => ({ code, name, symbol }));
        if (active) {
          setCurrencies(cleaned);
          setCurrencyMap(
            Object.fromEntries(cleaned.map((c) => [c.code, c.symbol])),
          );
        }
      } catch {
        if (active) {
          setCurrencies([]);
          setCurrencyMap({});
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Totals per currency (since portfolio can hold multiple currencies)
  const totalsByCurrency = useMemo(() => {
    const m = {};
    for (const p of positions) {
      const code = p.currency_code;
      const p_mkt_val = toNumber(p.total_market_value);
      const roi = toNumber(p.yield); //needs to be changed to p.roi in the future
      const rlzd_pnl = toNumber(p.realized_pnl);
      m[code] = (m[code] || 0) + p_mkt_val + roi + rlzd_pnl;
    }
    return m; // { 'BRL': 1234.56, 'USD': 789.01 }
  }, [positions]);

  // Map asset_type_code -> asset type name (from SSR)
  const assetTypeNameByCode = useMemo(() => {
    const arr = Array.isArray(assetTypesSSR) ? assetTypesSSR : [];
    return Object.fromEntries(arr.map((t) => [t.code, t.name]));
  }, [assetTypesSSR]);
  // Totals by Asset Type (for donut). We use market value + yield + realized_pnl
  // and display as PERCENTAGE to avoid cross-currency mixing on the chart.
  const totalsByAssetType = useMemo(() => {
    const m = {};
    for (const p of positions) {
      const k = p.asset_type_code || "OUTROS";
      const p_mkt_val = toNumber(p.total_market_value);
      const roi = toNumber(p.yield);
      const rlzd_pnl = toNumber(p.realized_pnl);
      m[k] = (m[k] || 0) + (p_mkt_val + roi + rlzd_pnl);
    }
    return m; // { "STOCK": 123, "ETF": 456, ... }
  }, [positions]);
  const donutData = useMemo(() => {
    const entries = Object.entries(totalsByAssetType)
      .map(([code, value]) => ({
        key: code,
        label: assetTypeNameByCode[code] || code,
        value: Number(value) || 0,
      }))
      .filter((x) => Number.isFinite(x.value) && x.value !== 0)
      .sort((a, b) => b.value - a.value);
    return entries;
  }, [totalsByAssetType, assetTypeNameByCode]);
  return (
    <AppShell
      username={user?.username ?? user?.name}
      userLoading={userLoading}
      userError={userErr}
    >
      {/* Dashboard: Totals by Currency (cards) + Donut by Asset Type */}
      <section className="mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Currency totals as squares */}
          <div className="lg:col-span-2">
            <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">
              Valor do Portfólio por Moeda
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {Object.keys(totalsByCurrency).length === 0 ? (
                <div className="text-sm text-gray-400">Sem valores</div>
              ) : (
                Object.entries(totalsByCurrency).map(([code, amount]) => (
                  <div
                    key={code}
                    className="rounded-xl bg-gray-900/70 border border-gray-800 p-4 flex flex-col items-center justify-center"
                  >
                    <div className="text-xs text-gray-400 mb-1">{code}</div>
                    <div className="text-2xl font-bold text-gray-100 text-center">
                      {formatCurrency(amount, code, currencyMap[code])}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Donut - share by Asset Type (percent) */}
          <div className="">
            <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">
              Distribuição por Tipo de Ativo
            </div>
            {donutData.length === 0 ? (
              <div className="text-sm text-gray-400">
                Sem dados para exibir.
              </div>
            ) : (
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                <DonutChart
                  data={donutData}
                  palette={[
                    "#34d399",
                    "#60a5fa",
                    "#fbbf24",
                    "#a78bfa",
                    "#f87171",
                    "#22d3ee",
                    "#e879f9",
                    "#6366f1",
                    "#14b8a6",
                    "#f59e0b",
                  ]}
                />
              </div>
            )}
          </div>
        </div>
      </section>
      {/* Top row: per-currency totals + add */}
      <div className="flex items-end justify-between gap-4 mb-4">
        <button
          onClick={() => router.push("/asset/new")}
          className="rounded-lg bg-emerald-800 hover:bg-emerald-700 px-4 py-2 text-sm font-medium whitespace-nowrap"
        >
          Novo Ativo
        </button>
      </div>

      {/* Positions table */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-sm font-medium">Minhas Posições</h2>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-400">Carregando…</div>
        ) : err ? (
          <div className="p-6 text-sm text-red-400">{err}</div>
        ) : positions.length === 0 ? (
          <div className="p-6 text-sm text-gray-400">
            Não existem Posições. Considere Adicionar um Novo Ativo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-900/80 text-gray-300">
                  <Th>Nome do Ativo</Th>
                  <Th>Cód.</Th>
                  <Th>Tipo</Th>
                  <Th className="text-right">Quantidade</Th>
                  <Th className="text-right">Valor Investido</Th>
                  <Th className="text-right">Valor atual</Th>
                  <Th className="text-right">Valorização</Th>
                  <Th className="text-right">Lucro Líquido</Th>
                  <Th className="text-right">Lucro de Venda</Th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  // API returns: user_id, asset_id, name, code, currency_code, quantity, total_cost, valuation
                  const pct = calcCurrentVal(
                    p.total_cost,
                    p.total_market_value,
                  );
                  const symbol = currencyMap[p.currency_code];

                  return (
                    <tr
                      key={p.asset_id}
                      onClick={() =>
                        router.push(
                          `/position_details/${encodeURIComponent(p.id)}`,
                        )
                      }
                      className="cursor-pointer hover:bg-gray-800/60"
                    >
                      <Td>{p.name}</Td>
                      <Td className="text-gray-400">{p.code}</Td>
                      <Td className="text-gray-300">
                        {assetTypeNameByCode[p.asset_type_code] || "—"}
                      </Td>
                      <Td className="text-right">
                        {formatQuantity(p.quantity)}
                      </Td>
                      <Td className="text-right">
                        {formatCurrency(p.total_cost, p.currency_code, symbol)}
                      </Td>
                      <Td className="text-right">
                        {formatCurrency(
                          p.total_market_value,
                          p.currency_code,
                          symbol,
                        )}
                      </Td>
                      <Td className={`text-right ${getPriceCollor(pct)}`}>
                        {formatPct(pct)}
                      </Td>
                      <Td
                        className={`text-right ${getPriceCollor(toNumber(p.yield))}`}
                      >
                        {formatCurrency(p.yield, p.currency_code, symbol)}
                      </Td>
                      <Td
                        className={`text-right ${getPriceCollor(toNumber(p.realized_pnl))}`}
                      >
                        {formatCurrency(
                          p.realized_pnl,
                          p.currency_code,
                          symbol,
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export async function getServerSideProps(ctx) {
  const { req, res } = ctx;
  const origin =
    process.env.NODE_ENV === "production"
      ? "https://" +
          (req.headers["x-forwarded-host"] || "").split(",")[0].trim() ||
        req.headers.host
      : "http://localhost:3000";

  const cookie = req.headers.cookie || "";

  // 1) Load the asset positions (needs user cookie)
  const positionsRes = await apiGet(
    `${origin}/api/v1/asset_positions/summary`,
    cookie,
  );
  if (positionsRes.unauthorized) {
    return {
      redirect: { destination: "/login", permanent: false },
    };
  }
  let positions = [];
  if (!positionsRes.error && positionsRes.data) {
    positions = normalizeArray(positionsRes.data);
  }

  // 2) For yfinance-compatible positions, fetch live price and update total_market_value ----
  try {
    if (positions.length > 0) {
      const yfEligible = positions.filter(
        (p) =>
          // summary may already include this flag; if not present, skip gracefully
          p?.yfinance_compatible &&
          p?.code &&
          Number.isFinite(Number(p?.quantity)),
      );

      // Fetch quotes per unique ticker.
      // eslint-disable-next-line no-undef
      const uniqueTickers = [...new Set(yfEligible.map((p) => p.code))];
      const quoteByTicker = {};

      for (const symbol of uniqueTickers) {
        quoteByTicker[symbol] = await market_data.getTickerMarketPrice(symbol);
      }

      // Apply updated total_market_value where we have a quote
      positions = positions.map((p) => {
        const qty = Number(p?.quantity);
        const live = quoteByTicker[p?.code];
        if (
          p?.yfinance_compatible &&
          Number.isFinite(qty) &&
          Number.isFinite(live)
        ) {
          const updated = qty * live;
          return { ...p, total_market_value: updated };
        }
        return p; // keep internal API value
      });
    }
  } catch {
    // Any SSR yfinance failure: keep original values
  }
  // 3) Load the asset_types (needs user cookie)
  const assetTypesRes = await apiGet(`${origin}/api/v1/asset_types`, cookie);
  if (assetTypesRes.unauthorized) {
    return {
      redirect: { destination: "/login", permanent: false },
    };
  }
  let assetTypes = [];
  if (!assetTypesRes.error && assetTypesRes.data) {
    assetTypes = normalizeArray(assetTypesRes.data);
  }

  // User-specific + live data: avoid caching
  res.setHeader("Cache-Control", "private, no-store");

  return {
    props: {
      positionsSSR: positions,
      assetTypesSSR: assetTypes,
    },
  };
}

/* UI Bits */
function Th({ children, className = "" }) {
  return (
    <th
      className={`px-4 py-3 font-medium text-left border-b border-gray-800 ${className}`}
    >
      {children}
    </th>
  );
}
function Td({ children, className = "" }) {
  return (
    <td className={`px-4 py-3 border-b border-gray-800 ${className}`}>
      {children}
    </td>
  );
}

/* Formatters */
function formatCurrency(stringNumber, currencyCode, symbol) {
  const n = toNumber(stringNumber);
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  // Prefer provided symbol (from /currencies); fallback to Intl currency
  if (symbol) {
    return `${symbol} ${new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)}`;
  }
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currencyCode,
    }).format(n);
  } catch {
    return new Intl.NumberFormat("pt-BR").format(n);
  }
}
function formatPct(x) {
  if (typeof x !== "number" || !Number.isFinite(x)) return "—";
  return `${(x * 100).toFixed(2)}%`;
}
function formatQuantity(stringNumber) {
  const q = toNumber(stringNumber);
  if (typeof q !== "number" || !Number.isFinite(q)) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 8 }).format(q);
}

/**
 * Gain/Loss percentage (as a ratio):
 * invested_amount = total_cost
 * current_val = valuation
 */
function calcCurrentVal(invested_amount, current_val) {
  const invested = toNumber(invested_amount);
  const current = toNumber(current_val);
  if (!Number.isFinite(invested) || invested <= 0 || !Number.isFinite(current))
    return 0;
  return (current - invested) / invested;
}

function getPriceCollor(p) {
  const cssClass =
    p > 0 ? "text-emerald-400" : p < 0 ? "text-red-400" : "text-gray-300";
  return cssClass;
}

function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (data && typeof data === "object") return Object.values(data);
  return [];
}

const toNumber = (s) => (s === "" ? NaN : Number(s));
