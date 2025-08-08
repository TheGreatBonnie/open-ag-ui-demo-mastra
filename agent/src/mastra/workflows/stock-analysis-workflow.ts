// Import necessary dependencies for the stock analysis workflow
// import { openai } from "@ai-sdk/openai"; // Alternative OpenAI SDK (commented out)
import { createStep, createWorkflow } from "@mastra/core/workflows"; // Core workflow building blocks
import { z } from "zod"; // Schema validation library
import { STOCK_ANALYST_PROMPT } from "../prompts"; // Pre-defined prompt for stock analysis
import yahooFinance from "yahoo-finance2"; // Yahoo Finance API for stock data
import OpenAI from "openai"; // OpenAI SDK for LLM interactions
import { userQueryExtractionTool } from "../tools/user-query-extraction-tool"; // Tool to extract investment parameters from user queries
import { gatherInsightsTool } from "../tools/gather-insights-tool"; // Tool to generate market insights
import { EventType } from "@ag-ui/core"; // Event types for UI state updates

/**
 * STEP 1: Extract Investment Parameters from User Query
 *
 * This step uses an LLM to parse the user's natural language query and extract
 * structured investment parameters like tickers, amounts, dates, etc.
 */
const fetchInformationFromUserQuery = createStep({
  id: "fetch-information-from-user-query",
  description: "Fetches information from user query",
  // Define input schema - what data this step expects to receive
  inputSchema: z.object({
    toolLogs: z
      .array(
        z.object({
          message: z.string().describe("The message to display to the user"),
          status: z.string().describe("The status of the message"),
        })
      )
      .describe("The tool logs of the workflow"),
    messages: z.any(), // Chat messages from the conversation
    availableCash: z.number().describe("The available cash of the user"),
    emitEvent: z.function().input(z.any()).output(z.any()), // Function to emit UI state updates
    investmentPortfolio: z
      .array(
        z.object({
          ticker: z.string(),
          amount: z.number(),
        })
      )
      .describe("The investment portfolio of the user"),
  }),
  // Define output schema - what data this step will produce
  outputSchema: z.object({
    toolLogs: z
      .array(
        z.object({
          message: z.string().describe("The message to display to the user"),
          status: z.string().describe("The status of the message"),
        })
      )
      .describe("The tool logs of the workflow"),
    emitEvent: z.function(),
    investmentPortfolio: z
      .array(
        z.object({
          ticker: z.string(),
          amount: z.number(),
        })
      )
      .describe("The investment portfolio of the user"),
    // Extracted investment parameters from user query
    investmentDate: z
      .string()
      .describe("The date of investment from which user wants to invest"),
    tickers: z
      .array(z.string())
      .describe("The array of tickers or stocks that user wants to invest in"),
    amount: z
      .array(z.number())
      .describe("The amount of money to invest in each ticker or stock"),
    intervalOfInvestment: z
      .string()
      .describe(
        "The interval of investment. Mostly user doesnt provide it. AI needs to figure this one out. If the investment date is long assume the interval as '6mo' or '3mo'. If investment date is relatively less assume interval as '1mo' or '1wk' or '3d', etc"
      ),
    benchmarkTicker: z
      .string()
      .describe("The benchmark ticker to compare with"),
    skip: z.boolean().describe("Whether to skip this step"),
    textMessage: z.string().describe("The text message to display to the user"),
  }),
  execute: async ({ inputData }) => {
    try {
      // Step 1.1: Initialize data and prepare the analysis prompt
      let data = inputData;
      await new Promise((resolve) => setTimeout(resolve, 0)); // Small delay for async processing

      // Step 1.2: Inject portfolio context into the stock analyst prompt
      data.messages[0].content = STOCK_ANALYST_PROMPT.replace(
        "{{PORTFOLIO_DATA_CONTEXT}}",
        JSON.stringify(inputData.investmentPortfolio)
      );

      // Step 1.3: Emit UI state update to show processing status
      if (inputData?.emitEvent && typeof inputData.emitEvent === "function") {
        inputData.emitEvent({
          type: EventType.STATE_DELTA,
          delta: [
            {
              op: "add",
              path: "/toolLogs/-",
              value: {
                message: "Fetching information from user query",
                status: "processing",
              },
            },
          ],
        });
        inputData.toolLogs.push({
          message: "Fetching information from user query",
          status: "processing",
        });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      // Step 1.4: Transform messages to OpenAI format
      data.messages = data.messages.map((msg: any) => {
        // Handle messages with no content
        if (msg?.content == null || msg?.content == undefined) {
          return {
            ...msg,
            tool_calls: msg.toolCalls,
            content: "",
          };
        }
        // Handle tool response messages
        if (msg?.role === "tool") {
          return {
            ...msg,
            tool_call_id: msg.toolCallId,
          };
        }
        return msg;
      });

      // Step 1.5: Call OpenAI to extract investment parameters from user query
      const model = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OLLAMA_API_URL
      });
      console.log(data.messages[0].content, "PROMPT");
      const response = await model.chat.completions.create({
        model: process.env.OLLAMA_MODEL || '',
        messages: data.messages,
        tools: [userQueryExtractionTool as any], // Use extraction tool to parse parameters
        tool_choice:
          data.messages[data.messages.length - 1].role == "tool"
            ? "none"
            : "auto",
      });

      // Step 1.6: Handle response - either direct text or structured tool call
      if (response.choices[0].finish_reason == "stop") {
        // No structured data extracted, return text response and skip analysis
        if (inputData?.emitEvent && typeof inputData.emitEvent === "function") {
          let index = inputData.toolLogs.length - 1;
          inputData.emitEvent({
            type: EventType.STATE_DELTA,
            delta: [
              {
                op: "replace",
                path: `/toolLogs/${index}/status`,
                value: "completed",
              },
            ],
          });
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        return {
          skip: true, // Skip further analysis steps
          availableCash: inputData.availableCash,
          emitEvent: inputData.emitEvent,
          textMessage: response.choices[0].message.content,
        };
      } else {
        // Step 1.7: Parse extracted investment parameters from tool call
        let toolResult;
        if (
          typeof response?.choices?.[0]?.message?.tool_calls?.[0]?.function
            ?.arguments === "string"
        ) {
          toolResult = JSON.parse(
            response.choices[0].message.tool_calls[0].function.arguments
          );
        } else {
          toolResult =
            response?.choices?.[0]?.message?.tool_calls?.[0]?.function
              ?.arguments || {};
        }

        // Step 1.8: Validate and adjust investment date (prevent dates too far in the past)
        if (
          new Date().getFullYear() -
          new Date(toolResult.investmentDate).getFullYear() >
          4
        ) {
          toolResult.investmentDate = new Date(
            new Date(toolResult.investmentDate).setFullYear(
              new Date().getFullYear() - 4
            )
          );
        }

        console.log(toolResult, "TOOL RESULT");

        // Step 1.9: Update UI status to completed
        if (inputData?.emitEvent && typeof inputData.emitEvent === "function") {
          let index = inputData.toolLogs.length - 1;
          inputData.emitEvent({
            type: EventType.STATE_DELTA,
            delta: [
              {
                op: "replace",
                path: `/toolLogs/${index}/status`,
                value: "completed",
              },
            ],
          });
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // Step 1.10: Return extracted parameters for next step
        return {
          ...toolResult,
          skip: false, // Continue with analysis
          availableCash: inputData.availableCash,
          investmentPortfolio: inputData.investmentPortfolio,
          emitEvent: inputData.emitEvent,
          textMessage: "",
          toolLogs: inputData.toolLogs,
        };
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  },
});

/**
 * STEP 2: Fetch Historical Stock Data
 *
 * This step retrieves historical price data from Yahoo Finance for the specified
 * tickers and benchmark, covering the investment period with the appropriate interval.
 */
const gatherStockInformation = createStep({
  id: "gather-stock-information",
  description: "Gathers stock information from yahoo finance",
  // Define input schema - receives extracted parameters from previous step
  inputSchema: z.object({
    skip: z.boolean().describe("Whether to skip this step"),
    toolLogs: z
      .array(
        z.object({
          message: z.string().describe("The message to display to the user"),
          status: z.string().describe("The status of the message"),
        })
      )
      .describe("The tool logs of the workflow"),
    textMessage: z.string().describe("The text message to display to the user"),
    investmentPortfolio: z
      .array(
        z.object({
          ticker: z.string(),
          amount: z.number(),
        })
      )
      .describe("The investment portfolio of the user"),
    investmentDate: z
      .string()
      .describe("The date of investment from which user wants to invest"),
    tickers: z
      .array(z.string())
      .describe("The array of tickers or stocks that user wants to invest in"),
    amount: z
      .array(z.number())
      .describe("The amount of money to invest in each ticker or stock"),
    intervalOfInvestment: z
      .string()
      .describe(
        "The interval of investment. Mostly user doesnt provide it. AI needs to figure this one out. If the investment date is long assume the interval as '6mo' or '3mo'. If investment date is relatively less assume interval as '1mo' or '1wk' or '3d', etc"
      ),
    availableCash: z.number().describe("The available cash of the user"),
    emitEvent: z.function(),
    benchmarkTicker: z
      .string()
      .describe("The benchmark ticker to compare with"),
  }),
  // Define output schema - includes historical price data
  outputSchema: z.object({
    skip: z.boolean().describe("Whether to skip this step"),
    toolLogs: z
      .array(
        z.object({
          message: z.string().describe("The message to display to the user"),
          status: z.string().describe("The status of the message"),
        })
      )
      .describe("The tool logs of the workflow"),
    investmentPortfolio: z
      .array(
        z.object({
          ticker: z.string(),
          amount: z.number(),
        })
      )
      .describe("The investment portfolio of the user"),
    textMessage: z.string().describe("The text message to display to the user"),
    investmentDate: z
      .string()
      .describe("The date of investment from which user wants to invest"),
    tickers: z
      .array(z.string())
      .describe("The array of tickers or stocks that user wants to invest in"),
    amount: z
      .array(z.number())
      .describe("The amount of money to invest in each ticker or stock"),
    intervalOfInvestment: z
      .string()
      .describe(
        "The interval of investment. Mostly user doesnt provide it. AI needs to figure this one out. If the investment date is long assume the interval as '6mo' or '3mo'. If investment date is relatively less assume interval as '1mo' or '1wk' or '3d', etc"
      ),
    availableCash: z.number().describe("The available cash of the user"),
    // Historical price data for each ticker
    preparedStockData: z.array(
      z.object({
        ticker: z.string(),
        data: z.array(
          z.object({
            date: z.string(),
            close: z.number(),
          })
        ),
      })
    ),
    // Historical price data for benchmark
    benchmarkData: z.object({
      ticker: z.string(),
      data: z.array(
        z.object({
          date: z.string(),
          close: z.number(),
        })
      ),
    }),
  }),
  execute: async ({ inputData }) => {
    // Commented out test code for emitting events
    // if (inputData?.emitEvent && typeof inputData.emitEvent === "function") {
    //   inputData.emitEvent({
    //     type: EventType.STATE_DELTA,
    //     delta: [
    //       { op: "replace", path: "/available_cash", value: 99 }
    //     ]
    //   });
    //   await new Promise(resolve => setTimeout(resolve, 0));
    // }
    try {
      if (!inputData.skip) {
        // Step 2.1: Update UI to show data fetching status
        if (inputData?.emitEvent && typeof inputData.emitEvent === "function") {
          inputData.emitEvent({
            type: EventType.STATE_DELTA,
            delta: [
              {
                op: "add",
                path: "/toolLogs/-",
                value: {
                  message: "Fetching stock data",
                  status: "processing",
                },
              },
            ],
          });
          inputData.toolLogs.push({
            message: "Fetching stock data",
            status: "processing",
          });
          await new Promise((resolve) => setTimeout(resolve, 2));
        }

        // Step 2.2: Extract parameters for Yahoo Finance API calls
        const { tickers, investmentDate, intervalOfInvestment } = inputData;
        const period1 = investmentDate; // Start date for historical data
        const period2 = new Date(); // End date (current date)

        // Step 2.3: Validate and set data interval for Yahoo Finance API
        const allowedIntervals = ["1d", "1wk", "1mo"] as const;
        const interval = allowedIntervals.includes(intervalOfInvestment as any)
          ? (intervalOfInvestment as (typeof allowedIntervals)[number])
          : "1mo"; // Default fallback to monthly data

        // Step 2.4: Fetch historical data for all tickers in parallel for efficiency
        const stockData = await Promise.all(
          tickers.map(async (ticker: string) => {
            return {
              ticker,
              data: await yahooFinance.historical(ticker, {
                period1,
                period2,
                interval: interval as any,
                events: "history", // Only get price history, not dividends/splits
              }),
            };
          })
        );

        // Step 2.5: Fetch benchmark data separately
        const benchmarkData = await yahooFinance.historical(
          inputData.benchmarkTicker,
          {
            period1,
            period2,
            interval: interval as any,
            events: "history",
          }
        );

        // Step 2.6: Transform stock data to consistent format (date + close price)
        const preparedStockData = stockData.map((item: any) => {
          return {
            ticker: item.ticker,
            data: item.data.map((item: any) => {
              return {
                date: item?.date,
                close: parseInt(String(item?.close ?? "0")), // Convert to integer for consistency
              };
            }),
          };
        });

        // Step 2.7: Transform benchmark data to consistent format
        const preparedBenchmarkData = {
          ticker: inputData.benchmarkTicker,
          data: benchmarkData.map((item: any) => {
            return {
              date: item?.date,
              close: parseInt(String(item?.close ?? "0")),
            };
          }),
        };

        // Step 2.8: Update UI to show completion
        if (inputData?.emitEvent && typeof inputData.emitEvent === "function") {
          let index = inputData.toolLogs.length - 1;
          inputData.emitEvent({
            type: EventType.STATE_DELTA,
            delta: [
              {
                op: "replace",
                path: `/toolLogs/${index}/status`,
                value: "completed",
              },
            ],
          });
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // Step 2.9: Return all input data plus the fetched historical data
        return {
          ...inputData,
          preparedStockData,
          benchmarkData: preparedBenchmarkData,
        };
      } else {
        // Step 2.10: If skipped, return empty data structures
        return {
          ...inputData,
          skip: true,
          preparedStockData: [],
          benchmarkData: {
            ticker: inputData.benchmarkTicker,
            data: [],
          },
        };
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  },
});

/**
 * STEP 3: Calculate Investment Returns and Portfolio Performance
 *
 * This step simulates the investment by calculating how many shares could be bought
 * at historical prices, then tracks portfolio value over time and compares against benchmark.
 */
const calculateInvestmentReturns = createStep({
  id: "calculate-investment-returns",
  description:
    "Calculates investment returns for each ticker over time and validates available cash.",
  // Define input schema - receives historical data from previous step
  inputSchema: z.object({
    skip: z.boolean().describe("Whether to skip this step"),
    toolLogs: z
      .array(
        z.object({
          message: z.string().describe("The message to display to the user"),
          status: z.string().describe("The status of the message"),
        })
      )
      .describe("The tool logs of the workflow"),
    textMessage: z.string().describe("The text message to display to the user"),
    investmentDate: z.string(),
    emitEvent: z.function(),
    tickers: z.array(z.string()),
    amount: z.array(z.number()),
    intervalOfInvestment: z.string(),
    availableCash: z.number(),
    investmentPortfolio: z
      .array(
        z.object({
          ticker: z.string(),
          amount: z.number(),
        })
      )
      .describe("The investment portfolio of the user"),
    preparedStockData: z.array(
      z.object({
        ticker: z.string(),
        data: z.array(
          z.object({
            date: z.string(),
            close: z.number(),
          })
        ),
      })
    ),
    benchmarkData: z.object({
      ticker: z.string(),
      data: z.array(
        z.object({
          date: z.string(),
          close: z.number(),
        })
      ),
    }),
  }),
  // Define output schema - includes performance calculations
  outputSchema: z.object({
    tickers: z
      .array(z.string())
      .describe("The array of tickers or stocks that user wants to invest in"),
    toolLogs: z
      .array(
        z.object({
          message: z.string().describe("The message to display to the user"),
          status: z.string().describe("The status of the message"),
        })
      )
      .describe("The tool logs of the workflow"),
    skip: z.boolean().describe("Whether to skip this step"),
    availableCash: z.number().describe("Available cash after investments"),
    // Time series of portfolio vs benchmark performance
    result: z.array(
      z.object({
        date: z.string().describe("The date"),
        portfolioValue: z.number().describe("Portfolio value at the time"),
        benchmarkValue: z.number().describe("Benchmark value at the time"),
      })
    ),
    // Total returns for each individual ticker
    totalReturns: z.array(
      z.object({
        ticker: z.string().describe("The ticker value"),
        rets: z.number().describe("The total returns from the ticker"),
        retsNum: z
          .number()
          .describe("The total returns from the ticker in number"),
      })
    ),
    // Portfolio allocation breakdown
    allocations: z.array(
      z.object({
        ticker: z.string().describe("The ticker data"),
        percentOfAllocation: z
          .number()
          .describe("Percentage of allocation this ticker has"),
        value: z.number().describe("Current value of ticker in the portfolio"),
        returnPercent: z
          .number()
          .describe("Percentage of return from this ticker"),
      })
    ),
    emitEvent: z.function(),
    investmentPortfolio: z
      .array(
        z.object({
          ticker: z.string(),
          amount: z.number(),
        })
      )
      .describe("The investment portfolio of the user"),
  }),
  execute: async ({ inputData }) => {
    try {
      if (!inputData.skip) {
        // Step 3.1: Update UI to show calculation status
        if (inputData?.emitEvent && typeof inputData.emitEvent === "function") {
          inputData.emitEvent({
            type: EventType.STATE_DELTA,
            delta: [
              {
                op: "add",
                path: "/toolLogs/-",
                value: {
                  message: "Calculating investment returns",
                  status: "processing",
                },
              },
            ],
          });
          inputData.toolLogs.push({
            message: "Calculating investment returns",
            status: "processing",
          });
          await new Promise((resolve) => setTimeout(resolve, 2));
        }

        // Step 3.2: Extract calculation parameters
        const {
          tickers,
          amount,
          availableCash,
          investmentDate,
          preparedStockData,
          benchmarkData,
        } = inputData;

        // Step 3.3: Validate sufficient funds for investment
        const totalInvestment = amount.reduce((a, b) => a + b, 0);
        if (totalInvestment > availableCash) {
          throw new Error(
            `Not enough available cash. Required: ${totalInvestment}, Available: ${availableCash}`
          );
        }

        // Step 3.4: Calculate shares that could be bought for each ticker (whole shares only)
        const sharesByTicker: Record<string, number> = {};
        let actualTotalInvestment = 0;
        preparedStockData.forEach((stock, idx) => {
          const investAmount = amount[idx];
          // Find the first price at or after investment date
          const priceEntry =
            stock.data.find(
              (d) => new Date(d.date) >= new Date(investmentDate)
            ) || stock.data[0];
          const closePrice = priceEntry?.close || 0;
          // Calculate whole shares that can be bought
          const shares =
            closePrice > 0 ? Math.floor(investAmount / closePrice) : 0;
          sharesByTicker[stock.ticker] = shares;
          actualTotalInvestment += shares * closePrice; // Track actual amount spent
        });

        // Step 3.5: Calculate equivalent benchmark investment
        const benchmarkPriceAtInvestment =
          benchmarkData.data.find(
            (d) => new Date(d.date) >= new Date(investmentDate)
          ) || benchmarkData.data[0];
        const benchmarkShares =
          benchmarkPriceAtInvestment?.close > 0
            ? Math.floor(
              actualTotalInvestment / benchmarkPriceAtInvestment.close
            )
            : 0;

        // Step 3.6: Create unified date index for time series analysis
        const allDates = Array.from(
          new Set(
            preparedStockData
              .flatMap((stock) => stock.data.map((d) => d.date))
              .concat(benchmarkData.data.map((d) => d.date))
          )
        ).sort();

        // Step 3.7: Calculate portfolio value and benchmark value for each date
        let result = allDates
          .map((date) => {
            // Calculate total portfolio value: sum of (shares * current price) for each ticker
            let portfolioValue = 0;
            let hasPortfolioData = false;
            preparedStockData.forEach((stock) => {
              const priceEntry = stock.data.find(
                (d) =>
                  new Date(d.date).toLocaleDateString() ==
                  new Date(date).toLocaleDateString()
              );
              if (priceEntry) {
                portfolioValue +=
                  sharesByTicker[stock.ticker] * priceEntry.close;
                hasPortfolioData = true;
              }
            });

            // Calculate benchmark value: benchmark shares * current benchmark price
            const benchmarkEntry = benchmarkData.data.find(
              (d) =>
                new Date(d.date).toLocaleDateString() ==
                new Date(date).toLocaleDateString()
            );
            const benchmarkValue = benchmarkEntry
              ? benchmarkShares * benchmarkEntry.close
              : 0;
            const hasBenchmarkData = !!benchmarkEntry;

            // Only include dates where both portfolio and benchmark have data
            if (hasPortfolioData && hasBenchmarkData) {
              return { date: date, portfolioValue, benchmarkValue };
            }
            return null;
          })
          .filter(
            (
              item
            ): item is {
              date: string;
              portfolioValue: number;
              benchmarkValue: number;
            } => item !== null
          );

        // Step 3.8: Sort and format time series data
        result = result.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        result = result.map((item) => {
          return {
            date: new Date(item.date).toLocaleDateString(),
            portfolioValue: item.portfolioValue,
            benchmarkValue: item.benchmarkValue,
          };
        });

        // Step 3.9: Calculate total returns for each ticker (as percentage)
        const totalReturns = preparedStockData.map((stock, idx) => {
          const investAmount = amount[idx];
          const firstEntry =
            stock.data.find(
              (d) => new Date(d.date) >= new Date(investmentDate)
            ) || stock.data[0];
          const lastEntry = stock.data[stock.data.length - 1];
          const shares = sharesByTicker[stock.ticker];
          const finalValue = shares * lastEntry.close;
          const retsNum = finalValue - investAmount; // Absolute return in dollars
          const rets =
            investAmount > 0
              ? ((finalValue - investAmount) / investAmount) * 100
              : 0; // Percentage return
          return { ticker: stock.ticker, rets, retsNum };
        });

        // Step 3.10: Calculate portfolio allocation breakdown
        const allocations = preparedStockData.map((stock, idx) => {
          const investAmount = amount[idx];
          const shares = sharesByTicker[stock.ticker];
          const lastEntry = stock.data[stock.data.length - 1];
          const value = shares * lastEntry.close; // Current value of this position
          // Calculate what percentage of total investment this ticker represented
          const percentOfAllocation =
            actualTotalInvestment > 0
              ? ((shares * (stock.data[0]?.close || 0)) /
                actualTotalInvestment) *
              100
              : 0;
          // Calculate return percentage for this specific ticker
          const returnPercent =
            investAmount > 0
              ? ((value - investAmount) / investAmount) * 100
              : 0;
          return {
            ticker: stock.ticker,
            percentOfAllocation,
            value,
            returnPercent,
          };
        });

        // Step 3.11: Calculate remaining cash after actual investments
        const finalAvailableCash = availableCash - actualTotalInvestment;

        // Step 3.12: Update UI to show completion
        if (inputData?.emitEvent && typeof inputData.emitEvent === "function") {
          let index = inputData.toolLogs.length - 1;
          inputData.emitEvent({
            type: EventType.STATE_DELTA,
            delta: [
              {
                op: "replace",
                path: `/toolLogs/${index}/status`,
                value: "completed",
              },
            ],
          });
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // Step 3.13: Return all calculated performance metrics
        return {
          tickers,
          skip: false,
          availableCash: finalAvailableCash,
          result,
          totalReturns,
          allocations,
          toolLogs: inputData.toolLogs,
          emitEvent: inputData.emitEvent,
          investmentPortfolio: tickers.map((ticker, idx) => ({
            ticker,
            amount: amount[idx],
          })),
        };
      } else {
        // Step 3.14: If skipped, return empty performance data
        return {
          ...inputData,
          skip: true,
          result: [],
          totalReturns: [],
          allocations: [],
          emitEvent: inputData.emitEvent,
        };
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  },
});

/**
 * STEP 4: Generate Market Insights
 *
 * This step uses an LLM to generate both bullish (positive) and bearish (negative)
 * insights for each ticker to provide balanced market analysis.
 */
const gatherInsights = createStep({
  id: "gather-insights",
  description: "Gathers insights from the investment returns",
  // Define input schema - receives performance data from previous step
  inputSchema: z.object({
    skip: z.boolean().describe("Whether to skip this step"),
    toolLogs: z
      .array(
        z.object({
          message: z.string().describe("The message to display to the user"),
          status: z.string().describe("The status of the message"),
        })
      )
      .describe("The tool logs of the workflow"),
    investmentPortfolio: z
      .array(
        z.object({
          ticker: z.string(),
          amount: z.number(),
        })
      )
      .describe("The investment portfolio of the user"),
    textMessage: z.string().describe("The text message to display to the user"),
    tickers: z
      .array(z.string())
      .describe("The array of tickers or stocks that user wants to invest in"),
    availableCash: z.number().describe("Available cash after investments"),
    result: z.array(
      z.object({
        date: z.string().describe("The date"),
        portfolioValue: z.number().describe("Portfolio value at the time"),
        benchmarkValue: z.number().describe("Benchmark value at the time"),
      })
    ),
    totalReturns: z.array(
      z.object({
        ticker: z.string().describe("The ticker value"),
        rets: z.number().describe("The total returns from the ticker"),
        retsNum: z
          .number()
          .describe("The total returns from the ticker in number"),
      })
    ),
    allocations: z.array(
      z.object({
        ticker: z.string().describe("The ticker data"),
        percentOfAllocation: z
          .number()
          .describe("Percentage of allocation this ticker has"),
        value: z.number().describe("Current value of ticker in the portfolio"),
        returnPercent: z
          .number()
          .describe("Percentage of return from this ticker"),
      })
    ),
    emitEvent: z.function(),
  }),
  // Define output schema - includes generated insights
  outputSchema: z.object({
    skip: z.boolean().describe("Whether to skip this step"),
    toolLogs: z
      .array(
        z.object({
          message: z.string().describe("The message to display to the user"),
          status: z.string().describe("The status of the message"),
        })
      )
      .describe("The tool logs of the workflow"),
    investmentPortfolio: z
      .array(
        z.object({
          ticker: z.string(),
          amount: z.number(),
        })
      )
      .describe("The investment portfolio of the user"),
    textMessage: z.string().describe("The text message to display to the user"),
    availableCash: z.number().describe("Available cash after investments"),
    result: z.array(
      z.object({
        date: z.string().describe("The date"),
        portfolioValue: z.number().describe("Portfolio value at the time"),
        benchmarkValue: z.number().describe("Benchmark value at the time"),
      })
    ),
    totalReturns: z.array(
      z.object({
        ticker: z.string().describe("The ticker value"),
        rets: z.number().describe("The total returns from the ticker"),
        retsNum: z
          .number()
          .describe("The total returns from the ticker in number"),
      })
    ),
    allocations: z.array(
      z.object({
        ticker: z.string().describe("The ticker data"),
        percentOfAllocation: z
          .number()
          .describe("Percentage of allocation this ticker has"),
        value: z.number().describe("Current value of ticker in the portfolio"),
        returnPercent: z
          .number()
          .describe("Percentage of return from this ticker"),
      })
    ),
    // Generated positive market insights
    bullInsights: z.array(
      z.object({
        title: z.string().describe("The title of the insight"),
        description: z.string().describe("The description of the insight"),
        emoji: z.string().describe("The emoji of the insight"),
      })
    ),
    // Generated negative market insights
    bearInsights: z.array(
      z.object({
        title: z.string().describe("The title of the insight"),
        description: z.string().describe("The description of the insight"),
        emoji: z.string().describe("The emoji of the insight"),
      })
    ),
    emitEvent: z.function(),
  }),
  execute: async ({ inputData }) => {
    try {
      if (!inputData.skip) {
        // Step 4.1: Update UI to show insight generation status
        if (inputData?.emitEvent && typeof inputData.emitEvent === "function") {
          inputData.emitEvent({
            type: EventType.STATE_DELTA,
            delta: [
              {
                op: "add",
                path: "/toolLogs/-",
                value: {
                  message: "Generating insights",
                  status: "processing",
                },
              },
            ],
          });
          inputData.toolLogs.push({
            message: "Generating insights",
            status: "processing",
          });
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // Step 4.2: Call OpenAI to generate market insights for the tickers
        const model = new OpenAI();
        const response = await model.chat.completions.create({
          model: "gpt-4o-mini",
          tools: [gatherInsightsTool as any], // Use specialized tool for generating insights
          tool_choice: "required", // Force the model to use the insights tool
          messages: [
            {
              role: "system",
              content: `You are a helpful assistant that generates insights for the tickers that user provides. Only one tool call is allowed. Within the same tool call, you can generate both bull and bear insights. You can generate as many insights as you want. But you can STRICTLY only generate one tool call. You can have insights for multiple tickers in the same tool call. Make sure there should be 2 bull and 2 bear for each ticker.`,
            },
            {
              role: "user",
              content: `Generate insights for the following tickers: ${inputData.tickers.join(
                ", "
              )}`,
            },
          ],
        });

        // Step 4.3: Parse the generated insights from the tool call response
        let toolResult;
        if (
          typeof response?.choices?.[0]?.message?.tool_calls?.[0]?.function
            ?.arguments === "string"
        ) {
          toolResult = JSON.parse(
            response.choices[0].message.tool_calls[0].function.arguments
          );
        } else {
          toolResult =
            response?.choices?.[0]?.message?.tool_calls?.[0]?.function
              ?.arguments || {};
        }

        // Step 4.4: Update UI to show completion
        if (inputData?.emitEvent && typeof inputData.emitEvent === "function") {
          let index = inputData.toolLogs.length - 1;
          inputData.emitEvent({
            type: EventType.STATE_DELTA,
            delta: [
              {
                op: "replace",
                path: `/toolLogs/${index}/status`,
                value: "completed",
              },
            ],
          });
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        // Step 4.5: Return all input data plus the generated insights
        return {
          ...inputData,
          ...toolResult,
        };
      } else {
        // Step 4.6: If skipped, return input data unchanged
        return {
          ...inputData,
        };
      }
    } catch (error) {
      console.log(error);
      throw error;
    }
  },
});

/**
 * MAIN WORKFLOW: Stock Analysis Workflow
 *
 * This is the main workflow orchestrator that ties together all the steps
 * to provide a complete stock analysis from user query to insights.
 */
const stockAnalysisWorkflow = createWorkflow({
  id: "stock-analysis-workflow",
  // Define workflow input schema - what the workflow expects to receive
  inputSchema: z.object({
    messages: z.any(), // Chat conversation messages
    availableCash: z.number().describe("The available cash of the user"),
    toolLogs: z
      .array(
        z.object({
          message: z.string().describe("The message to display to the user"),
          status: z.string().describe("The status of the message"),
        })
      )
      .describe("The tool logs of the workflow"),
    emitEvent: z.function().input(z.any()).output(z.any()), // Function to emit UI state updates
    investmentPortfolio: z
      .array(
        z.object({
          ticker: z.string(),
          amount: z.number(),
        })
      )
      .describe("The investment portfolio of the user"),
  }),
  // Define workflow output schema - what the completed workflow will return
  outputSchema: z.object({
    skip: z.boolean().describe("Whether to skip this step"),
    investmentPortfolio: z
      .array(
        z.object({
          ticker: z.string(),
          amount: z.number(),
        })
      )
      .describe("The investment portfolio of the user"),
    textMessage: z.string().describe("The text message to display to the user"),
    toolLogs: z
      .array(
        z.object({
          message: z.string().describe("The message to display to the user"),
          status: z.string().describe("The status of the message"),
        })
      )
      .describe("The tool logs of the workflow"),
    availableCash: z.number().describe("Available cash after investments"),
    // Time series performance data
    result: z.array(
      z.object({
        date: z.string().describe("The date"),
        portfolioValue: z.number().describe("Portfolio value at the time"),
        benchmarkValue: z.number().describe("Benchmark value at the time"),
      })
    ),
    // Individual ticker performance
    totalReturns: z.array(
      z.object({
        ticker: z.string().describe("The ticker value"),
        rets: z.number().describe("The total returns from the ticker"),
        retsNum: z
          .number()
          .describe("The total returns from the ticker in number"),
      })
    ),
    // Portfolio allocation breakdown
    allocations: z.array(
      z.object({
        ticker: z.string().describe("The ticker data"),
        percentOfAllocation: z
          .number()
          .describe("Percentage of allocation this ticker has"),
        value: z.number().describe("Current value of ticker in the portfolio"),
        returnPercent: z
          .number()
          .describe("Percentage of return from this ticker"),
      })
    ),
    // Generated market insights
    bullInsights: z.array(
      z.object({
        title: z.string().describe("The title of the insight"),
        description: z.string().describe("The description of the insight"),
        emoji: z.string().describe("The emoji of the insight"),
      })
    ),
    bearInsights: z.array(
      z.object({
        title: z.string().describe("The title of the insight"),
        description: z.string().describe("The description of the insight"),
        emoji: z.string().describe("The emoji of the insight"),
      })
    ),
  }),
})
  // Chain the workflow steps in sequence:
  .then(fetchInformationFromUserQuery) // Step 1: Extract investment parameters from user query
  .then(gatherStockInformation) // Step 2: Fetch historical stock data from Yahoo Finance
  .then(calculateInvestmentReturns) // Step 3: Calculate portfolio performance and returns
  .then(gatherInsights); // Step 4: Generate market insights using LLM

// Workflow setup and initialization
stockAnalysisWorkflow.commit(); // Finalize the workflow definition
stockAnalysisWorkflow.createRun(); // Create a new workflow run instance

// Export the workflow for use in other modules
export { stockAnalysisWorkflow };
