#!/usr/bin/env node
/**
 * index.ts — MCP server entry point
 *
 * This file wires together tool definitions and handlers into an MCP server
 * that communicates over stdio. It is intentionally minimal — all domain
 * logic lives in src/tools/.
 *
 * ADAPT THIS FILE:
 *   1. Replace the weather imports with your own tool imports
 *   2. The rest of this file typically needs no changes
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { weatherTools, handleWeatherTool } from "./tools/weather.js";

// ── Register all tool groups here ─────────────────────────────────────────────
const toolGroups = [
  { tools: weatherTools, handler: handleWeatherTool },
  // { tools: myApiTools, handler: handleMyApiTool },  ← add more here
];

const allTools = toolGroups.flatMap((g) => g.tools);

// ── Server setup ──────────────────────────────────────────────────────────────
const server = new Server(
  {
    name: process.env.MCP_SERVER_NAME ?? "mcp-api-builder",
    version: "0.1.0",
  },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  for (const { tools, handler } of toolGroups) {
    if (tools.some((t) => t.name === name)) {
      return handler(name, args as Record<string, unknown>);
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
