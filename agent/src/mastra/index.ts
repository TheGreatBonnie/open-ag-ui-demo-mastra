// Import necessary dependencies for Mastra framework configuration
import { Mastra } from "@mastra/core/mastra"; // Core Mastra framework class for orchestrating agents and workflows
import { PinoLogger } from "@mastra/loggers"; // Structured logging library for debugging and monitoring
import { LibSQLStore } from "@mastra/libsql"; // Database storage provider for telemetry, evaluations, and persistence
import { stockAnalysisAgent } from "./agents/stock-analysis-agent"; // The intelligent stock analysis agent
import { stockAnalysisWorkflow } from "./workflows/stock-analysis-workflow"; // The complete stock analysis workflow

/**
 * Mastra Framework Configuration
 *
 * This file serves as the central configuration and initialization point for the entire
 * stock analysis system. It brings together all the components:
 *
 * 1. Agents - Intelligent conversational interfaces that understand user queries
 * 2. Workflows - Multi-step business processes that execute complex analysis
 * 3. Storage - Database layer for persistence and telemetry data
 * 4. Logging - Structured logging for debugging and monitoring
 *
 * The Mastra instance acts as the main orchestrator that coordinates all these
 * components and provides a unified interface for the application.
 */
export const mastra = new Mastra({
  // Step 1: Register all available workflows
  // Workflows are multi-step processes that can be executed by agents or triggered directly
  workflows: { stockAnalysisWorkflow }, // Register the stock analysis workflow for investment calculations

  // Step 2: Register all available agents
  // Agents are intelligent interfaces that can understand natural language and execute workflows
  agents: { stockAnalysisAgent }, // Register the stock analysis agent for handling user conversations

  // Step 3: Configure data storage
  // Storage handles persistence of telemetry data, evaluation results, and system state
  storage: new LibSQLStore({
    // Use in-memory storage for development/testing (data is lost when process stops)
    // For production: change to "file:../mastra.db" to persist data to disk
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:", // In-memory database - fast but non-persistent
  }),

  // Step 4: Configure structured logging
  // Logger captures system events, errors, and debugging information
  logger: new PinoLogger({
    name: "Mastra", // Logger name for identifying log source
    level: "info", // Log level - captures info, warn, and error messages (filters out debug/trace)
  }),
});
