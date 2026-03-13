# mcp-api-builder

A template and working example for building MCP servers that wrap REST APIs.

Every company has internal APIs that aren't covered by community MCPs. This repo teaches the pattern once so you can wrap any API in under 30 minutes.

## What's included

| File | What it is |
| --- | --- |
| `src/index.ts` | MCP server entry — wire together tool groups here |
| `src/tools/weather.ts` | **Working example** wrapping the Open-Meteo weather API (free, no key) |
| `scripts/openapi-to-mcp.ts` | Generate MCP tool stubs from any OpenAPI 3.x spec |
| `docs/auth-patterns.md` | Copy-paste auth patterns: API key, Bearer, OAuth 2.0, Basic |

## Quickstart — run the example

The example wraps [Open-Meteo](https://open-meteo.com) — free, no API key needed.

```bash
npm install
npm run build
node dist/index.js
```

Add to Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/path/to/mcp-api-builder/dist/index.js"]
    }
  }
}
```

Or with Claude Code CLI:

```bash
claude mcp add weather node /path/to/mcp-api-builder/dist/index.js
```

Then ask Claude: _"What's the weather in London?"_

## Build your own MCP server in 30 minutes

### Step 1 — Generate tool stubs from your OpenAPI spec

```bash
# From a local file
npx tsx scripts/openapi-to-mcp.ts ./your-api-openapi.json > src/tools/your-api.ts

# From a URL
npx tsx scripts/openapi-to-mcp.ts https://your-api.com/openapi.json > src/tools/your-api.ts
```

The script generates a `generatedTools` array and a `handleGeneratedTool` stub — review and edit before using.

### Step 2 — Add auth

Copy the relevant pattern from [`docs/auth-patterns.md`](docs/auth-patterns.md) into your tool file.

```typescript
// src/tools/your-api.ts
const BASE_URL = "https://api.your-company.com";

const headers = () => ({
  "X-API-Key": process.env.YOUR_API_KEY!,
  "Content-Type": "application/json",
});
```

### Step 3 — Implement the handlers

Each tool needs a handler that calls your API and returns shaped JSON:

```typescript
export async function handleYourApiTool(
  name: string,
  args: Record<string, unknown>
) {
  if (name === "your_tool_name") {
    const { param1, param2 } = args as { param1: string; param2: string };
    const res = await fetch(`${BASE_URL}/endpoint?q=${param1}`, { headers: headers() });
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
  throw new Error(`Unknown tool: ${name}`);
}
```

### Step 4 — Register in index.ts

```typescript
// src/index.ts
import { yourApiTools, handleYourApiTool } from "./tools/your-api.js";

const toolGroups = [
  { tools: yourApiTools, handler: handleYourApiTool },
];
```

### Step 5 — Build and install

```bash
npm run build
claude mcp add your-api node /path/to/dist/index.js
```

## Writing good tool descriptions

Claude uses your descriptions to decide when and how to call each tool. Invest time here.

```typescript
// ❌ Bad — too vague
description: "Get data"

// ✅ Good — explains when to use it and what it returns
description: "Search customer records by email or name. Returns account status, plan tier, and last login date. Use when the user asks about a specific customer."
```

## Tool design tips

- **One concern per tool.** Don't make a single tool that does 5 things.
- **Required vs optional.** Only mark params required if the API call will fail without them.
- **Output for LLMs.** Strip metadata, keep signal. Return flat JSON — not deeply nested objects.
- **Error messages.** Throw descriptive errors; Claude will surface them to the user.

## Development

```bash
npm run dev       # run with tsx (no build step, good for iteration)
npm run build     # compile to dist/
npm run typecheck # type-check without emitting
```

## Project structure

```
src/
  index.ts          MCP server entry — register tool groups here
  tools/
    weather.ts      Working example (Open-Meteo API)
scripts/
  openapi-to-mcp.ts Generate tool stubs from OpenAPI spec
docs/
  auth-patterns.md  API key, Bearer, OAuth 2.0, Basic auth
```
