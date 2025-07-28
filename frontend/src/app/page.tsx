"use client"

import { useEffect, useState } from "react"
import { PromptPanel } from "./components/prompt-panel"
import { GenerativeCanvas } from "./components/generative-canvas"
import { ComponentTree } from "./components/component-tree"
import { CashPanel } from "./components/cash-panel"
import { useCoAgent, useCoAgentStateRender, useCopilotAction, useCopilotReadable } from "@copilotkit/react-core"
import { BarChartComponent, BarChartData } from "@/app/components/chart-components/bar-chart"
import { LineChartComponent, LineChartData } from "@/app/components/chart-components/line-chart"
import { AllocationTableComponent, AllocationTableData } from "@/app/components/chart-components/allocation-table"
import { useCopilotChatSuggestions } from "@copilotkit/react-ui"
import { INVESTMENT_SUGGESTION_PROMPT } from "@/utils/prompts"
import { ToolLogs } from "./components/tool-logs"

export interface PortfolioState {
  id: string
  trigger: string
  investmentAmount?: number
  currentPortfolioValue?: number
  performanceData: Array<{
    date: string
    portfolioValue: number
    benchmarkValue: number
  }>
  allocations: Array<{
    ticker: string
    percentOfAllocation: number
    value: number
    returnPercent: number
  }>
  returnsData: Array<{
    ticker: string
    rets: number
  }>
  bullInsights: Array<{
    title: string
    description: string
    emoji: string
  }>
  bearInsights: Array<{
    title: string
    description: string
    emoji: string
  }>
  totalReturns: number
}

export interface SandBoxPortfolioState {
  performanceData: Array<{
    date: string
    portfolio: number
    spy: number
  }>
}
export interface InvestmentPortfolio {
  ticker: string
  amount: number
}


export default function OpenStocksCanvas() {
  const [currentState, setCurrentState] = useState<PortfolioState>({
    id: "",
    trigger: "",
    performanceData: [],
    allocations: [],
    returnsData: [],
    bullInsights: [],
    bearInsights: [],
    currentPortfolioValue: 0,
    totalReturns: 0
  })
  const [sandBoxPortfolio, setSandBoxPortfolio] = useState<SandBoxPortfolioState[]>([])
  const [selectedStock, setSelectedStock] = useState<string | null>(null)
  const [showComponentTree, setShowComponentTree] = useState(false)
  const [totalCash, setTotalCash] = useState(1000000)
  const [investedAmount, setInvestedAmount] = useState(0)

  const { state, setState } = useCoAgent({
    name: "mastraAgent",
    initialState: {
      availableCash: totalCash,
      investmentSummary: {} as any,
      investmentPortfolio: [] as InvestmentPortfolio[]
    }
  })

  useCoAgentStateRender({
    name: "mastraAgent",
    render: ({ state }) => <ToolLogs logs={state.toolLogs} />
  })

  useCopilotAction({
    name: "render_standard_charts_and_table",
    description: "This is an action to render a standard chart and table. The chart can be a bar chart or a line chart. The table can be a table of data.",
    renderAndWaitForResponse: ({ args, respond, status }) => {
      useEffect(() => {
        console.log(args, "argsargsargsargsargsaaa")
      }, [args])
      return (
        <>
          {(args) &&
            <>
              <div className="flex flex-col gap-4">
                <LineChartComponent data={args?.result as LineChartData[]} size="small" />
                <BarChartComponent data={args?.totalReturns as BarChartData[]} size="small" />
                <AllocationTableComponent allocations={args?.allocations as AllocationTableData[]} size="small" />

              </div>

              <button hidden={status == "complete"}
                className="mt-4 rounded-full px-6 py-2 bg-green-50 text-green-700 border border-green-200 shadow-sm hover:bg-green-100 transition-colors font-semibold text-sm"
                onClick={() => {
                  debugger
                  if (respond) {
                    setTotalCash(args?.availableCash as number)
                    setCurrentState({
                      ...currentState,
                      // @ts-ignore
                      performanceData: args?.result,
                      returnsData: args?.totalReturns,
                      allocations: args?.allocations,
                      bullInsights: args?.bullInsights || [],
                      bearInsights: args?.bearInsights || [],
                      totalReturns: args?.totalReturns.reduce((acc: number, val: any) => acc + val.retsNum, 0)
                      // returnsData: Object.entries(args?.investment_summary?.percent_return_per_stock).map(([ticker, return1]) => ({
                      //   ticker,
                      //   return: return1 as number
                      // })),
                      // allocations: Object.entries(args?.investment_summary?.percent_allocation_per_stock).map(([ticker, allocation]) => ({
                      //   ticker,
                      //   allocation: allocation as number,
                      //   currentValue: args?.investment_summary?.final_prices[ticker] * args?.investment_summary?.holdings[ticker],
                      //   totalReturn: args?.investment_summary?.percent_return_per_stock[ticker]
                      // })),
                      // currentPortfolioValue: args?.investment_summary?.total_value,
                      // totalReturns: (Object.values(args?.investment_summary?.returns) as number[])
                      //   .reduce((acc, val) => acc + val, 0)
                    })
                    setInvestedAmount(
                      totalCash - (args?.availableCash as number)
                    )
                    setState({
                      ...state,
                      availableCash: args?.availableCash as number,
                      investmentPortfolio: args?.investmentPortfolio as InvestmentPortfolio[]
                    })
                    respond("Data rendered successfully. Provide summary of the investments by not making any tool calls")
                  }
                }}
              >
                Accept
              </button>
              <button hidden={status == "complete"}
                className="rounded-full px-6 py-2 bg-red-50 text-red-700 border border-red-200 shadow-sm hover:bg-red-100 transition-colors font-semibold text-sm ml-2"
                onClick={() => {
                  debugger
                  if (respond) {
                    respond("Data rendering rejected. Just give a summary of the rejected investments by not making any tool calls")
                  }
                }}
              >
                Reject
              </button>
            </>
          }

        </>

      )
    }
  })

  useCopilotAction({
    name: "render_custom_charts",
    renderAndWaitForResponse: ({ args, respond, status }) => {
      return (
        <>
          <LineChartComponent data={args?.investment_summary?.performanceData} size="small" />
          <button hidden={status == "complete"}
            className="mt-4 rounded-full px-6 py-2 bg-green-50 text-green-700 border border-green-200 shadow-sm hover:bg-green-100 transition-colors font-semibold text-sm"
            onClick={() => {
              debugger
              if (respond) {
                setSandBoxPortfolio([...sandBoxPortfolio, {
                  performanceData: args?.investment_summary?.performanceData.map((item: any) => ({
                    date: item.date,
                    portfolio: item.portfolio,
                    spy: 0
                  })) || []
                }])
                respond("Data rendered successfully. Provide summary of the investments")
              }
            }}
          >
            Accept
          </button>
          <button hidden={status == "complete"}
            className="rounded-full px-6 py-2 bg-red-50 text-red-700 border border-red-200 shadow-sm hover:bg-red-100 transition-colors font-semibold text-sm ml-2"
            onClick={() => {
              debugger
              if (respond) {
                respond("Data rendering rejected. Just give a summary of the rejected investments")
              }
            }}
          >
            Reject
          </button>
        </>
      )
    }
  })

  useCopilotReadable({
    description: "This is the current state of the portfolio",
    value: JSON.stringify(state.investmentPortfolio)
  })

  useCopilotChatSuggestions({
    available: selectedStock ? "disabled" : "enabled",
    instructions: INVESTMENT_SUGGESTION_PROMPT,
  },
    [selectedStock])

  // const toggleComponentTree = () => {
  //   setShowComponentTree(!showComponentTree)
  // }

  // const availableCash = totalCash - investedAmount
  // const currentPortfolioValue = currentState.currentPortfolioValue || investedAmount


  useEffect(() => {
    getBenchmarkData()
  }, [])

  function getBenchmarkData() {
    let result: PortfolioState = {
      id: "aapl-nvda",
      trigger: "apple nvidia",
      performanceData: [
        { date: "Jan 2023", portfolioValue: 10000, benchmarkValue: 10000 },
        { date: "Mar 2023", portfolioValue: 10200, benchmarkValue: 10200 },
        { date: "Jun 2023", portfolioValue: 11000, benchmarkValue: 11000 },
        { date: "Sep 2023", portfolioValue: 10800, benchmarkValue: 10800 },
        { date: "Dec 2023", portfolioValue: 11500, benchmarkValue: 11500 },
        { date: "Mar 2024", portfolioValue: 12200, benchmarkValue: 12200 },
        { date: "Jun 2024", portfolioValue: 12800, benchmarkValue: 12800 },
        { date: "Sep 2024", portfolioValue: 13100, benchmarkValue: 13100 },
        { date: "Dec 2024", portfolioValue: 13600, benchmarkValue: 13600 },
      ],
      allocations: [],
      returnsData: [],
      bullInsights: [],
      bearInsights: [],
      totalReturns: 0,
      currentPortfolioValue: totalCash
    }
    setCurrentState(result)
  }



  return (
    <div className="h-screen bg-[#0a0a0a] flex overflow-hidden">
      {/* Left Panel - Prompt Input */}
      <div className="w-85 border-r border-[#334155] bg-[#1a1a1a] flex-shrink-0">
        <PromptPanel availableCash={totalCash} />
      </div>

      {/* Center Panel - Generative Canvas */}
      <div className="flex-1 relative min-w-0">
        {/* Top Bar with Cash Info */}
        <div className="absolute top-0 left-0 right-0 bg-[#1a1a1a] border-b border-[#334155] p-4 z-10">
          <CashPanel
            totalCash={totalCash}
            investedAmount={investedAmount}
            currentPortfolioValue={(totalCash + investedAmount + currentState.totalReturns) || 0}
            onTotalCashChange={setTotalCash}
            onStateCashChange={setState}
          />
        </div>

        <div className="pt-20 h-full">
          <GenerativeCanvas setSelectedStock={setSelectedStock} portfolioState={currentState} sandBoxPortfolio={sandBoxPortfolio} setSandBoxPortfolio={setSandBoxPortfolio} />
        </div>
      </div>

      {/* Right Panel - Component Tree (Optional) */}
      {showComponentTree && (
        <div className="w-64 border-l border-[#334155] bg-[#1a1a1a] flex-shrink-0">
          <ComponentTree portfolioState={currentState} />
        </div>
      )}
    </div>
  )
}
