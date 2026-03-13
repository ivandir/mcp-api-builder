# Auth Patterns for MCP Servers (Python)

Copy-paste patterns for the most common REST API auth schemes.
Add your credentials to `.env` and load them in `src/tools/your_api.py`.

---

## API Key (header)

```python
# .env
# MY_API_KEY=sk-...

import os

def auth_headers() -> dict:
    key = os.environ.get("MY_API_KEY")
    if not key:
        raise RuntimeError("MY_API_KEY not set")
    return {"X-API-Key": key, "Content-Type": "application/json"}

async with httpx.AsyncClient() as client:
    res = await client.get(f"{BASE_URL}/endpoint", headers=auth_headers())
```

## Bearer Token

```python
# .env
# MY_API_TOKEN=eyJ...

import os

def auth_headers() -> dict:
    token = os.environ.get("MY_API_TOKEN")
    if not token:
        raise RuntimeError("MY_API_TOKEN not set")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
```

## Basic Auth

```python
# .env
# MY_API_USER=user
# MY_API_PASS=pass

import os
import httpx

auth = httpx.BasicAuth(
    username=os.environ["MY_API_USER"],
    password=os.environ["MY_API_PASS"],
)

async with httpx.AsyncClient(auth=auth) as client:
    res = await client.get(f"{BASE_URL}/endpoint")
```

## OAuth 2.0 Client Credentials (machine-to-machine)

```python
# .env
# OAUTH_CLIENT_ID=...
# OAUTH_CLIENT_SECRET=...
# OAUTH_TOKEN_URL=https://auth.example.com/oauth/token

import os
import time
import httpx

_cached_token: dict | None = None

async def get_access_token() -> str:
    global _cached_token
    if _cached_token and time.time() < _cached_token["expires_at"] - 30:
        return _cached_token["token"]

    async with httpx.AsyncClient() as client:
        res = await client.post(
            os.environ["OAUTH_TOKEN_URL"],
            data={
                "grant_type": "client_credentials",
                "client_id": os.environ["OAUTH_CLIENT_ID"],
                "client_secret": os.environ["OAUTH_CLIENT_SECRET"],
            },
        )
        res.raise_for_status()
        data = res.json()

    _cached_token = {
        "token": data["access_token"],
        "expires_at": time.time() + data["expires_in"],
    }
    return _cached_token["token"]

# Usage in tool handler:
token = await get_access_token()
headers = {"Authorization": f"Bearer {token}"}
```

## Loading .env in development

```bash
pip install python-dotenv
```

```python
# src/server.py (dev only — remove for production)
from dotenv import load_dotenv
load_dotenv()
```

In production, inject env vars via your process manager, Docker, or the MCP host config.
