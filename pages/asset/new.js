// pages/asset/new.js
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import AppShell from "../../components/layout/AppShell";
import MonetaryField from "../../components/form/MonetaryField";

export default function NewAssetPage() {
  const router = useRouter();

  // Header user info (same as /home)
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userErr, setUserErr] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setUserLoading(true);
        const r = await fetch("/api/v1/me", { credentials: "include" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (active) setUser(data);
      } catch {
        if (active) setUserErr("Failed to load user.");
      } finally {
        if (active) setUserLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // ----------- Currencies -----------
  const [currencies, setCurrencies] = useState([]); // [{code,name,symbol}]
  const [currencyMap, setCurrencyMap] = useState({}); // code -> symbol
  const [currencyCode, setCurrencyCode] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch("/api/v1/currencies", { credentials: "include" });
        const data = await r.json();
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

  const currencySymbol = currencyMap[currencyCode] || "";

  // ----------- Asset Types -----------
  const [assetTypes, setAssetTypes] = useState([]); // [{code,name,description}]
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch("/api/v1/asset_types", {
          credentials: "include",
        });
        const data = await r.json();
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : Object.values(data || {});
        const cleaned = arr
          .filter(Boolean)
          .map(({ code, name, description }) => ({ code, name, description }));
        if (active) setAssetTypes(cleaned);
      } catch {
        if (active) setAssetTypes([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // ----------- Form state -----------
  const [assetName, setAssetName] = useState("");
  const [assetCode, setAssetCode] = useState("");
  const [description, setDescription] = useState("");
  const [assetTypeCode, setAssetTypeCode] = useState("");
  const [yfinCompat, setYfinCompat] = useState(false);
  const [selectedFromPublic, setSelectedFromPublic] = useState(false); // controls locking

  // Monetary fields (strings)
  const [unitValue, setUnitValue] = useState(""); // Valor Unitário (asset.market_value)
  const [quantity, setQuantity] = useState(""); // Quantidade (for BUY)
  const [costUnit, setCostUnit] = useState(""); // Custo Unitário
  const [occurredDate, setOccurredDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  ); // YYYY-MM-DD

  const unitValueEnabled = Boolean(currencyCode) && !yfinCompat; // lock if yfinance true
  const otherMoneyEnabled = Boolean(currencyCode);

  // ----------- Search public_assets -----------
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const searchTimer = useRef(null);
  const suggestBoxRef = useRef(null);

  // Close suggestions on click outside
  useEffect(() => {
    function onDocClick(e) {
      if (!suggestBoxRef.current) return;
      if (!suggestBoxRef.current.contains(e.target)) setShowSuggest(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleNameChange = (v) => {
    // If it was locked by public selection, typing is not allowed
    if (selectedFromPublic) return;
    setAssetName(v);
    setShowSuggest(v.trim().length >= 2);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (v.trim().length >= 2) {
      searchTimer.current = setTimeout(async () => {
        try {
          setSearching(true);
          const url = `/api/v1/public_assets/search/${encodeURIComponent(v.trim())}`;
          const r = await fetch(url, { credentials: "include" });
          const data = await r.json();
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          setSuggestions(Array.isArray(data) ? data : data?.data || []);
        } catch {
          setSuggestions([]);
        } finally {
          setSearching(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
    }
  };

  const handlePickSuggestion = (item) => {
    // item: { id, code, name, currency_code, market_value, yfinance_compatible, asset_type_code, ... }
    setAssetName(item.name || "");
    setAssetCode(item.code || "");
    setCurrencyCode(item.currency_code || "");
    setYfinCompat(Boolean(item.yfinance_compatible));
    setUnitValue((item.market_value ?? "").toString());
    setAssetTypeCode(item.asset_type_code || "");
    setShowSuggest(false);
    setSelectedFromPublic(true); // lock Nome + Tipo de Ativo
  };

  const clearPublicSelection = () => {
    setSelectedFromPublic(false);
    setAssetName("");
    setAssetCode("");
    setAssetTypeCode("");
    setCurrencyCode("");
    setYfinCompat(false);
    setUnitValue("");
    setCostUnit("");
    setQuantity("");
    setSuggestions([]);
    setShowSuggest(false);
  };

  // ----------- Submit -----------
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [formOk, setFormOk] = useState("");

  const toNumber = (s) => (s === "" ? NaN : Number(s));

  async function handleSubmit(e) {
    e.preventDefault();
    setFormErr("");
    setFormOk("");

    // Basic validations
    if (!assetName.trim()) return setFormErr("Informe o Nome do Ativo.");
    if (!assetTypeCode) return setFormErr("Selecione o Tipo de Ativo.");
    if (!currencyCode) return setFormErr("Selecione a Moeda.");

    const quantityNumber = toNumber(quantity);
    const costUnitNumber = toNumber(costUnit);
    let market = toNumber(unitValue);
    if (yfinCompat && (unitValue === "" || !Number.isFinite(market))) {
      return setFormErr(
        "Valor Unitário ausente do ativo compatível com Bolsas de Valores.",
      );
    }
    if (!yfinCompat && !Number.isFinite(market)) market = costUnitNumber;

    if (!Number.isFinite(quantityNumber) || quantityNumber <= 0)
      return setFormErr("Quantidade inválida.");
    if (!Number.isFinite(costUnitNumber) || costUnitNumber <= 0)
      return setFormErr("Custo Unitário inválido.");

    try {
      setSubmitting(true);

      // 1) Create asset
      const assetBody = {
        code: assetCode || assetName.replaceAll(" ", "_"),
        name: assetName,
        description: description || undefined,
        currency_code: currencyCode,
        market_value: unitValue, // send user-entered string; your API can coerce
        paid_price: costUnit,
        yfinance_compatible: Boolean(yfinCompat),
        is_generic: true,
        asset_type_code: assetTypeCode || undefined,
      };

      const r1 = await fetch("/api/v1/assets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assetBody),
      });
      const created = await r1.json();
      if (!r1.ok) {
        throw new Error(
          created?.error || `Falha ao criar ativo (HTTP ${r1.status})`,
        );
      }

      // 2) Create BUY transaction
      const txBody = {
        asset_id: created.id,
        transaction_type_key: "BUY",
        quantity: quantity,
        unit_price: costUnit,
        description: description || undefined,
        currency_code: currencyCode,
        occurred_date: occurredDate, // YYYY-MM-DD
      };

      const r2 = await fetch("/api/v1/transactions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(txBody),
      });
      const txRes = await r2.json().catch(() => ({}));
      if (!r2.ok) {
        throw new Error(
          txRes?.error || `Falha ao criar transação (HTTP ${r2.status})`,
        );
      }

      setFormOk("Ativo Cadastrado com Sucesso!");
      // router.push("/home");
    } catch (err) {
      setFormErr(err.message || "Erro ao salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      username={user?.username ?? user?.name}
      userLoading={userLoading}
      userError={userErr}
    >
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">Novo Ativo</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Alerts */}
          {formErr && (
            <div className="text-sm rounded-lg border border-red-800/50 bg-red-900/20 p-3">
              {formErr}
            </div>
          )}
          {formOk && (
            <div className="text-sm rounded-lg border border-emerald-700/50 bg-emerald-900/20 p-3">
              {formOk}
            </div>
          )}

          {/* Nome do Ativo + suggestions + clear (✕) */}
          <div ref={suggestBoxRef} className="relative">
            <label
              htmlFor="assetName"
              className="block text-sm text-gray-300 mb-1"
            >
              Nome do Ativo
            </label>
            <div className="relative">
              <input
                id="assetName"
                type="text"
                value={assetName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex.: Meu Carro, Petrobras, BOVA11, Bitcoin"
                className={`w-full rounded-lg bg-gray-800 border border-gray-700 p-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 ${
                  selectedFromPublic ? "opacity-75 cursor-not-allowed" : ""
                }`}
                autoComplete="off"
                required
                disabled={selectedFromPublic}
              />
              {/* Clear selection (X) */}
              {(selectedFromPublic || assetName) && (
                <button
                  type="button"
                  onClick={clearPublicSelection}
                  title="Limpar seleção"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-base"
                >
                  ×
                </button>
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggest && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 shadow-xl max-h-72 overflow-auto">
                {searching && (
                  <div className="px-3 py-2 text-sm text-gray-400">
                    Buscando…
                  </div>
                )}
                {!searching && suggestions.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-400">
                    Nenhum resultado
                  </div>
                )}
                {suggestions.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => handlePickSuggestion(it)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-800"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{it.name}</div>
                        <div className="text-xs text-gray-400">{it.code}</div>
                      </div>
                      <div className="text-sm text-gray-300">
                        {formatCurrency(
                          it.market_value,
                          currencyMap[it.currency_code]
                            ? it.currency_code
                            : "BRL",
                          currencyMap[it.currency_code],
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Descrição (opcional) */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm text-gray-300 mb-1"
            >
              Descrição (opcional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
              placeholder="Notas sobre o ativo…"
            />
          </div>

          {/* Tipo de Ativo*/}
          <div>
            <label
              htmlFor="assetType"
              className="block text-sm text-gray-300 mb-1"
            >
              Tipo de Ativo
            </label>
            <select
              id="assetType"
              value={assetTypeCode}
              onChange={(e) => setAssetTypeCode(e.target.value)}
              className={`w-full rounded-lg bg-gray-800 border border-gray-700 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 ${
                selectedFromPublic ? "opacity-75 cursor-not-allowed" : ""
              }`}
              required
              disabled={selectedFromPublic}
            >
              <option value="">Selecione…</option>
              {assetTypes.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name} - {t.description}
                </option>
              ))}
            </select>
            {selectedFromPublic && (
              <p className="text-xs text-gray-500 mt-1">
                Definido pelo ativo público selecionado.
              </p>
            )}
          </div>

          {/* Moeda */}
          <div>
            <label
              htmlFor="currency"
              className="block text-sm text-gray-300 mb-1"
            >
              Moeda
            </label>
            <select
              id="currency"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
              required
            >
              <option value="">Selecione…</option>
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Monetary values */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MonetaryField
              id="unitValue"
              label="Valor Unitário Atual"
              value={unitValue}
              onChange={setUnitValue}
              currencySymbol={currencySymbol}
              enabled={Boolean(currencyCode) && !yfinCompat}
              placeholder="0.00"
              required={!yfinCompat}
            />
            <MonetaryField
              id="quantity"
              label="Quantidade"
              value={quantity}
              onChange={setQuantity}
              currencySymbol=""
              enabled={Boolean(currencyCode)}
              placeholder="0"
              required
            />
            <MonetaryField
              id="costUnit"
              label="Custo Unitário"
              value={costUnit}
              onChange={setCostUnit}
              currencySymbol={currencySymbol}
              enabled={Boolean(currencyCode)}
              placeholder="0.00"
              required
            />
          </div>

          {/* Data da Transação (BUY) */}
          <div>
            <label
              htmlFor="occurredDate"
              className="block text-sm text-gray-300 mb-1"
            >
              Data da Transação
            </label>
            <input
              id="occurredDate"
              type="date"
              value={occurredDate}
              onChange={(e) => setOccurredDate(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push("/home")}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-800 hover:bg-emerald-700 disabled:opacity-70 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium"
            >
              {submitting ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

/* helpers */
function formatCurrency(n, currencyCode = "BRL", symbol) {
  if (typeof n !== "number" && typeof n !== "string") return "—";
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currencyCode,
    }).format(num);
  } catch {
    return `${symbol || ""} ${new Intl.NumberFormat("pt-BR").format(num)}`.trim();
  }
}
