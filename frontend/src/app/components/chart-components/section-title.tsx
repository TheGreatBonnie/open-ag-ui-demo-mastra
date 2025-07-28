interface SectionTitleProps {
  title: string
}

export function SectionTitle({ title }: SectionTitleProps) {
  return (
    <div className="border-b border-[#334155] pb-1">
      <h2 className="text-lg font-semibold text-white font-['Roobert']">{title}</h2>
    </div>
  )
}
