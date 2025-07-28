export const userQueryExtractionTool = {
  type: "function",
  function: {
    name: "userQueryExtractionTool",
    description: "Extract information from user query",
    parameters: {
      type: "object",
      properties: {
        investmentDate: {
          type: "string",
          description: "The date of investment (ISO format)"
        },
        tickers: {
          type: "array",
          items: { type: "string" },
          description: "Stock tickers to invest in"
        },
        amount: {
          type: "array",
          items: { type: "number" },
          description: "Amount per ticker"
        },
        intervalOfInvestment: {
          type: "string",
          description: "Investment interval like 1mo, 3mo, etc."
        },
        benchmarkTicker : {
          type: "string",
          description: "Benchmark ticker to compare with"
        }
      },
      required: ["investmentDate", "tickers", "amount", "intervalOfInvestment", "benchmarkTicker"]
    }
  }
}