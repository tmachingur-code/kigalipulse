const {
    getCache,
    setCache,
} = require("./cache.service");

// Open-Meteo API endpoints
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

const AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

// Reusable function for making API requests
async function fetchJson(url) {
    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            const error = new Error(
                `Open-Meteo API returned status ${response.status}`
            );

            error.statusCode = 502;
            throw error;
        }

        return await response.json();

    } catch (error) {
        if (error.name === "TimeoutError") {
            const timeoutError = new Error("The weather service took long to respond");
            timeoutError.statusCode = 504;
            throw timeoutError;
        }
        if (!error.statusCode) {
            error.statusCode = 502;
        }

        throw error;
    }
}

// Search for a city using its name
async function searchCity(city) {
    const cityName = city.trim();

    if (cityName.length < 2) {
        const error = new Error(
            "Please enter a city name with atleast 2 characters."
        );
        error.statusCode = 400;
        throw error;
    }

    const cacheKey = `geocoding:${cityName.toLowerCase()}`;

    const cachedData = getCache(cacheKey);

    if (cachedData !== undefined) {
        return cachedData;
    }

    const params = new URLSearchParams({
        name: cityName,
        count: "5",
        language: "en",
        format: "json"
    });

    const data = await fetchJson(`${GEOCODING_URL}?${params}`);

    setCache(cacheKey, data, 3600);

    return data;
}

// Fetch current weather and a 7-day forecast
async function getWeather(latitude, longitude) {
    const cacheKey = `weather:${latitude}:${longitude}`;

    const cachedData = getCache(cacheKey);

    if (cachedData !== undefined) {
        return cachedData;
    }

    const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "is_day",
            "precipitation",
            "weather_code",
            "wind_speed_10m"
        ].join(","),
        hourly: [
            "temperature_2m",
            "precipitation_probability",
            "relative_humidity_2m",
            "wind_speed_10m"
        ].join(","),
        daily: [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_probability_max",
            "sunrise",
            "sunset",
            "uv_index_max"
        ].join(","),
        forecast_days: "7",
        timezone: "auto"
    });

    const data = await fetchJson(`${WEATHER_URL}?${params}`);

    setCache(cacheKey, data, 600);

    return data;
}

// Fetch current air-quality measurements
async function getAirQuality(latitude, longitude) {
    const cacheKey = `air-quality:${latitude}:${longitude}`;

    const cachedData = getCache(cacheKey);

    if (cachedData !== undefined) {
        return cachedData;
    }

    const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: [
            "us_aqi",
            "european_aqi",
            "pm10",
            "pm2_5",
            "carbon_monoxide",
            "nitrogen_dioxide",
            "sulphur_dioxide",
            "ozone"
        ].join(","),
        timezone: "auto"
    });

    const data = await fetchJson(`${AIR_QUALITY_URL}?${params}`);

    setCache(cacheKey, data, 600);

    return data;
}

// Export functions for use in other files
module.exports = {
    searchCity,
    getWeather,
    getAirQuality
};