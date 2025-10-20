// pages/position_details/[id].js
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import AppShell from "../../components/layout/AppShell";
import { apiGet } from "../../infra/clientController";
import market_data from "model/market_data";

export default function PositionDetailsPage({
  ssrMarket = null,
  ssrFundamentals = null, // { valuation:[], debt:[], efficiency:[], profitability:[] }
}) {
  const router = useRouter();
  const { id } = router.query; // public UUID for asset_position
  const isReady = router.isReady;
  const [pageRefreshFlag, setPageRefreshFlag] = useState(false);

  /* ---------------- User (topbar) ---------------- */
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setUserLoading(true);
        const r = await fetch("/api/v1/user", { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await safeJson(r);
        if (alive) setUser(data);
      } catch {
        if (alive) setUserError("Failed to load user.");
      } finally {
        if (alive) setUserLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ---------------- State for position, asset, currencies, types, txs ---------------- */
  const [position, setPosition] = useState(null);
  const [posLoading, setPosLoading] = useState(true);
  const [posError, setPosError] = useState("");

  const [asset, setAsset] = useState(null);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetError, setAssetError] = useState("");

  //const [currencies, setCurrencies] = useState([]); // [{code,name,symbol}]
  const [currencyMap, setCurrencyMap] = useState({}); // code -> symbol
  const [curLoading, setCurLoading] = useState(true);

  const [assetTypes, setAssetTypes] = useState([]); // [{code,name,description}]
  const [typesLoading, setTypesLoading] = useState(false);

  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);

  // yfinance refresh (SSR seeds initial market value; client may update later)
  const [refreshedMarket] = useState(
    Number.isFinite(Number(ssrMarket)) ? Number(ssrMarket) : null,
  );

  /* ---------------- Load currencies (once) ---------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setCurLoading(true);
        const r = await fetch("/api/v1/currencies", { credentials: "include" });
        const data = await safeJson(r);
        const arr = normalizeArray(data);
        const cleaned = arr.map(({ code, name, symbol }) => ({
          code,
          name,
          symbol,
        }));
        if (alive) {
          //setCurrencies(cleaned);
          setCurrencyMap(
            Object.fromEntries(cleaned.map((c) => [c.code, c.symbol])),
          );
        }
      } finally {
        if (alive) setCurLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ---------------- Load position by URL id ---------------- */
  useEffect(() => {
    if (!isReady || !id) return;
    let alive = true;
    (async () => {
      try {
        setPosLoading(true);
        const r = await fetch(
          `/api/v1/asset_positions/${encodeURIComponent(id)}`,
          {
            credentials: "include",
          },
        );
        if (r.status === 401) {
          router.replace("/login");
          return;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await safeJson(r); // expects {id,user_id,asset_id,quantity,total_cost,avg_cost,realized_pnl,yield,...}
        if (alive) {
          setPosition(data);
        }
      } catch (e) {
        if (alive) setPosError(e.message || "Erro ao carregar posição.");
      } finally {
        if (alive) setPosLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isReady, id, router, pageRefreshFlag]);

  /* ---------------- Load asset (after position), asset types (if needed), tx history ---------------- */
  useEffect(() => {
    if (!position?.asset_id) return;
    let alive = true;

    (async () => {
      // Asset
      try {
        setAssetLoading(true);
        const r = await fetch(
          `/api/v1/assets/${encodeURIComponent(position.asset_id)}`,
          {
            credentials: "include",
          },
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await safeJson(r);
        if (alive) setAsset(data);
      } catch (e) {
        if (alive) setAssetError(e.message || "Erro ao carregar ativo.");
      } finally {
        if (alive) setAssetLoading(false);
      }

      // Transactions
      try {
        setTxLoading(true);
        const r = await fetch(
          `/api/v1/transactions/asset_id/${encodeURIComponent(position.asset_id)}`,
          {
            credentials: "include",
          },
        );
        const data = await safeJson(r);
        const arr = normalizeArray(data);
        if (alive) setTransactions(arr);
      } finally {
        if (alive) setTxLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [position?.asset_id]);

  /* ---------------- If asset is yfinance-compatible, refresh its market value by code
  useEffect(() => {
    if (!asset?.yfinance_compatible || !asset?.code) {
      setRefreshedMarket(null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        // Spec: GET api/v1/code/${asset.code}
        const r = await fetch(
          `/api/v1/code/${encodeURIComponent(asset.code)}`,
          {
            credentials: "include",
          },
        );
        if (!r.ok) return; // silent fail, keep original market_value
        const payload = await safeJson(r);
        // try to find a numeric price
        const mv =
          pickNumber(payload?.market_value) ??
          pickNumber(payload?.marketValue) ??
          pickNumber(payload?.price) ??
          (Array.isArray(payload)
            ? pickNumber(payload[0]?.market_value ?? payload[0]?.price)
            : null);

        if (alive && Number.isFinite(mv)) setRefreshedMarket(Number(mv));
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, [asset?.yfinance_compatible, asset?.code]);
  ----------------*/

  /* ---------------- Load asset types if NOT yfinance (for dropdown) ---------------- */
  useEffect(() => {
    if (!asset || asset.yfinance_compatible) return;
    let alive = true;
    (async () => {
      try {
        setTypesLoading(true);
        const r = await fetch("/api/v1/asset_types", {
          credentials: "include",
        });
        const data = await safeJson(r);
        const arr = normalizeArray(data);
        if (alive)
          setAssetTypes(
            arr.map(({ code, name, description }) => ({
              code,
              name,
              description,
            })),
          );
      } finally {
        if (alive) setTypesLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [asset]);

  /* ---------------- Editable fields ---------------- */
  const yfinCompat = Boolean(asset?.yfinance_compatible);
  const [name, setName] = useState("");
  const [assetTypeCode, setAssetTypeCode] = useState("");
  const [desc, setDesc] = useState("");

  // NEW: editable market value input (for non-yfinance)
  const [unitMarketInput, setUnitMarketInput] = useState("");

  // Initialize editable fields when asset loads/refreshed changes
  useEffect(() => {
    if (!asset) return;
    setName(asset.name || "");
    setAssetTypeCode(asset.asset_type_code || "");
    setDesc(asset.description || "");
    // Only initialize input from asset when NOT yfinance
    if (!asset.yfinance_compatible) {
      const base = asset.market_value ?? "";
      setUnitMarketInput(
        base === null || base === undefined ? "" : String(base),
      );
    } else {
      setUnitMarketInput(""); // yfinance: field is not editable/shown as input
    }
  }, [asset]);

  const currentUnitMarket = useMemo(() => {
    if (typeof refreshedMarket === "number" && Number.isFinite(refreshedMarket))
      return refreshedMarket;
    return Number(asset?.market_value) || 0;
  }, [asset?.market_value, refreshedMarket]);

  // Use editable input when not yfinance, otherwise the computed current value
  const effectiveUnitMarket = !yfinCompat
    ? Number(unitMarketInput || 0)
    : currentUnitMarket;

  const totalMarketValue =
    (Number(position?.quantity) || 0) *
    (Number.isFinite(effectiveUnitMarket) ? effectiveUnitMarket : 0);

  // Dirty checks
  const priceDirty =
    !!asset &&
    !yfinCompat &&
    Number(unitMarketInput) !== Number(asset.market_value || 0);

  const dirty =
    (!!asset && !yfinCompat && name !== (asset.name || "")) ||
    (!!asset &&
      !yfinCompat &&
      assetTypeCode !== (asset.asset_type_code || "")) ||
    (!!asset && desc !== (asset.description || "")) ||
    priceDirty;

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [saveOk, setSaveOk] = useState("");

  async function handleSave() {
    if (!asset) return;
    setSaveErr("");
    setSaveOk("");
    try {
      setSaving(true);
      const body = { id: asset.id };
      if (!yfinCompat) {
        if (name !== asset.name) body.name = name;
        if (assetTypeCode !== asset.asset_type_code)
          body.asset_type_code = assetTypeCode;
        if (priceDirty) {
          const mv = Number(unitMarketInput);
          if (!Number.isFinite(mv)) throw new Error("Valor unitário inválido.");
          body.market_value = mv.toString();
        }
      }
      if (desc !== asset.description) body.description = desc;

      if (Object.keys(body).length <= 1) {
        setSaveOk("Nada para salvar.");
        return;
      }
      // Spec: PATCH /api/v1/assets  (body contains { id, ...fields })
      const r = await fetch(`/api/v1/assets`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await safeJson(r);
      if (!r.ok)
        throw new Error(data?.error || `Falha ao salvar (HTTP ${r.status})`);
      setSaveOk("Alterações salvas com sucesso.");

      // update local asset baseline (keeps UI in sync and clears dirty)
      setAsset((prev) =>
        prev
          ? {
              ...prev,
              ...("name" in body ? { name: body.name } : {}),
              ...("asset_type_code" in body
                ? { asset_type_code: body.asset_type_code }
                : {}),
              ...("description" in body
                ? { description: body.description }
                : {}),
              ...("market_value" in body
                ? { market_value: body.market_value }
                : {}),
            }
          : prev,
      );
    } catch (e) {
      setSaveErr(e.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------- New Transaction ---------------- */
  const [mode, setMode] = useState("BUY"); // BUY | SELL | INCOME | EXPENSE
  const [qty, setQty] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [occurredDate, setOccurredDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [txDesc, setTxDesc] = useState("");
  const [txSubmitting, setTxSubmitting] = useState(false);
  const [txErr, setTxErr] = useState("");

  const totalAmount = useMemo(() => {
    const q = Number(qty);
    const u = Number(unitPrice);
    if (!Number.isFinite(q) || !Number.isFinite(u)) return 0;
    return q * u;
  }, [qty, unitPrice]);

  async function submitTransaction() {
    try {
      if (!asset?.id) throw new Error("Ativo não carregado.");
      if (!qty || !unitPrice)
        throw new Error("Preencha quantidade e valor unitário.");
      setTxSubmitting(true);
      setTxErr("");
      const body = {
        asset_id: asset.id, // use internal asset id
        transaction_type_key: mode,
        quantity: qty,
        unit_price: unitPrice,
        description: txDesc || undefined,
        currency_code: asset.currency_code,
        occurred_date: occurredDate,
      };
      const r = await fetch("/api/v1/transactions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await safeJson(r);
      if (!r.ok) throw new Error(data?.error || `Erro (${r.status})`);

      //refresh asset_position
      setPageRefreshFlag(!pageRefreshFlag);
      // refresh history
      const h = await fetch(
        `/api/v1/transactions/${encodeURIComponent(asset.id)}`,
        {
          credentials: "include",
        },
      );
      const hist = await safeJson(h);
      setTransactions(normalizeArray(hist));

      // clear form
      setQty("");
      setUnitPrice("");
      setTxDesc("");
    } catch (e) {
      setTxErr(e.message || "Erro ao registrar transação.");
    } finally {
      setTxSubmitting(false);
    }
  }

  /* ---------------- Render ---------------- */
  const currencySymbol = currencyMap[asset?.currency_code] || "";

  const pnlClass = (v) =>
    v > 0 ? "text-emerald-400" : v < 0 ? "text-red-400" : "text-gray-100";

  const loadingAny = posLoading || assetLoading || curLoading;

  return (
    <AppShell
      username={user?.username ?? user?.name}
      userLoading={userLoading}
      userError={userError}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Status / errors */}
        {posError && (
          <div className="text-sm rounded-lg border border-red-800/50 bg-red-900/20 p-3">
            {posError}
          </div>
        )}
        {assetError && (
          <div className="text-sm rounded-lg border border-red-800/50 bg-red-900/20 p-3">
            {assetError}
          </div>
        )}

        {/* Editable section */}
        <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
          <div className="mb-4">
            <div className="text-xs uppercase text-gray-400">
              Detalhes do Ativo
            </div>

            {/* Title / Name + Code rules */}
            {yfinCompat ? (
              <h1 className="text-xl font-semibold mt-2">
                {asset?.name}{" "}
                <span className="text-gray-400">[{asset?.code}]</span>
              </h1>
            ) : (
              <div className="mt-2">
                <label className="block text-xs text-gray-400 mb-1">
                  Nome do Ativo
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loadingAny}
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                  placeholder="Nome do ativo"
                />
              </div>
            )}
          </div>

          {/* Asset Type when NOT yfinance */}
          {!yfinCompat && (
            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1">
                Tipo de Ativo
              </label>
              <select
                value={assetTypeCode}
                onChange={(e) => setAssetTypeCode(e.target.value)}
                disabled={loadingAny || typesLoading}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value="">Selecione…</option>
                {assetTypes.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name} — {t.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description (editable always) */}
          <div className="mb-2">
            <label className="block text-xs text-gray-400 mb-1">
              Descrição
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              disabled={loadingAny}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
              placeholder="Notas sobre o ativo…"
            />
          </div>

          {/* Save changes button (only if dirty — includes priceDirty) */}
          {(dirty || saveErr || saveOk) && (
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm">
                {saveErr && <span className="text-red-400">{saveErr}</span>}
                {saveOk && <span className="text-emerald-400">{saveOk}</span>}
              </div>
              <button
                onClick={handleSave}
                disabled={!dirty || saving || loadingAny}
                className="rounded-lg bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 px-4 py-2 text-sm font-medium"
              >
                {saving ? "Salvando…" : "Salvar Alterações"}
              </button>
            </div>
          )}
        </section>

        {/* Metrics with editable "Valor Unitário de Mercado" when NOT yfinance */}
        <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
          <div className="text-xs uppercase text-gray-400 mb-2">
            Minha Posição
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat label="Quantidade" value={formatNumber(position?.quantity)} />
            <Stat
              label="Custo Unitário"
              value={formatMoney(
                toNumber(position?.total_cost) / toNumber(position?.quantity),
                asset?.currency_code,
                currencySymbol,
              )}
            />
            {/* Editable when NOT yfinance */}
            {!yfinCompat ? (
              <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-400 mb-1">
                  Valor Unitário de Mercado
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={unitMarketInput}
                    onChange={(e) => setUnitMarketInput(e.target.value)}
                    disabled={loadingAny}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 p-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    placeholder="0.00"
                  />
                  {currencySymbol ? (
                    <span className="absolute inset-y-0 right-3 flex items-center text-gray-400 text-sm">
                      {currencySymbol}
                    </span>
                  ) : null}
                </div>

                {/* Inline save hint for price change (also covered by global Save CTA) */}
                {priceDirty && (
                  <div className="mt-2 flex items-center justify-end">
                    <button
                      onClick={handleSave}
                      disabled={saving || loadingAny}
                      className="rounded-md bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 px-3 py-1 text-xs font-medium"
                    >
                      {saving ? "Salvando…" : "Salvar valor"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Stat
                label="Valor Unitário de Mercado"
                value={formatMoney(
                  currentUnitMarket,
                  asset?.currency_code,
                  currencySymbol,
                )}
              />
            )}

            <Stat
              label="Valor Total de Mercado"
              value={formatMoney(
                totalMarketValue,
                asset?.currency_code,
                currencySymbol,
              )}
            />
          </div>

          <div className="mt-6">
            <div className="text-xs uppercase text-gray-400 mb-2">
              Rentabilidade da Posição
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-400">Lucro Líquido</div>
                  <Help title="Fórmula: Lucro Líquido = Receitas - Despesas" />
                </div>
                <div
                  className={`mt-1 text-lg font-semibold ${pnlClass(
                    position?.yield || 0,
                  )}`}
                >
                  {formatMoney(
                    position?.yield || 0,
                    asset?.currency_code,
                    currencySymbol,
                  )}
                </div>
              </div>

              <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-400">
                    Lucro Realizado de Venda
                  </div>
                  <Help title="Calcula o lucro líquido de operações de venda do ativo com base no preço médio. Se negativo, indica prejuízo nas vendas realizadas" />
                </div>
                <div
                  className={`mt-1 text-lg font-semibold ${pnlClass(
                    position?.realized_pnl || 0,
                  )}`}
                >
                  {formatMoney(
                    position?.realized_pnl || 0,
                    asset?.currency_code,
                    currencySymbol,
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
        {/* Fundamentos (Yahoo Finance) - Expandable */}
        {Boolean(asset?.yfinance_compatible) &&
          ssrFundamentals &&
          (asset.asset_type_code === "ACAO" ||
            asset.asset_type_code === "STOCK" ||
            asset.asset_type_code === "BDR") && (
            <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
              <details className="group">
                <summary className="cursor-pointer list-none flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Indicadores Fundamentalistas
                  </span>
                  <span className="text-xs text-gray-400 group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <div className="mt-4 space-y-6">
                  <FundamentalsGroup
                    title="Indicadores de Valuation"
                    items={ssrFundamentals.valuation}
                    currencyCode={asset?.currency_code}
                    currencySymbol={currencySymbol}
                  />
                  <FundamentalsGroup
                    title="Indicadores de Endividamento"
                    items={ssrFundamentals.debt}
                    currencyCode={asset?.currency_code}
                    currencySymbol={currencySymbol}
                  />
                  <FundamentalsGroup
                    title="Indicadores de Eficiência"
                    items={ssrFundamentals.efficiency}
                    currencyCode={asset?.currency_code}
                    currencySymbol={currencySymbol}
                  />
                  <FundamentalsGroup
                    title="Indicadores de Rentabilidade"
                    items={ssrFundamentals.profitability}
                    currencyCode={asset?.currency_code}
                    currencySymbol={currencySymbol}
                  />
                  <div className="text-[11px] text-gray-500">
                    Fonte:
                    <a
                      href={`https://finance.yahoo.com/quote/${asset.code}/key-statistics/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 decoration-emerald-400/60 hover:decoration-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/40 rounded-sm"
                    >
                      {" Yahoo Finance"}
                    </a>
                    . Alguns valores podem ser TTM ou estimativas; onde
                    indisponível, exibimos “—”.
                  </div>
                </div>
              </details>
            </section>
          )}
        {/* New Transaction bar */}
        <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
          <div className="text-xs uppercase text-gray-400 mb-2">
            Registrar transação
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { key: "BUY", label: "Comprar" },
              { key: "SELL", label: "Vender" },
              { key: "INCOME", label: "Informar Receita" },
              { key: "EXPENSE", label: "Informar Despesa" },
            ].map((b) => (
              <button
                key={b.key}
                onClick={() => setMode(b.key)}
                className={`rounded-lg px-3 py-2 text-sm border ${
                  mode === b.key
                    ? "bg-emerald-800 border-emerald-700"
                    : "bg-gray-800 border-gray-700 hover:bg-gray-750"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field
              label="Quantidade"
              value={qty}
              onChange={setQty}
              type="number"
              placeholder="0"
            />
            <Field
              label="Valor Unitário"
              value={unitPrice}
              onChange={setUnitPrice}
              type="number"
              placeholder="0.00"
              right={currencySymbol}
            />
            <Field
              label="Data da Transação"
              value={occurredDate}
              onChange={setOccurredDate}
              type="date"
            />
            <div>
              <div className="text-xs text-gray-400 mb-1">Total</div>
              <div className="rounded-lg bg-gray-800 border border-gray-700 p-3 text-sm">
                {formatMoney(totalAmount, asset?.currency_code, currencySymbol)}
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs text-gray-400 mb-1">
              Descrição (opcional)
            </label>
            <input
              value={txDesc}
              onChange={(e) => setTxDesc(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 p-3 text-sm"
              placeholder="Observações desta transação"
            />
          </div>

          {txErr && <div className="mt-3 text-sm text-red-400">{txErr}</div>}

          <div className="mt-3 flex justify-end">
            <button
              onClick={submitTransaction}
              disabled={txSubmitting || !asset?.id}
              className="rounded-lg bg-emerald-800 hover:bg-emerald-700 disabled:opacity-60 px-4 py-2 text-sm font-medium"
            >
              {txSubmitting ? "Enviando…" : "Confirmar Transação"}
            </button>
          </div>
        </section>

        {/* Transaction History */}
        <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
          <div className="text-sm font-medium mb-3">
            Histórico de Transações
          </div>
          {txLoading ? (
            <div className="text-sm text-gray-400">Carregando…</div>
          ) : transactions.length === 0 ? (
            <div className="text-sm text-gray-400">
              Nenhuma transação registrada.
            </div>
          ) : (
            <ul className="space-y-2">
              {transactions.map((t, idx) => (
                <li
                  key={idx}
                  className="rounded-lg bg-gray-900 border border-gray-800 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs uppercase tracking-wider text-gray-400">
                        {labelForType(t.transaction_type_key)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(t.occurred_date).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatMoney(
                        t.unit_price,
                        t.currency_code,
                        currencyMap[t.currency_code],
                      )}{" "}
                      × {formatNumber(t.quantity)}
                    </span>
                  </div>
                  {t.description && (
                    <div className="text-sm text-gray-200 mt-1">
                      {t.description}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}

export async function getServerSideProps(ctx) {
  const { req, res, params } = ctx;
  const id = params?.id;
  if (!id) {
    return { props: { ssrMarket: null, ssrAt: null } };
  }

  const origin =
    process.env.NODE_ENV === "production"
      ? "https://" +
          (req.headers["x-forwarded-host"] || "").split(",")[0].trim() ||
        req.headers.host
      : "http://localhost:3000";

  const cookie = req.headers.cookie || "";

  // 1) Load the position by public id (needs user cookie)
  const posEndpoint = `${origin}/api/v1/asset_positions/${encodeURIComponent(id)}`;
  const posResp = await apiGet(posEndpoint, cookie);
  if (posResp.unauthorized) {
    return {
      redirect: { destination: "/login", permanent: false },
    };
  }
  if (posResp.error || !posResp.data) {
    // Don’t break the page; just skip SSR price
    res.setHeader("Cache-Control", "private, no-store");
    return { props: { ssrMarket: null, ssrAt: null } };
  }
  const position = posResp.data;

  // 2) Load the asset
  const assetsEndpoint = `${origin}/api/v1/assets/${encodeURIComponent(position.asset_id)}`;
  const assetResp = await apiGet(assetsEndpoint, cookie);
  if (assetResp.error || !assetResp.data) {
    res.setHeader("Cache-Control", "private, no-store");
    return { props: { ssrMarket: null, ssrAt: null } };
  }
  const asset = assetResp.data;
  console.log("asset" + asset);

  // 3) Fetch price from yahoo-finance2 only if yfinance_compatible
  let ssrMarket = null;
  let ssrFundamentals = null;

  if (asset?.yfinance_compatible && asset?.code) {
    ssrMarket = await market_data.getTickerMarketPrice(asset.code);
    ssrFundamentals = await market_data.getTickerFundamentals(asset.code);
  }

  // User-specific page; do not cache at the edge/CDN
  res.setHeader("Cache-Control", "private, no-store");
  return {
    props: {
      ssrMarket: ssrMarket ?? null,
      ssrFundamentals: ssrFundamentals ?? null,
    },
  };
}

/* ---------------- UI bits ---------------- */
function Stat({ label, value }) {
  return (
    <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-4">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  right,
}) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg bg-gray-800 border border-gray-700 p-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
        />
        {right ? (
          <span className="absolute inset-y-0 right-3 flex items-center text-gray-400 text-sm">
            {right}
          </span>
        ) : null}
      </div>
    </div>
  );
}
function Help({ title }) {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-800 border border-gray-700 text-gray-300 text-xs cursor-help"
      title={title}
    >
      ?
    </span>
  );
}

function FundamentalsGroup({ title, items, currencyCode, currencySymbol }) {
  return (
    <div>
      <div className="text-xs uppercase text-gray-400 mb-2">{title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((it) => (
          <div
            key={it.key}
            className="bg-gray-900/70 border border-gray-800 rounded-lg p-3 flex items-center justify-between"
          >
            <div className="text-xs text-gray-400">{it.label}</div>
            <div className="text-sm font-semibold">
              {formatFundValue(it, currencyCode, currencySymbol)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Helpers ---------------- */
function formatMoney(n, code = "BRL", symbol = "") {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  if (symbol) {
    return `${symbol} ${new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)}`;
  }
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: code,
    }).format(num);
  } catch {
    return new Intl.NumberFormat("pt-BR").format(num);
  }
}
function formatNumber(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 8 }).format(
    num,
  );
}
// For Fundamental values
function formatFundValue(it, currencyCode, currencySymbol) {
  const v = it?.value;
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  switch (it.fmt) {
    case "pct":
      return `${new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(v * 100)}%`;
    case "money":
      return formatMoney(v, currencyCode, currencySymbol);
    case "int":
      return new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 0,
      }).format(v);
    default: // "num"
      return new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(v);
  }
}

// normalize possible shapes: array | {data: array} | object map
function normalizeArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (data && typeof data === "object") return Object.values(data);
  return [];
}
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
/* used in  useEffect > public_assets
function pickNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}*/

const toNumber = (s) => (s === "" ? NaN : Number(s));

function labelForType(k) {
  switch (k) {
    case "BUY":
      return "Compra";
    case "SELL":
      return "Venda";
    case "INCOME":
      return "Receita";
    case "EXPENSE":
      return "Despesa";
    default:
      return k;
  }
}
