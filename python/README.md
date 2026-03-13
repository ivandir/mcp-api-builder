# mcp-api-builder (Python)

A template and working example for building MCP servers that wrap REST APIs.

Every company has internal APIs that aren't covered by community MCPs. This repo teaches the pattern once so you can wrap any API in under 30 minutes.

## What's included

| File | What it is |
| --- | --- |
| `src/server.py` | MCP server entry — wire together tool groups here |
| `src/tools/weather.py` | **Working example** wrapping the Open-Meteo weather API (free, no key) |
| `scripts/openapi_to_mcp.py` | Generate MCP tool stubs from any OpenAPI 3.x spec |
| `docs/auth-patterns.md` | Copy-paste auth patterns: API key, Bearer, OAuth 2.0, Basic |

## Quickstart — run the example

The example wraps [Open-Meteo](https://open-meteo.com) — free, no API key needed.

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e .
python -m src.server
```

Add to Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "weather": {
      "command": "python",
      "args": ["-m", "src.server"],
      "cwd": "/path/to/mcp-api-builder/python"
    }
  }
}
```

Or with Claude Code CLI:

```bash
claude mcp add weather python -- -m src.server
```

Then ask Claude: _"What's the weather in London?"_

## Build your own MCP server in 30 minutes

### Step 1 — Generate tool stubs from your OpenAPI spec

```bash
# From a local file
python scripts/openapi_to_mcp.py ./your-api-openapi.json > src/tools/your_api.py

# From a URL
python scripts/openapi_to_mcp.py https://your-api.com/openapi.json > src/tools/your_api.py
```

The script generates a `GENERATED_TOOLS` list and a `handle_generated_tool` stub — review and edit before using.

### Step 2 — Add auth

Copy the relevant pattern from [`docs/auth-patterns.md`](docs/auth-patterns.md) into your tool file.

```python
# src/tools/your_api.py
import os

BASE_URL = "https://api.your-company.com"

def auth_headers() -> dict:
    return {"X-API-Key": os.environ["YOUR_API_KEY"]}
```

### Step 3 — Implement the handlers

Each tool needs a handler that calls your API and returns shaped JSON:

```python
async def handle_your_api_tool(name: str, args: dict) -> dict:
    if name == "your_tool_name":
        async with httpx.AsyncClient() as client:
            res = await client.get(
                f"{BASE_URL}/endpoint",
                params={"q": args["param1"]},
                headers=auth_headers(),
            )
            res.raise_for_status()
            data = res.json()
        return {"content": [{"type": "text", "text": json.dumps(data, indent=2)}]}
    raise ValueError(f"Unknown tool: {name}")
```

### Step 4 — Register in server.py

```python
# src/server.py
from src.tools.your_api import YOUR_API_TOOLS, handle_your_api_tool

TOOL_GROUPS = [
    {"tools": YOUR_API_TOOLS, "handler": handle_your_api_tool},
]
```

### Step 5 — Install and run

```bash
pip install -e .
claude mcp add your-api python -- -m src.server
```

## Writing good tool descriptions

Claude uses your descriptions to decide when and how to call each tool. Invest time here.

```python
# ❌ Bad — too vague
"description": "Get data"

# ✅ Good — explains when to use it and what it returns
"description": "Search customer records by email or name. Returns account status, plan tier, and last login date. Use when the user asks about a specific customer."
```

## Tool design tips

- **One concern per tool.** Don't make a single tool that does 5 things.
- **Required vs optional.** Only mark params required if the API call will fail without them.
- **Output for LLMs.** Strip metadata, keep signal. Return flat JSON — not deeply nested objects.
- **Error messages.** Raise descriptive exceptions; Claude will surface them to the user.

## Project structure

```
src/
  server.py          MCP server entry — register tool groups here
  tools/
    weather.py       Working example (Open-Meteo API)
scripts/
  openapi_to_mcp.py  Generate tool stubs from OpenAPI spec
docs/
  auth-patterns.md   API key, Bearer, OAuth 2.0, Basic auth
```
