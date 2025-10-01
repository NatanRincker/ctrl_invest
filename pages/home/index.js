// pages/home/index.js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import AppShell from "../../components/layout/AppShell";

export default function HomePage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userErr, setUserErr] = useState("");

  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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

  // Fetch asset positions summary
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch("/api/v1/asset_positions/summary", {
          credentials: "include",
        });
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          if (r.status === 404 && active) {
            setPositions([]);
          } else {
            throw new Error(`HTTP ${r.status}`);
          }
        } else if (active) {
          const arr = Array.isArray(data) ? data : data?.data || [];
          setPositions(arr);
        }
      } catch (e) {
        if (active) setErr("Erro inexperado");
      } finally {
        if (active) setLoading(false);
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

  return (
    <AppShell
      username={user?.username ?? user?.name}
      userLoading={userLoading}
      userError={userErr}
    >
      {/* Top row: per-currency totals + add */}
      <div className="flex items-end justify-between gap-4 mb-4">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-gray-400">
            Valor do Portfólio
          </div>
          {loading ? (
            <div className="text-2xl font-semibold">—</div>
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.keys(totalsByCurrency).length === 0 ? (
                <span className="text-sm text-gray-400">Sem valores</span>
              ) : (
                Object.entries(totalsByCurrency).map(([code, amount]) => (
                  <span
                    key={code}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-900/70 border border-gray-800 px-3 py-1.5"
                  >
                    <span className="text-sm text-gray-400">
                      {currencyMap[code] || code}
                    </span>
                    <span className="text-base font-semibold">
                      {formatCurrency(amount, code, currencyMap[code])}
                    </span>
                  </span>
                ))
              )}
            </div>
          )}
        </div>

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
                  <Th className="text-right">Quantidade</Th>
                  <Th className="text-right">Valor atual</Th>
                  <Th className="text-right">Valor Investido</Th>
                  <Th className="text-right">Valorização %</Th>
                  <Th className="text-right">ROI %</Th>
                  <Th className="text-right">Preço/Lucro Realizado</Th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  // API returns: user_id, asset_id, name, code, currency_code, quantity, total_cost, valuation
                  const pct = calcCurrentVal(
                    p.total_cost,
                    p.total_market_value,
                  );
                  const pctClass =
                    pct > 0
                      ? "text-emerald-400"
                      : pct < 0
                        ? "text-red-400"
                        : "text-gray-300";
                  const symbol = currencyMap[p.currency_code];

                  const roi = calcRoiPct(p.yield, p.total_cost);
                  const roiClass =
                    roi > 0
                      ? "text-emerald-400"
                      : roi < 0
                        ? "text-red-400"
                        : "text-gray-300";

                  return (
                    <tr
                      key={p.asset_id}
                      onClick={() =>
                        router.push(
                          `/position_details?assetId=${encodeURIComponent(p.asset_id)}`,
                        )
                      }
                      className="cursor-pointer hover:bg-gray-800/60"
                    >
                      <Td>{p.name}</Td>
                      <Td className="text-gray-400">{p.code}</Td>
                      <Td className="text-right">
                        {formatQuantity(p.quantity)}
                      </Td>
                      <Td className="text-right">
                        {formatCurrency(
                          p.total_market_value,
                          p.currency_code,
                          symbol,
                        )}
                      </Td>
                      <Td className="text-right">
                        {formatCurrency(p.total_cost, p.currency_code, symbol)}
                      </Td>
                      <Td className={`text-right ${pctClass}`}>
                        {formatPct(pct)}
                      </Td>
                      <Td className={`text-right ${roiClass}`}>
                        {formatPct(roi)}
                      </Td>
                      <Td className="text-right">
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

/* Small table helpers */
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

function calcRoiPct(raw_roi, invested_amount) {
  const roi = toNumber(raw_roi);
  const investment = toNumber(invested_amount);
  if (!Number.isFinite(investment) || investment <= 0 || !Number.isFinite(roi))
    return 0;
  return roi / investment;
}

const toNumber = (s) => (s === "" ? NaN : Number(s));
