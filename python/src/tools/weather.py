"""
weather.py — MCP tools wrapping the Open-Meteo REST API

Open-Meteo is free, requires no API key, and is a clean example of
wrapping a JSON REST API with MCP tools.

ADAPT THIS FILE when building your own MCP server:
  1. Replace the tool definitions (name, description, inputSchema)
  2. Replace the httpx calls with calls to your API
  3. Replace the response shaping with your API's response format
  4. Add auth headers if needed (see docs/auth-patterns.md)
"""

import json
import httpx

# ─── Config ───────────────────────────────────────────────────────────────────
# Replace with your API's base URL and auth (see docs/auth-patterns.md)
BASE_URL = "https://api.open-meteo.com/v1"

# ─── Tool definitions ─────────────────────────────────────────────────────────
# These are what Claude sees. Write descriptions as if explaining to a person.

WEATHER_TOOLS = [
    {
        "name": "weather_get_current",
        "description": (
            "Get the current weather conditions for a geographic location. "
            "Returns temperature, wind speed, and weather code."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "latitude": {
                    "type": "number",
                    "description": "Latitude of the location (e.g. 51.5 for London)",
                },
                "longitude": {
                    "type": "number",
                    "description": "Longitude of the location (e.g. -0.12 for London)",
                },
                "temperature_unit": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "description": "Temperature unit (default: celsius)",
                },
            },
            "required": ["latitude", "longitude"],
        },
    },
    {
        "name": "weather_get_forecast",
        "description": (
            "Get a daily weather forecast for a location. "
            "Returns max/min temperature and precipitation sum for each day."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "latitude": {
                    "type": "number",
                    "description": "Latitude of the location",
                },
                "longitude": {
                    "type": "number",
                    "description": "Longitude of the location",
                },
                "days": {
                    "type": "number",
                    "description": "Number of forecast days (1–16, default: 7)",
                },
                "temperature_unit": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "description": "Temperature unit (default: celsius)",
                },
            },
            "required": ["latitude", "longitude"],
        },
    },
]

# ─── WMO weather code lookup ───────────────────────────────────────────────────
WMO_CODES: dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
    80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
    95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
}

# ─── Tool handlers ────────────────────────────────────────────────────────────

async def handle_weather_tool(name: str, args: dict) -> dict:
    if name == "weather_get_current":
        latitude = args["latitude"]
        longitude = args["longitude"]
        temperature_unit = args.get("temperature_unit", "celsius")

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current_weather": "true",
            "temperature_unit": temperature_unit,
        }

        async with httpx.AsyncClient() as client:
            res = await client.get(f"{BASE_URL}/forecast", params=params)
            res.raise_for_status()
            data = res.json()

        cw = data["current_weather"]
        unit_label = "°F" if temperature_unit == "fahrenheit" else "°C"
        output = {
            "time": cw["time"],
            "temperature": f"{cw['temperature']}{unit_label}",
            "windSpeed": f"{cw['windspeed']} km/h",
            "conditions": WMO_CODES.get(cw["weathercode"], f"Code {cw['weathercode']}"),
        }

        return {"content": [{"type": "text", "text": json.dumps(output, indent=2)}]}

    if name == "weather_get_forecast":
        latitude = args["latitude"]
        longitude = args["longitude"]
        days = min(int(args.get("days", 7)), 16)
        temperature_unit = args.get("temperature_unit", "celsius")

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode",
            "forecast_days": days,
            "temperature_unit": temperature_unit,
            "timezone": "auto",
        }

        async with httpx.AsyncClient() as client:
            res = await client.get(f"{BASE_URL}/forecast", params=params)
            res.raise_for_status()
            data = res.json()

        unit_label = "°F" if temperature_unit == "fahrenheit" else "°C"
        daily = data["daily"]
        forecast = [
            {
                "date": daily["time"][i],
                "high": f"{daily['temperature_2m_max'][i]}{unit_label}",
                "low": f"{daily['temperature_2m_min'][i]}{unit_label}",
                "precipitation": f"{daily['precipitation_sum'][i]} mm",
                "conditions": WMO_CODES.get(daily["weathercode"][i], f"Code {daily['weathercode'][i]}"),
            }
            for i in range(len(daily["time"]))
        ]

        return {"content": [{"type": "text", "text": json.dumps(forecast, indent=2)}]}

    raise ValueError(f"Unknown weather tool: {name}")
