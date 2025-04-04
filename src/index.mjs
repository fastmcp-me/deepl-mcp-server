import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";

// Create server instance
const server = new McpServer({
  name: "weather",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.tool(
  "get-forecast",
  "Get weather forecast for a location",
  { testKey: z.string().describe("testKey") },
  async ({ testKey }) => {
    // Get grid point data
    console.log({ testKey });
    // Get forecast data
    console.log({ secretKey: process.env.MY_SECRET_KEY });


    return {
      content: [
        {
          type: "text",
          text: "test",
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Weather MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
