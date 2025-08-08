// Import necessary dependencies for the stock analysis agent
import { google } from "@ai-sdk/google"; // OpenAI SDK for language model integration
import { Agent } from "@mastra/core/agent"; // Core agent class from Mastra framework
import { STOCK_ANALYST_PROMPT } from "../prompts"; // Pre-defined system prompt for stock analysis behavior
import { stockAnalysisWorkflow } from "../workflows/stock-analysis-workflow"; // The complete stock analysis workflow

/**
 * Stock Analysis Agent
 *
 * This agent serves as the main entry point for stock analysis functionality.
 * It combines an LLM (Large Language Model) with a specialized workflow to:
 * 1. Understand user queries about stock investments
 * 2. Execute comprehensive stock analysis workflows
 * 3. Provide intelligent responses with market insights
 *
 * The agent acts as an intelligent interface between user conversations
 * and the complex stock analysis workflow that handles data fetching,
 * calculations, and insight generation.
 */
export const stockAnalysisAgent = new Agent({
  // Step 1: Define the agent's identity
  name: "stockAnalysisAgent", // Unique identifier for this agent instance

  // Step 2: Configure the underlying language model
  model: google("gemini-2.5-flash"), // Use OpenAI's GPT-4o-mini model for intelligent conversation

  // Step 3: Set the agent's behavioral instructions
  instructions: STOCK_ANALYST_PROMPT, // System prompt that defines how the agent should behave and respond

  // Step 4: Register available workflows that the agent can execute
  workflows({ runtimeContext }) {
    // Return an object mapping workflow names to their implementations
    // The agent can invoke these workflows during conversations when appropriate
    return {
      stockAnalysisWorkflow: stockAnalysisWorkflow, // Register the main stock analysis workflow
    };
  },
});
