"use strict";

// ==================================
// KIGALIPULSE FRONTEND APPLICATION
// ==================================

// Default location: Kigali, Rwanda
const DEFAULT_CITY = "Kigali";

let weatherData = null;
let airQualityData = null;
let selectedCity = null;
let hourlyData = [];

// Get HTML elements
const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const searchResults = document.getElementById("search-results");

const locationName = document.getElementById("location-name");
const locationDetails = document.getElementById("location-details");
const lastUpdated = document.getElementById("last-updated");

const currentWeather = document.getElementById("current-weather");
const airQualityCard = document.getElementById("air-quality-card");
const forecastContainer = document.getElementById("forecast-container");
const hourlyContainer = document.getElementById("hourly-container");

const hourlySort = document.getElementById("hourly-sort");
const chartMetric = document.getElementById("chart-metric");
const insightsContainer = document.getElementById("insights-container");
const serverStatus = document.getElementById("server-status");

const connectionStatus = document.getElementById("connection-status");
const connectionIndicator = document.getElementById("connection-indicator");
const connectionLabel = document.getElementById("connection-label");


// =============================
// 1. OFFLINE CACHE SYSTEM
// =============================

const cachedRequests = new Set();

let isMonitoring = false;
let isRefreshing = false;
let externalApiOnline = null;

//Save API responses in browser storage
function saveToCache(key, data) {
    try {
        const cacheEntry = {
            data: data,
            savedAt: new Date().toISOString()
        };

        localStorage.setItem(
            `kigalipulse_${key}`,
            JSON.stringify(cacheEntry)
        );

    } catch (error) {
        console.warn("Unable to save cache:", error);
    }
}

//Retrieve previously saved API responses
function getFromCache(key) {
    try {
        const cached = localStorage.getItem(
            `kigalipulse_${key}`
        );

        return cached ? JSON.parse(cached) : null;

    } catch (error) {
        console.warn("Unable to read cache:", error);
        return null;
    }
}

//Update the connection indicator
function updateConnectionStatus() {
    const usingCache= cachedRequests.size > 0;
    
    if (externalApiOnline === false || usingCache) {
        connectionLabel.textContent = "Offline - Cached Data";
        connectionIndicator.style.background = "#f59e0b";

    } else if (externalApiOnline === true && !usingCache) {
        connectionLabel.textContent = "Live Data";
        connectionIndicator.style.background = "#34d399";
    } else {
        connectionLabel.textContent = "Checking connection...";
    }
}
    
//Fetch data with offline fallback
async function fetchAPI(url) {
    const cacheKey = url;

    try {
        const response = await fetch(url, {
            cache: "no-store"
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Request failed");
        }

        saveToCache(cacheKey, result.data);

        // This particular request is using cached data
        cachedRequests.delete(cacheKey);
        updateConnectionStatus();

        return result.data;

    } catch (error) {
        const cachedEntry = getFromCache(cacheKey);

        if (cachedEntry) {
            // This particulr request is using cached data.
            cachedRequests.add(cacheKey);

            console.warn("Using cached data:", url);

            return cachedEntry.data;
        }

        updateConnectionStatus();

        throw error;
    }
}

// Automate the frontend connection check
async function monitorConnection() {
    //Prevent another check from starting before this one finishes.
    if (isMonitoring) return;

    isMonitoring =true;

    try {
        const response = await fetch("/api/connection", {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("External API unavailable");
        }

        const result = await response.json();
        const wasOffline = externalApiOnline === false;

        externalApiOnline = result.status === "online";

        //Refresh the selected city only when connectivity returns.
        if (wasOffline && externalApiOnline && selectedCity && !isRefreshing) {
            isRefreshing = true;

            try {
                await loadCity(selectedCity);
            } finally {
                isRefreshing = false;
            }
        }

    } catch (error) {
        externalApiOnline = false;
        console.warn("Open-Meteo is unavailable:", error.message);
    } finally {
        updateConnectionStatus();
        isMonitoring=false;
    }
}

// =================================
// 2. SEARCH FOR A CITY
// =================================

async function searchForCity(city) {
    searchResults.textContent = "Searching...";

    try {
        const data = await fetchAPI(`/api/city?name=${encodeURIComponent(city)}`);

        if (!data.results || data.results.length === 0) {
            searchResults.textContent = "No matching cities found.";
            return;
        }

        searchResults.innerHTML = "";
        data.results.forEach((place) => {
            const button = document.createElement("button");

            button.className = "city-result";

            button.textContent = `${place.name}, ${place.admin1 || place.country}`;

            button.addEventListener("click", () => {
                searchResults.innerHTML = "";
                loadCity(place);
            });

            searchResults.appendChild(button);
        });
    } catch (error) {
        searchResults.textContent = error.message;
    }
}

// =====================================
// 3. LOAD CITY WEATHER AND AIR QUALITY
// ======================================

async function loadCity(city) {
    selectedCity = city;

    locationName.textContent = city.name;

    locationDetails.textContent = `${city.country || ""} ${city.timezone || "Local time"}`;

    currentWeather.textContent = "Loading weather...";
    airQualityCard.textContent = "Loading air quality...";
    forecastContainer.textContent = "Loading forecast...";
    hourlyContainer.textContent = "Loading hourly forecast...";
    insightsContainer.textContent = "Preparing insights...";

    const coordinates =
        `latitude=${encodeURIComponent(city.latitude)}` +
        `&longitude=${encodeURIComponent(city.longitude)}`;


    // Fetch weather and air quality independently
    const results = await Promise.allSettled([
        fetchAPI(`/api/weather?${coordinates}`),
        fetchAPI(`/api/air-quality?${coordinates}`)
    ]);

    if (results[0].status === "fulfilled") {
        weatherData = results[0].value;

        renderCurrentWeather();
        renderForecast();
        renderHourlyForecast();
        drawWeatherChart();
    } else {
        weatherData = null;

        currentWeather.textContent = `Weather unavailable: ${results[0].reason.message}`;

        forecastContainer.textContent = "Forecast unavailable.";
        hourlyContainer.textContent = "Hourly forecast unavailable.";
    }

    if (results[1].status === "fulfilled") {
        airQualityData = results[1].value;
        renderAirQuality();
    } else {
        airQualityData = null;

        airQualityCard.textContent = "Air-quality information is currently unavailable.";
    }

    renderInsights();

    lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
}

// ===============================
// 4. CURRENT WEATHER
// ===============================

function getWeatherDescription(code) {
    const descriptions = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        71: "Slight snow",
        73: "Moderate snow",
        75: "Heavy snow",
        80: "Rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        95: "Thunderstorm",
        96: "Thunderstorm with hail",
        99: "Thunderstorm with heavy hail"
    };

    return descriptions[code] || "Weather conditions unavailable";
}

function getWeatherIcon(code) {
    const icons = {
        0: "☀️",
        1: "🌤️",
        2: "⛅",
        3: "☁️",
        45: "🌫️",
        48: "🌫️",
        51: "🌦️",
        53: "🌦️",
        55: "🌧️",
        61: "🌧️",
        63: "🌧️",
        65: "🌧️",
        71: "🌨️",
        73: "❄️",
        75: "❄️",
        80: "🌦️",
        81: "🌧️",
        82: "⛈️",
        95: "⛈️",
        96: "⛈️",
        99: "⛈️"
    };

    return icons[code] || "🌤️";
}

function renderCurrentWeather() {
    const current = weatherData.current;

    currentWeather.innerHTML = `
    
    <div class="current-weather-content">
        <div class="weather-visual">
            <span class="weather-icon">
                ${getWeatherIcon(current.weather_code)}
            </span>

            <div>
                <h3>${getWeatherDescription(current.weather_code)}</h3>
                <p>Current conditions</p>
            </div>
        </div>

        <h1>${current.temperature_2m}°C</h1>

        <P>Feels like ${current.apparent_temperature}°C</P>

        <div class="weather-details">
            <p>💧 Humidity: ${current.relative_humidity_2m}%</p>
            <p>💨 Wind: ${current.wind_speed_10m} km/h</p>
            <p>🌧️ Precipitation: ${current.precipitation} mm</p>
        </div>
    </div>
    `;
}

// ==================================
// 5. AIR QUALITY
// ==================================

function getAQICategory(aqi) {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Unhealthy for sensitive groups";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very unhealthy";
    return "Hazardous";
}

function getAQIColor(aqi) {
    if (aqi <= 50) return "#22c55e";
    if (aqi <= 100) return "#eab308";
    if (aqi <= 150) return "#f97316";
    if (aqi <= 200) return "#ef4444";
    if (aqi <= 300) return "#a855f7";
    return "#7f1d1d";
}

function renderAirQuality() {
    const current = airQualityData.current;
    const aqi = current.us_aqi;
    const category = getAQICategory(aqi);
    const color = getAQIColor(aqi);

    airQualityCard.innerHTML = ` 
        <div class="aqi-main">
            <span class="aqi-label">US Air Quality Index</span>
            <h2 style="color: ${color}">
                ${aqi} 
            </h2>
            <span class="aqi-category" style="background: ${color}">
                ${category}
            </span>

            <p>Current air quality</p>
        </div>

        <div class="aqi-pollutant">
            <span>PM2.5</span>
            <h2>${current.pm2_5}</h2>
            <p>μg/m³</p>
        </div>

        <div class="aqi-pollutant">
            <span>PM10</span>
            <h2>${current.pm10}</h2>
            <p>μg/m³</p>
        </div> 
    `;
}

// ============================
// 6. SEVEN-DAY FORECAST
// ============================

function renderForecast() {
    const daily = weatherData.daily;

    forecastContainer.innerHTML = "";

    daily.time.forEach((date, index) => {
        const day = document.createElement("div");

        day.className = "forecast-day";

        day.innerHTML = `
            <h4>${new Date(date + "T12:00:00").toLocaleDateString(
                "en-US",
                {weekday: "short"}
            )}</h4>

            <div class="forecast-icon">
                ${getWeatherIcon(daily.weather_code[index])}
            </div>

            <p>${getWeatherDescription(daily.weather_code[index])}</p>

            <h3>${daily.temperature_2m_max[index]}°C</h3>

            <p>Low: ${daily.temperature_2m_min[index]}°C</p>

            <p class="forecast-rain">
                💧 ${daily.precipitation_probability_max[index]}% rain
            </p>
        `;
        
        forecastContainer.appendChild(day);
    });
}

// ================================
// 7. HOURLY FORECAST AND SORTING
// ================================

function renderHourlyForecast() {
    const hourly = weatherData.hourly;

    hourlyData = hourly.time.slice(0,24).map((time, index) => ({
        time,
        temperature: hourly.temperature_2m[index],
        precipitation: hourly.precipitation_probability[index],
        humidity: hourly.relative_humidity_2m[index],
        wind: hourly.wind_speed_10m[index],
        weatherCode: hourly.weather_code?.[index] ?? 0
    }));

    sortHourlyForecast();
}

function sortHourlyForecast() {
    const sorted = [...hourlyData];

    const sortBy = hourlySort.value;

    if (sortBy === "temperature") {
        sorted.sort((a, b) => b.temperature - a.temperature);
    }

    if (sortBy === "precipitation") {
        sorted.sort((a, b) => b.precipitation - a.precipitation);
    }

    if (sortBy == "time") {
        sorted.sort((a, b) => a.time.localeCompare(b.time));
    }

    hourlyContainer.innerHTML = `
        <table class="hourly-table">
            <thead>
                <tr>
                    <th>Time</th>
                    <th>Weather</th>
                    <th>Temperature</th>
                    <th>Rain chance</th>
                    <th>Humidity</th>
                    <th>Wind</th>
                </tr>
            </thead>
            
            <tbody>
                ${sorted.map((hour) => `
                    <tr>
                        <td>${new Date(hour.time).toLocaleTimeString (
                            "en-US",
                            { hour: "numeric"}

                        )} </td>
                        <td>
                            <span class="hourly-weather-icon">
                                ${getWeatherIcon(hour.weatherCode)}
                            </span>
                        </td>
                        <td>${hour.temperature}°C</td>
                        <td>${hour.precipitation}%</td>
                        <td>${hour.humidity}%</td>
                        <td>${hour.wind} km/h</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

// ============================
// 8. WEATHER CHART
// ============================

function drawWeatherChart() {
    const canvas = document.getElementById("weather-chart");

    if (!canvas || !weatherData) return;

    const context = canvas.getContext("2d");

    const metric = chartMetric.value;

    const values = weatherData.hourly[metric].slice(0, 24);

    const width = canvas.clientWidth || 600;
    const height = 260;

    const ratio = window.devicePixelRatio || 1;

    canvas.width = width * ratio;
    canvas.height = height * ratio;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    context.clearRect(0, 0, width, height);

    const padding = 40;

    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const range = maximum - minimum || 1;

    const points = values.map((value, index) => ({
        x: padding + (index / (values.length -1)) * (width - padding * 2),

        y: height - padding - ((value - minimum) / range) *(height - padding * 2)
    }));

    //Draw chart grid
    context.strokeStyle = "rgba(148, 163, 184, 0.15)";
    context.lineWidth = 1;

    for (let i =0; i <5; i++) {
        const y = padding + i * ((height - padding * 2) /4);

        context.beginPath();
        context.moveTo(padding, y);
        context.lineTo(width - padding, y);
        context.stroke();
    }

    //Draw chart line
    context.beginPath();

    points.forEach((point, index) => {
        if (index === 0) {
            context.moveTo(point.x, point.y);
        } else {
            context.lineTo(point.x, point.y);
        }
    });

    context.strokeStyle = "#38bdf8";
    context.lineWidth = 3;
    context.stroke();

    // Draw data points 
    points.forEach((point) => {
        context.beginPath();
        context.arc(point.x, point.y, 3, 0, Math.PI * 2);
        context.fillStyle = "#818cf8";
        context.fill();
    });

    context.fillStyle = "#94a3b8";
    context.font = "11px Arial";

    context.fillText(maximum.toFixed(1), 5, padding);
    context.fillText(minimum.toFixed(1), 5, height - padding);
}

// ==================================
// 9. ENVIRONMENTAL INSIGHTS
// ==================================

function renderInsights() {
    const insights = [];

    if (weatherData) {
        const current = weatherData.current;

        if (current.precipitation > 0) {
            insights.push({
                icon: "🌧️",
                title: "Rain detected",
                message: "Consider carrying an umbrella when going outdoors."
            });
        }

        if (current.wind_speed_10m > 25) {
            insights.push({
                icon: "💨",
                title: "Strong winds",
                message: "Take care when outdoors because wind speeds are elevated."
            });
        }

        if (current.temperature_2m >= 30) {
            insights.push({
                icon: "☀️",
                title: "High temperature",
                message: "Stay hydrated and avoid prolonged exposure to heat."
            });
        }

    }
    if (airQualityData) {
        const aqi = airQualityData.current.us_aqi;

        if (aqi > 100) {
            insights.push({
            icon: "😷",
            title: "Elevated air pollution",
            message: "Sensitive individuals should consider limiting prelonged outdoor activity."
            });

        } else {
            insights.push({
                icon: "🌿",
                title: "Air quality",
                message: "Current US AQI is within the good-to-moderate range."
            });
        }
    }

    if (insights.length ===0) {
        insightsContainer.textContent = "No environmental information is currently available.";
        return;
    }

    insightsContainer.innerHTML = `
        <div class="insights-grid">
            ${insights.map(insight => `
                <div class="insight-card">
                    <span class="insight-icon">${insight.icon}</span>
                    <div>
                        <h3>${insight.title}</h3>
                        <p>${insight.message}</p>
                    </div>
                </div>
            `).join("")}
        </div>
    `; 
}

// ===================================
// 10. EVENT LISTENERS
// ===================================

searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const city = cityInput.value.trim();

    if (city.length < 2) {
        searchResults.textContent = "Please enter at least 2 characters.";

        return;
    }

    await searchForCity(city);
});

hourlySort.addEventListener("change", () => {
    if (weatherData) {
        sortHourlyForecast();
    }
});

chartMetric.addEventListener("change", () => {
    if (weatherData) {
        drawWeatherChart();
    }
});

window.addEventListener("resize", () => {
    if (weatherData) {
        drawWeatherChart();
    }
})

// =============================
// 11. SERVER HEALTH CHECK
// =============================

async function checkServer() {
    try {
        await fetchAPI("/api/health");

        serverStatus.textContent = "Server connection: Online";
    } catch (error) {
        serverStatus.textContent = "Server connection: Offline";
    }
}

// =============================
// 12. START APPLICATION
// =============================

async function initializeApp() {
    await checkServer();

    try{
        const data = await fetchAPI(
            `/api/city?name=${DEFAULT_CITY}`
        );

        const kigali = data.results.find(
            (place) => place.feature_code === "PPLC"
        ) || data.results[0];

        if (!kigali) {
            throw new Error("Kigali could not be found.");
        }

        await loadCity(kigali);

    } catch (error) {
        locationName.textContent = "Unable to load Kigali";
        locationDetails.textContent = error.message;
    }
}

// Monitor internet connection changes
window.addEventListener("offline", () => {
    updateConnectionStatus();
});

window.addEventListener("online", async () => {
    if (selectedCity) {
        await loadCity(selectedCity);
    } else {
        updateConnectionStatus();
    }
});

updateConnectionStatus();
initializeApp();

monitorConnection();
setInterval(monitorConnection, 5000);