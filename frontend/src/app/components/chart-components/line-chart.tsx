"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export interface LineChartData {
  date: string
  portfolioValue: number
  benchmarkValue: number
}

interface LineChartComponentProps {
  data: LineChartData[] | [] | undefined
  size?: "normal" | "small"
}

export function LineChartComponent({ data, size = "normal" }: LineChartComponentProps) {
  const height = size === "small" ? 120 : 192 // h-30 or h-48
  const padding = size === "small" ? "p-2" : "p-4"
  const fontSize = size === "small" ? 8 : 10
  const tooltipFontSize = size === "small" ? "9px" : "11px"
  const legendFontSize = size === "small" ? "9px" : "11px"
  return (
    <div className="border border-[#334155] rounded-xl bg-[#1a1a1a] p-4">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={fontSize} fontFamily="Plus Jakarta Sans" />
            <YAxis
              stroke="#94a3b8"
              fontSize={fontSize}
              fontFamily="Plus Jakarta Sans"
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #334155",
                color: "#ededed",
                borderRadius: "8px",
                fontSize: tooltipFontSize,
                fontFamily: "Plus Jakarta Sans",
              }}
              formatter={(value: number, name: string) => [
                `$${value.toLocaleString()}`,
                name.toLowerCase() === "portfolio" ? "Portfolio" : "SPY",
              ]}
            />
            <Legend
              wrapperStyle={{
                fontSize: legendFontSize,
                fontFamily: "Plus Jakarta Sans",
                fontWeight: 500,
                color: "#ededed",
              }}
            />
            <Line type="monotone" dataKey="portfolioValue" stroke="#c084fc" strokeWidth={2} name="Portfolio" dot={false} />
            <Line type="monotone" dataKey="benchmarkValue" stroke="#BEC9FF" strokeWidth={2} name="SPY" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
