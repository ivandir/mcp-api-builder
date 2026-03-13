"""
server.py — MCP server entry point

This file wires together tool definitions and handlers into an MCP server
that communicates over stdio. It is intentionally minimal — all domain
logic lives in src/tools/.

ADAPT THIS FILE:
  1. Replace the weather imports with your own tool imports
  2. The rest of this file typically needs no changes
"""

import asyncio
import os
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent, CallToolResult
from src.tools.weather import WEATHER_TOOLS, handle_weather_tool

# ── Register all tool groups here ─────────────────────────────────────────────
TOOL_GROUPS = [
    {"tools": WEATHER_TOOLS, "handler": handle_weather_tool},
    # {"tools": MY_API_TOOLS, "handler": handle_my_api_tool},  ← add more here
]

ALL_TOOLS = [tool for group in TOOL_GROUPS for tool in group["tools"]]

# ── Server setup ───────────────────────────────────────────────────────────────
app = Server(os.environ.get("MCP_SERVER_NAME", "mcp-api-builder"))


@app.list_tools()
async def list_tools() -> list[Tool]:
    return [Tool(**t) for t in ALL_TOOLS]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> CallToolResult:
    for group in TOOL_GROUPS:
        if any(t["name"] == name for t in group["tools"]):
            result = await group["handler"](name, arguments)
            return [TextContent(**item) for item in result["content"]]
    raise ValueError(f"Unknown tool: {name}")


# ── Start ──────────────────────────────────────────────────────────────────────
async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
