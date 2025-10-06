import { useEffect, useMemo } from "react";

export default function MonetaryField({
  id,
  label,
  value, // string
  onChange, // (string) => void
  currencySymbol, // e.g. "R$", "$", "₿"
  enabled = true,
  placeholder = "",
  required = false,
  maxDecimals = 8,
}) {
  const pattern = useMemo(
    () => new RegExp(`^(\\d+)(?:[\\.,](\\d{0,${maxDecimals}}))?$`),
    [maxDecimals],
  );

  function sanitize(raw) {
    if (raw == null) return "";
    let s = String(raw).replace(/\s+/g, "").replace(",", ".");
    // keep only digits and one dot
    s = s.replace(/[^0-9.]/g, "");
    const firstDot = s.indexOf(".");
    if (firstDot !== -1) {
      s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
    }
    // trim to max decimals
    const m = s.match(/^(\d+)(?:\.(\d+))?$/);
    if (!m) return s;
    const int = m[1];
    const frac = (m[2] || "").slice(0, maxDecimals);
    return frac ? `${int}.${frac}` : int;
  }

  const handleChange = (e) => {
    const raw = e.target.value;
    const s = sanitize(raw);
    if (s === "" || pattern.test(s.replace(".", ","))) {
      onChange(s);
    }
  };

  // If disabled, clear the value
  useEffect(() => {
    if (!enabled && value) onChange("");
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <label htmlFor={id} className="block text-sm text-gray-300 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          disabled={!enabled}
          required={required}
          className={`w-full rounded-lg bg-gray-800 border border-gray-700 p-3 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 ${!enabled ? "opacity-60 cursor-not-allowed" : ""}`}
        />
        <span className="absolute inset-y-0 right-3 flex items-center text-gray-400 text-sm select-none">
          {currencySymbol || "—"}
        </span>
      </div>
    </div>
  );
}
