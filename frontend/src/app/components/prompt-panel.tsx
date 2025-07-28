"use client"

import type React from "react"
import { CopilotChat } from "@copilotkit/react-ui"


interface PromptPanelProps {
  availableCash: number
}



export function PromptPanel({ availableCash }: PromptPanelProps) {


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }



  return (
    <div className="h-full flex flex-col bg-[#1a1a1a]">
      {/* Header */}
      <div className="p-4 border-b border-[#334155] bg-[#0a0a0a]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🪁</span>
          <div>
            <h1 className="text-lg font-semibold text-white font-['Roobert']">Portfolio Chat</h1>
            <div className="inline-block px-2 py-0.5 bg-[#BEC9FF] text-[#030507] text-xs font-semibold uppercase rounded">
              PRO
            </div>
          </div>
        </div>
        <p className="text-xs text-[#94a3b8]">Interact with the Mastra-powered AI agent for portfolio visualization and analysis</p>

        {/* Available Cash Display */}
        <div className="mt-3 p-2 bg-[#86ECE4]/20 rounded-lg">
          <div className="text-xs text-[#94a3b8] font-medium">Available Cash</div>
          <div className="text-sm font-semibold text-white font-['Roobert']">{formatCurrency(availableCash)}</div>
        </div>
      </div>
      <div
        style={
          {
            "--copilot-kit-background-color": "#0a0a0a",
            "--copilot-kit-secondary-color": "#808080",
            "--copilot-kit-input-background-color" : "#233736",
            "--copilot-kit-separator-color": "#233736",
            "--copilot-kit-primary-color": "#FFFFFF",
            "--copilot-kit-contrast-color": "#000000",
            "--copilot-kit-secondary-contrast-color": "#808080",
          } as any
        }
      > <CopilotChat className="h-[77vh] hide-scrollbar" labels={
        {
          initial: `I am a Mastra AI agent designed to analyze investment opportunities and track stock performance over time. How can I help you with your investment query? For example, you can ask me to analyze a stock like "Invest in Apple with 10k dollars since Jan 2023". \n\nNote: The AI agent has access to stock data from the past 4 years only`
        }
      } /></div>


    </div >
  )
}
