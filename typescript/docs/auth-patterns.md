# Auth Patterns for MCP Servers

Copy-paste patterns for the most common REST API auth schemes.
Add your credentials to `.env` and load them in `src/tools/your-api.ts`.

---

## API Key (header)

```typescript
// .env
// MY_API_KEY=sk-...

const headers = () => ({
  "X-API-Key": process.env.MY_API_KEY ?? (() => { throw new Error("MY_API_KEY not set"); })(),
  "Content-Type": "application/json",
});

const res = await fetch(`${BASE_URL}/endpoint`, { headers: headers() });
```

## Bearer Token

```typescript
// .env
// MY_API_TOKEN=eyJ...

const headers = () => ({
  Authorization: `Bearer ${process.env.MY_API_TOKEN ?? (() => { throw new Error("MY_API_TOKEN not set"); })()}`,
  "Content-Type": "application/json",
});
```

## Basic Auth

```typescript
// .env
// MY_API_USER=user
// MY_API_PASS=pass

const headers = () => {
  const creds = Buffer.from(`${process.env.MY_API_USER}:${process.env.MY_API_PASS}`).toString("base64");
  return { Authorization: `Basic ${creds}` };
};
```

## OAuth 2.0 Client Credentials (machine-to-machine)

```typescript
// .env
// OAUTH_CLIENT_ID=...
// OAUTH_CLIENT_SECRET=...
// OAUTH_TOKEN_URL=https://auth.example.com/oauth/token

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 30_000) {
    return cachedToken.token;
  }

  const res = await fetch(process.env.OAUTH_TOKEN_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.OAUTH_CLIENT_ID!,
      client_secret: process.env.OAUTH_CLIENT_SECRET!,
    }),
  });

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.token;
}

// Usage in tool handler:
const token = await getAccessToken();
const headers = { Authorization: `Bearer ${token}` };
```

## Loading .env in development

Add `dotenv` as a dev dependency and load it at the top of `src/index.ts`:

```bash
npm install --save-dev dotenv
```

```typescript
// src/index.ts (dev only — remove for production)
import { config } from "dotenv";
config();
```

In production, inject env vars via your process manager, Docker, or the MCP host config.
