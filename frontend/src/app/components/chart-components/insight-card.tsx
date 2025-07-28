interface Insight {
  title: string
  description: string
  emoji: string
}

interface InsightCardComponentProps {
  insight: Insight
  type: "bull" | "bear"
}

export function InsightCardComponent({ insight, type }: InsightCardComponentProps) {
  const getTypeStyles = () => {
    switch (type) {
      case "bull":
        return "border-l-4 border-l-[#00d237] bg-[#86ECE4]/20"
      case "bear":
        return "border-l-4 border-l-red-500 bg-red-500/10"
      default:
        return "border-l-4 border-l-[#334155]"
    }
  }

  return (
    <div className={`border border-[#334155] rounded-xl p-3 bg-[#1a1a1a] ${getTypeStyles()}`}>
      <div className="flex items-start gap-2">
        <span className="text-lg">{insight.emoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white font-['Roobert'] mb-1">{insight.title}</h3>
          <p className="text-xs text-[#94a3b8] font-['Plus_Jakarta_Sans'] leading-relaxed">{insight.description}</p>
        </div>
      </div>
    </div>
  )
}
