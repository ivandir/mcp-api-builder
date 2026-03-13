# mcp-api-builder

Template for building MCP servers that wrap REST APIs. Includes a working Open-Meteo weather example and an OpenAPI → MCP tool generator.

Two implementations, same pattern:

| | TypeScript | Python |
| --- | --- | --- |
| Directory | [`typescript/`](typescript/) | [`python/`](python/) |
| Runtime | Node.js ≥18 | Python ≥3.10 |
| MCP SDK | `@modelcontextprotocol/sdk` | `mcp[cli]` |

## What's inside

- Working example wrapping the [Open-Meteo](https://open-meteo.com) weather API (free, no key)
- `openapi-to-mcp` script — generate tool stubs from any OpenAPI 3.x spec
- Auth pattern reference — API key, Bearer, OAuth 2.0, Basic

See the implementation README for install + usage:

- [typescript/README.md](typescript/README.md)
- [python/README.md](python/README.md)
