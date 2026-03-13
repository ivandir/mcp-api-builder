/**
 * weather.ts — MCP tools wrapping the Open-Meteo REST API
 *
 * Open-Meteo is free, requires no API key, and is a clean example of
 * wrapping a JSON REST API with MCP tools.
 *
 * ADAPT THIS FILE when building your own MCP server:
 *   1. Replace the tool definitions (name, description, inputSchema)
 *   2. Replace the fetch calls with calls to your API
 *   3. Replace the response shaping with your API's response format
 *   4. Add auth headers if needed (see docs/auth-patterns.md)
 */

// ─── Config ──────────────────────────────────────────────────────────────────
// Replace with your API's base URL and auth (see docs/auth-patterns.md)
const BASE_URL = "https://api.open-meteo.com/v1";

// ─── Tool definitions ─────────────────────────────────────────────────────────
// These are what Claude sees. Write descriptions as if explaining to a person.

export const weatherTools = [
  {
    name: "weather_get_current",
    description:
      "Get the current weather conditions for a geographic location. Returns temperature, wind speed, and weather code.",
    inputSchema: {
      type: "object",
      properties: {
        latitude: {
          type: "number",
          description: "Latitude of the location (e.g. 51.5 for London)",
        },
        longitude: {
          type: "number",
          description: "Longitude of the location (e.g. -0.12 for London)",
        },
        temperature_unit: {
          type: "string",
          enum: ["celsius", "fahrenheit"],
          description: "Temperature unit (default: celsius)",
        },
      },
      required: ["latitude", "longitude"],
    },
  },
  {
    name: "weather_get_forecast",
    description:
      "Get a daily weather forecast for a location. Returns max/min temperature and precipitation sum for each day.",
    inputSchema: {
      type: "object",
      properties: {
        latitude: {
          type: "number",
          description: "Latitude of the location",
        },
        longitude: {
          type: "number",
          description: "Longitude of the location",
        },
        days: {
          type: "number",
          description: "Number of forecast days (1–16, default: 7)",
        },
        temperature_unit: {
          type: "string",
          enum: ["celsius", "fahrenheit"],
          description: "Temperature unit (default: celsius)",
        },
      },
      required: ["latitude", "longitude"],
    },
  },
];

// ─── WMO weather code lookup ──────────────────────────────────────────────────
const WMO_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog",
  51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
  61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
  80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
  95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
};

// ─── Tool handlers ────────────────────────────────────────────────────────────

export async function handleWeatherTool(
  name: string,
  args: Record<string, unknown>
) {
  if (name === "weather_get_current") {
    const { latitude, longitude, temperature_unit = "celsius" } = args as {
      latitude: number;
      longitude: number;
      temperature_unit?: string;
    };

    const url = new URL(`${BASE_URL}/forecast`);
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("current_weather", "true");
    url.searchParams.set("temperature_unit", temperature_unit);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as {
      current_weather: {
        temperature: number;
        windspeed: number;
        weathercode: number;
        time: string;
      };
    };

    const cw = data.current_weather;
    const output = {
      time: cw.time,
      temperature: `${cw.temperature}°${temperature_unit === "fahrenheit" ? "F" : "C"}`,
      windSpeed: `${cw.windspeed} km/h`,
      conditions: WMO_CODES[cw.weathercode] ?? `Code ${cw.weathercode}`,
    };

    return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }] };
  }

  if (name === "weather_get_forecast") {
    const { latitude, longitude, days = 7, temperature_unit = "celsius" } = args as {
      latitude: number;
      longitude: number;
      days?: number;
      temperature_unit?: string;
    };

    const url = new URL(`${BASE_URL}/forecast`);
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode");
    url.searchParams.set("forecast_days", String(Math.min(days, 16)));
    url.searchParams.set("temperature_unit", temperature_unit);
    url.searchParams.set("timezone", "auto");

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as {
      daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_sum: number[];
        weathercode: number[];
      };
    };

    const unit = temperature_unit === "fahrenheit" ? "°F" : "°C";
    const forecast = data.daily.time.map((date, i) => ({
      date,
      high: `${data.daily.temperature_2m_max[i]}${unit}`,
      low: `${data.daily.temperature_2m_min[i]}${unit}`,
      precipitation: `${data.daily.precipitation_sum[i]} mm`,
      conditions: WMO_CODES[data.daily.weathercode[i]] ?? `Code ${data.daily.weathercode[i]}`,
    }));

    return { content: [{ type: "text", text: JSON.stringify(forecast, null, 2) }] };
  }

  throw new Error(`Unknown weather tool: ${name}`);
}
