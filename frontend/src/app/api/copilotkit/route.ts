// Import the HttpAgent for making HTTP requests to the backend
import { HttpAgent } from "@ag-ui/client";

// Import CopilotKit runtime components for setting up the API endpoint
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";

// Import NextRequest type for handling Next.js API requests
import { NextRequest } from "next/server";

// Create a new HttpAgent instance that connects to the LangGraph research backend running locally
const mastraAgent = new HttpAgent({
  url: process.env.NEXT_PUBLIC_MASTRA_URL || "http://localhost:8000/mastra-agent",
});

// Initialize the CopilotKit runtime with our research agent
const runtime = new CopilotRuntime({
  agents: {
    mastraAgent : mastraAgent, // Register the research agent with the runtime
  },
});

/**
 * Define the POST handler for the API endpoint
 * This function handles incoming POST requests to the /api/copilotkit endpoint
 */
export const POST = async (req: NextRequest) => {
  // Configure the CopilotKit endpoint for the Next.js app router
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime, // Use the runtime with our research agent
    serviceAdapter: new OpenAIAdapter(), // Use the experimental adapter
    endpoint: "/api/copilotkit", // Define the API endpoint path
  });

  // Process the incoming request with the CopilotKit handler
  return handleRequest(req);
};
