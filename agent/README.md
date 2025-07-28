# Mastra Weather AI - Backend

The backend agent infrastructure for the Mastra Weather AI Assistant, built with the Mastra framework and powered by OpenAI.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- OpenAI API key

### Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Set up environment variables**

   Create a `.env.local` file:

   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

The Mastra agent will be available at `http://localhost:4000`

## 📁 Project Structure

```
src/
├── mastra/
│   ├── agents/
│   │   └── weather-agent.ts      # Main weather AI agent
│   ├── tools/
│   │   └── weather-tool.ts       # Weather API integration
│   ├── workflows/
│   │   └── weather-workflow.ts   # Weather data processing
│   └── index.ts                  # Mastra configuration
└── ag-ui-mastra.ts              # Main entry point
```

## 🤖 Agent Architecture

### Weather Agent

- **Model**: GPT-4-mini for efficient responses
- **Instructions**: Specialized for weather-related queries
- **Tools**: Weather data fetching capabilities
- **Workflows**: Structured weather information processing
- **Memory**: Persistent conversation context using LibSQL

### Key Components

- **Weather Tool** (`tools/weather-tool.ts`): Handles API calls to weather services
- **Weather Workflow** (`workflows/weather-workflow.ts`): Orchestrates data processing
- **Agent Configuration** (`agents/weather-agent.ts`): Defines AI behavior and capabilities

## 🛠️ Development

### Available Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
```

### Customizing the Agent

To modify the weather agent's behavior:

1. **Update Instructions**: Edit `src/mastra/agents/weather-agent.ts`
2. **Add Tools**: Create new tools in `src/mastra/tools/`
3. **Modify Workflows**: Update processing logic in `src/mastra/workflows/`

### Environment Variables

```env
OPENAI_API_KEY=your_openai_api_key_here
WEATHER_API_KEY=your_weather_api_key_here  # If using external weather service
```

## 🗄️ Database

The agent uses LibSQL (SQLite) for persistent memory storage:

- Database file: `../mastra.db`
- Stores conversation context and user preferences
- Automatically managed by Mastra framework

## 🔧 Configuration

The Mastra configuration is in `src/mastra/index.ts`. You can:

- Add new agents
- Configure different models
- Set up additional tools and workflows
- Modify memory settings

## 📚 Learn More

- [Mastra Framework Documentation](https://mastra.ai/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

---

For the complete project setup and frontend configuration, see the [main README](../README.md).
