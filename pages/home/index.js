// pages/home.js
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

  // Fetch asset positions
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch("/api/v1/asset_positions", {
          credentials: "include",
        });
        const data = await r.json();
        if (!r.ok) {
          if (r.status === 404 && active) {
            setPositions([]);
          } else {
            throw new Error(`HTTP ${r.status}`);
          }
        }
        if (active) setPositions(data || []);
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

  // Derived totals
  const totalAmount = useMemo(
    () => positions.reduce((acc, p) => acc + (p.total_value ?? 0), 0),
    [positions],
  );

  return (
    <AppShell
      username={user?.username ?? user?.name}
      userLoading={userLoading}
      userError={userErr}
    >
      {/* Top row: total + add */}
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-gray-400">
            Resumo do Portfólio
          </div>
          <div className="text-2xl font-semibold">
            {loading
              ? "—"
              : formatCurrency(totalAmount, guessCurrency(positions))}
          </div>
        </div>

        <button
          onClick={() => router.push("/asset/new")}
          className="rounded-lg bg-emerald-800 hover:bg-emerald-700 px-4 py-2 text-sm font-medium"
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
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() =>
                      router.push(
                        `/position_details?assetId=${encodeURIComponent(p.asset_id || p.id)}`,
                      )
                    }
                    className="cursor-pointer hover:bg-gray-800/60"
                  >
                    <Td>{p.asset_name}</Td>
                    <Td className="text-gray-400">{p.asset_code}</Td>
                    <Td className="text-right">{formatQuantity(p.quantity)}</Td>
                    <Td className="text-right">
                      {formatCurrency(calcCurrentVal(), p.currency || "BRL")}
                    </Td>
                    <Td className="text-right">
                      {formatCurrency(p.total_cost, p.currency || "BRL")}
                    </Td>
                    <Td className="text-right">
                      {formatPct(calcReturnRate())}
                    </Td>
                  </tr>
                ))}
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
function formatCurrency(n, currency = "BRL") {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(n);
  } catch {
    return new Intl.NumberFormat("pt-BR").format(n);
  }
}
function formatPct(x) {
  if (typeof x !== "number" || !Number.isFinite(x)) return "—";
  return `${(x * 100).toFixed(2)}%`;
}
function formatQuantity(q) {
  if (typeof q !== "number" || !Number.isFinite(q)) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 8 }).format(q);
}
function guessCurrency(rows) {
  return rows?.[0]?.currency || "BRL";
}
function calcReturnRate(currentValue, originalValue) {
  const curValNum = toNumber(currentValue);
  const originalValNum = toNumber(originalValue);
  return (curValNum - originalValNum) / originalValNum;
}
function calcCurrentVal(asset_code) {
  return null;
}

const toNumber = (s) => (s === "" ? NaN : Number(s));
