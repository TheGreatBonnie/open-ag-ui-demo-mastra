// =============================================================================
// IMPORTS AND DEPENDENCIES SECTION
// =============================================================================

// Load environment variables from .env file
// This must be imported first to ensure environment variables are available
import "dotenv/config";

// Import Express.js framework and type definitions
// Express provides the HTTP server and middleware functionality
import express, { Request, Response } from "express";

// Import AG-UI core types and schemas for input validation and event types
// These provide the protocol definitions for Agent Gateway UI communication
import {
  RunAgentInputSchema, // Schema for validating incoming agent requests
  RunAgentInput, // TypeScript interface for agent input data
  EventType, // Enumeration of all possible event types
  Message, // Interface for chat message structure
} from "@ag-ui/core";

// Import event encoder for Server-Sent Events (SSE) formatting
// This handles the encoding of events for real-time streaming
import { EventEncoder } from "@ag-ui/encoder";

// Import UUID generator for creating unique message IDs
// Used to track individual messages and tool calls
import { v4 as uuidv4 } from "uuid";

// Import the configured Mastra instance containing our stock analysis agent
// This is the main AI workflow engine that processes user requests
import { mastra } from "./mastra";

// =============================================================================
// EXPRESS APPLICATION SETUP
// =============================================================================

// Create Express application instance
const app = express();

// Enable JSON body parsing middleware for incoming requests
// This allows the server to parse JSON payloads from HTTP requests
app.use(express.json());

// =============================================================================
// MAIN AGENT ENDPOINT IMPLEMENTATION
// =============================================================================

// Define the main mastra-agent (Agent Workflow Protocol) endpoint
// This endpoint handles streaming communication with AG-UI agents
app.post("/mastra-agent", async (req: Request, res: Response) => {
  try {
    debugger;
    // STEP 1: Parse and Validate Input
    // Parse the incoming request body using the RunAgentInputSchema to ensure
    // it contains all required fields (threadId, runId, messages, etc.)
    const input: RunAgentInput = RunAgentInputSchema.parse(req.body);

    // STEP 2: Setup Server-Sent Events (SSE) Response Headers
    // Configure HTTP headers to enable real-time streaming communication
    res.setHeader("Content-Type", "text/event-stream"); // Enable SSE format
    res.setHeader("Cache-Control", "no-cache"); // Prevent browser caching
    res.setHeader("Connection", "keep-alive"); // Keep connection open for streaming

    // STEP 3: Initialize Event Encoder
    // Create encoder instance to format events for SSE transmission
    const encoder = new EventEncoder();

    // STEP 4: Send Run Started Event
    // Notify the client that the agent run has begun processing
    const runStarted = {
      type: EventType.RUN_STARTED,
      threadId: input.threadId,
      runId: input.runId,
    };
    res.write(encoder.encode(runStarted));

    // STEP 5: Initialize Agent State

    // STEP 5: Initialize Agent State
    // Send initial state snapshot with default values for financial data
    // This provides the UI with the current state of the investment portfolio
    const stateSnapshot = {
      type: EventType.STATE_SNAPSHOT,
      snapshot: {
        availableCash: input.state?.availableCash || 100000, // Default $100k if not provided
        investmentSummary: input.state?.investmentSummary || {}, // Empty summary object
        investmentPortfolio: input.state?.investmentPortfolio || [], // Empty portfolio array
        toolLogs: [], // Initialize empty tool logs array
      },
    };
    res.write(encoder.encode(stateSnapshot));
    await new Promise((resolve) => setTimeout(resolve, 0)); // Allow event loop to process

    // STEP 6: Get Stock Analysis Workflow
    // Retrieve the pre-configured stock analysis workflow from Mastra
    const stockAnalysis = mastra.getWorkflow("stockAnalysisWorkflow");

    // STEP 7: Define Event Emission Helper
    // Create a helper function to emit events to the SSE stream
    function emitEvent(data: any) {
      res.write(encoder.encode(data));
    }

    // STEP 8: Create and Start Workflow Execution
    // Initialize a new workflow run instance and start processing
    const workflow = await stockAnalysis.createRunAsync();
    const result = await workflow.start({
      inputData: {
        messages: input.messages, // User messages from the conversation
        availableCash: input.state?.availableCash || 1000000, // Available investment funds
        emitEvent: emitEvent, // Event emission callback
        investmentPortfolio: input.state?.investmentPortfolio || [], // Current portfolio
        toolLogs: [], // Initialize tool logs
      },
    });

    // STEP 9: Reset Tool Logs State
    // Clear any previous tool logs to start fresh for this run
    emitEvent({
      type: EventType.STATE_DELTA,
      delta: [{ op: "replace", path: "/toolLogs", value: [] }],
    });
    await new Promise((resolve) => setTimeout(resolve, 0)); // Allow processing

    // STEP 10: Generate Unique Message ID
    // Create a unique identifier for the response message
    // STEP 10: Generate Unique Message ID
    // Create a unique identifier for the response message
    const messageId = uuidv4();

    // STEP 11: Process Workflow Results
    // Check if the workflow executed successfully and produced chart data
    if (result?.status === "success" && result?.result?.result?.length > 0) {
      // STEP 11A: Handle Chart/Table Rendering Response
      // The workflow has produced data suitable for rendering charts and tables

      // STEP 11A.1: Start Tool Call for Chart Rendering
      // Notify the client that a tool call is beginning
      const toolcallStart = {
        type: EventType.TOOL_CALL_START,
        toolCallId: uuidv4(), // Unique identifier for this tool call
        toolCallName: "render_standard_charts_and_table", // Name of the tool being called
      };
      emitEvent(toolcallStart);
      await new Promise((resolve) => setTimeout(resolve, 0)); // Allow processing

      // STEP 11A.2: Send Tool Call Arguments
      // Transmit the chart/table data as arguments to the rendering tool
      const toolcallArgs = {
        type: EventType.TOOL_CALL_ARGS,
        toolCallId: toolcallStart.toolCallId, // Reference the tool call
        delta: JSON.stringify(result.result), // Serialize the result data
      };
      emitEvent(toolcallArgs);
      await new Promise((resolve) => setTimeout(resolve, 0)); // Allow processing

      // STEP 11A.3: End Tool Call
      // Signal that the tool call has completed
      const toolcallEnd = {
        type: EventType.TOOL_CALL_END,
        toolCallId: toolcallStart.toolCallId, // Reference the tool call
      };
      emitEvent(toolcallEnd);
      await new Promise((resolve) => setTimeout(resolve, 0)); // Allow processing
    } else {
      // STEP 11B: Handle Text Response
      // The workflow produced a text message instead of chart data

      // STEP 11B.1: Start Text Message Stream
      // Begin streaming a text response to the client
      const textMessageStart = {
        type: EventType.TEXT_MESSAGE_START,
        messageId, // Use the generated message ID
        role: "assistant", // Indicate this is an assistant response
      };
      res.write(encoder.encode(textMessageStart));
      await new Promise((resolve) => setTimeout(resolve, 0)); // Allow processing

      // STEP 11B.2: Extract Response Content
      // Get the text message from the workflow result, with fallback to empty string
      const response =
        result?.status === "success" ? result.result.textMessage : "";

      // STEP 11B.3: Stream Response in Chunks
      // Break the response into smaller chunks for smooth streaming experience
      const chunkSize = 100; // Number of characters per chunk
      for (let i = 0; i < response.length; i += chunkSize) {
        const chunk = response.slice(i, i + chunkSize); // Extract chunk

        // Send the chunk to the client
        const textMessageContent = {
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId, // Reference the message
          delta: chunk, // The text chunk
        };
        res.write(encoder.encode(textMessageContent));

        // Add small delay between chunks for smooth streaming effect
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // STEP 11B.4: End Text Message Stream
      // Signal that the text message is complete
      const textMessageEnd = {
        type: EventType.TEXT_MESSAGE_END,
        messageId, // Reference the message
      };
      res.write(encoder.encode(textMessageEnd));
    }

    // STEP 12: Finalize Agent Run
    // Send final event to indicate the entire agent run is complete
    const runFinished = {
      type: EventType.RUN_FINISHED,
      threadId: input.threadId, // Reference the conversation thread
      runId: input.runId, // Reference this specific run
    };
    res.write(encoder.encode(runFinished));

    // STEP 13: Close SSE Connection
    // End the response stream to complete the HTTP request
    res.end();
  } catch (error) {
    // =============================================================================
    // ERROR HANDLING SECTION
    // =============================================================================
    // Handle any errors that occur during agent execution with comprehensive
    // error reporting and graceful degradation

    console.error("Error during streaming:", error);

    // Create an event encoder for error handling
    const encoder = new EventEncoder();

    // STEP 14: Determine Error Response Strategy
    // Check if HTTP headers have already been sent to the client
    if (!res.headersSent) {
      // CASE 1: Headers Not Sent Yet
      // We can still send a standard JSON error response since SSE hasn't started
      res.status(422).json({ error: (error as Error).message });
    } else {
      // CASE 2: Headers Already Sent (SSE Stream Active)
      // We need to handle errors within the existing SSE stream gracefully
      try {
        // Re-parse request body to get thread/run IDs for error events
        const input: RunAgentInput = RunAgentInputSchema.parse(req.body);

        // STEP 14A: Update State to Reflect Error
        // Notify client that an error has occurred during processing
        const errorStateDelta = {
          type: EventType.STATE_DELTA,
          delta: [
            { op: "replace", path: "/status", value: "error" }, // Mark status as error
            {
              op: "replace",
              path: "/processingStage",
              value: "error_occurred", // Update processing stage
            },
            { op: "add", path: "/error", value: (error as Error).message }, // Add error message
          ],
        };
        res.write(encoder.encode(errorStateDelta));

        // STEP 14B: Send Error Message as Text Message
        // Generate unique ID for the error message
        const errorMessageId = uuidv4();

        // Start error message stream
        const errorTextStart = {
          type: EventType.TEXT_MESSAGE_START,
          messageId: errorMessageId,
          role: "assistant", // Assistant role for error messages
        };
        res.write(encoder.encode(errorTextStart));

        // Send error content to user
        const errorContent = {
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId: errorMessageId,
          delta: `Error: ${(error as Error).message}`, // Format error message
        };
        res.write(encoder.encode(errorContent));

        // End error message stream
        const errorTextEnd = {
          type: EventType.TEXT_MESSAGE_END,
          messageId: errorMessageId,
        };
        res.write(encoder.encode(errorTextEnd));

        // STEP 14C: Properly Terminate the Run
        // Send run finished event even in error case to maintain protocol compliance
        const runFinished = {
          type: EventType.RUN_FINISHED,
          threadId: input.threadId,
          runId: input.runId,
        };
        res.write(encoder.encode(runFinished));

        // Close the SSE stream
        res.send();
      } catch (writeError) {
        // CASE 3: Critical Error - Cannot Write to Stream
        // If we can't write error events, just log and close connection
        console.error("Failed to send error event:", writeError);
        if (!res.destroyed) {
          res.end();
        }
      }
    }
  }
});

// =============================================================================
// UTILITY FUNCTIONS SECTION
// =============================================================================

// HELPER FUNCTION: Extract Location from User Message
// Analyzes user input to identify location mentions for weather queries
// Uses regex patterns to match common ways users specify locations
// NOTE: This function appears to be legacy code from a weather-related demo
// and may not be actively used in the current stock analysis implementation
function extractLocationFromMessage(content: string): string | null {
  // Define regex patterns for different location mention formats
  // These patterns cover the most common ways users ask about weather
  const locationPatterns = [
    /weather in ([A-Za-z\s,]+)/i, // "weather in New York"
    /weather for ([A-Za-z\s,]+)/i, // "weather for Los Angeles"
    /([A-Za-z\s,]+) weather/i, // "Paris weather"
  ];

  // Iterate through each pattern to find location matches
  for (const pattern of locationPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      // Return the captured location, trimmed of whitespace
      return match[1].trim();
    }
  }

  // Return null if no location pattern is found
  return null;
}

// =============================================================================
// SERVER INITIALIZATION SECTION
// =============================================================================

// START EXPRESS SERVER
// Configure and start the HTTP server on port 8000
app.listen(8000, () => {
  console.log("Server running on http://localhost:8000");
  console.log("AG-UI endpoint available at http://localhost:8000/mastra-agent");
});
