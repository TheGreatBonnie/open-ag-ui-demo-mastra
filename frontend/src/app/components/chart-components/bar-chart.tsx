"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export interface BarChartData {
  ticker: string
  rets: number
}

interface BarChartComponentProps {
  data: BarChartData[]
  size?: "normal" | "small"
  onClick?: (data: string) => void
}

export function BarChartComponent({ data, size = "normal", onClick }: BarChartComponentProps) {
  const height = size === "small" ? 80 : 160 // h-20 or h-40
  const padding = size === "small" ? "p-2" : "p-4"
  const fontSize = size === "small" ? 8 : 10
  const tooltipFontSize = size === "small" ? "9px" : "11px"
  return (
    <div className="border border-[#334155] rounded-xl bg-[#1a1a1a] p-4">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="ticker" stroke="#94a3b8" fontSize={fontSize} fontFamily="Plus Jakarta Sans" />
            <YAxis
              stroke="#94a3b8"
              fontSize={fontSize}
              fontFamily="Plus Jakarta Sans"
              tickFormatter={(value) => `${value}%`}
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
              formatter={(value: number) => [`${value.toFixed(1)}%`, "Return"]}
            />
            <Bar onClick={(data, index) => {
              if (size === "normal") {
                // @ts-ignore
                console.log(data.payload, "clicked")
                // @ts-ignore
                onClick?.(data.payload.ticker as string)
              }
            }} dataKey="rets" fill="#c084fc" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
