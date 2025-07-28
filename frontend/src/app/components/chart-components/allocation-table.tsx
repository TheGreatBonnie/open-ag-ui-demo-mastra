export interface AllocationTableData {
  ticker: string
  percentOfAllocation: number
  value: number
  returnPercent: number
}

interface AllocationTableComponentProps {
  allocations: AllocationTableData[] | [] | undefined
  size?: "normal" | "small"
}

export function AllocationTableComponent({ allocations, size = "normal" }: AllocationTableComponentProps) {
  // Define class variants based on size
  const padding = size === "small" ? "py-1 px-2" : "py-2 px-3"
  const fontSize = size === "small" ? "text-[10px]" : "text-xs"
  return (
    <div className="border border-[#334155] rounded-xl overflow-hidden bg-[#1a1a1a]">
      <table className="w-full">
        <thead className="bg-[#0a0a0a]">
          <tr>
            <th className={`text-left ${padding} ${fontSize} font-semibold font-['Plus_Jakarta_Sans'] text-white`}>
              Ticker
            </th>
            <th className={`text-left ${padding} ${fontSize} font-semibold font-['Plus_Jakarta_Sans'] text-white`}>%</th>
            <th className={`text-left ${padding} ${fontSize} font-semibold font-['Plus_Jakarta_Sans'] text-white`}>
              Value
            </th>
            <th className={`text-left ${padding} ${fontSize} font-semibold font-['Plus_Jakarta_Sans'] text-white`}>
              Return
            </th>
          </tr>
        </thead>
        <tbody>
          {allocations?.map((allocation, index) => (
            <tr key={allocation?.ticker} className={index % 2 === 0 ? "bg-[#1a1a1a]" : "bg-[#0a0a0a]"}>
              <td className={`font-medium font-['Plus_Jakarta_Sans'] ${padding} ${fontSize} text-white`}>
                {allocation?.ticker}
              </td>
              <td className={`font-['Plus_Jakarta_Sans'] ${padding} ${fontSize} text-[#94a3b8]`}>{allocation?.percentOfAllocation?.toFixed(2)}%</td>
              <td className={`font-['Plus_Jakarta_Sans'] ${padding} ${fontSize} text-[#94a3b8]`}>
                ${(allocation?.value || 0).toFixed(1)}K
              </td>
              <td className={`font-medium font-['Plus_Jakarta_Sans'] ${padding} ${fontSize}`}>
                <span className={allocation?.returnPercent >= 0 ? "text-[#1B606F]" : "text-red-600"}>
                  {allocation?.returnPercent >= 0 ? "+" : ""}
                  {allocation?.returnPercent.toFixed(2)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
