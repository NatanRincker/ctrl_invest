"use client";
import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
/* Donut chart using Recharts (with hover tooltip) + legend */
export default function DonutChart({ data, palette = [] }) {
  const total = data.reduce((acc, d) => acc + (d.value || 0), 0);
  const chartData = data.map((d) => ({
    name: d.label,
    value: Math.max(0, Number(d.value) || 0),
  }));
  const [active, setActive] = useState(-1);

  return (
    <div className="flex items-center">
      {/* Chart */}
      <div className="relative w-64 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={95}
              paddingAngle={1}
              onMouseEnter={(_, idx) => setActive(idx)}
              onMouseLeave={() => setActive(-1)}
            >
              {chartData.map((_, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={palette[idx % palette.length]}
                  opacity={active === -1 || active === idx ? 1 : 0.6}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(val, name) => {
                const v = Number(val) || 0;
                const pct = total > 0 ? v / total : 0;
                return [`${(pct * 100).toFixed(2)}%`, name];
              }}
              contentStyle={{
                backgroundColor: "#111827",
                border: "1px solid #374151",
                borderRadius: "0.5rem",
                color: "#E5E7EB",
              }}
              labelStyle={{ color: "#E5E7EB" }}
              itemStyle={{ color: "#E5E7EB" }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-[11px] text-gray-400">Total</div>
            <div className="text-base font-semibold">
              {new Intl.NumberFormat("pt-BR", {
                maximumFractionDigits: 2,
              }).format(total)}
            </div>
          </div>
        </div>
      </div>
      {/* Legend */}
      <ul className="flex-1 space-y-1">
        {chartData.map((d, idx) => (
          <li key={idx} className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: palette[idx % palette.length] }}
              />
              <span className="text-gray-200">{d.name}</span>
            </span>
            <span className="text-gray-300">
              {total > 0 ? `${((d.value / total) * 100).toFixed(2)}%` : "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
