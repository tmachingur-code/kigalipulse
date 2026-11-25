const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const app = require("../src/app");

const server = app.listen(0);

const baseUrl = `http://127.0.0.1:${server.address().port}`;

function request(path) {
    return new Promise((resolve, reject) => {
        http.get(`${baseUrl}${path}`, (res) => {
            let body = "";

            res.on("data", chunck => body += chunck);
            res.on("end", () => {
                resolve({
                    status: res.statusCode,
                    data: JSON.parse(body)
                });
            });
        }).on("error", reject);
    });
}

test("GET /api/health returns HTTP 200", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(data.status, "success");
    assert.equal(data.message, "KigaliPulse API is running!");
    assert.ok(data.timestamp);
});

test("GET /api/city without a city name returns HTTP 400", async () => {
    const response= await fetch(`${baseUrl}/api/city`);
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.status, "error");
    assert.equal(data.message, "Please provide a city name.");
});

test("GET /api/weather without coordinates returns HTTP 400", async () => {
    const response = await fetch(`${baseUrl}/api/weather`);
    const data =await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.status, "error");
});

test("GET /api/weather with invalid latitude returns HTTP 400", async () => {
    const response = await fetch(`${baseUrl}/api/weather?latitude=100&longitude=30`);
    const data = await response.json();

    assert.equal(response.status,400);
    assert.equal(data.status, "error");
});

test("GET /api/air-quality without coordinates returns HTTP 400", async () => {
    const response = await fetch(`${baseUrl}/api/air-quality`);
    const data = await response.json();

    assert.equal(response.status, 400);
    assert.equal(data.status, "error");
});

test("GET /api/unknown returns HTTP 404", async () => {
    const response = await fetch(`${baseUrl}/api/unknown`);
    const data = await response.json();

    assert.equal(response.status, 404);
    assert.equal(data.status, "error");
});

test("GET /api/connection returns online when API is  reachable", async (t) => {
    t.mock.method(globalThis, "fetch", async () => ({
        ok: true,
    }));

    const response = await request("/api/connection");

    assert.equal(response.status, 200);
    assert.equal(response.data.status, "online");
});

test("GET /api/connection returns offline when API fails", async (t) => {
    t.mock.method(globalThis, "fetch", async () => {
        throw new Error("Network unavailable");
    });

    const response = await request("/api/connection");

    assert.equal(response.status, 503);
    assert.equal(response.data.status, "offline");
});

test("GET /api/city successfully searched for a city", async (t) => {
    const mockData = {
        results: [
            {
                id: 1,
                name: "Kigali",
                latitude: -1.9441,
                longitude: 30.0619,
                country: "Rwanda"
            }
        ]
    };

    t.mock.method(globalThis, "fetch", async (url) => {
        assert.ok(url.includes("geocoding-api.open-meteo.com"));

        return{
            ok: true,
            json: async () => mockData
        };
    });

    const response = await request("/api/city?name=Kigali");
    const data = response.data;

    assert.equal(response.status, 200);
    assert.equal(data.status, "success");
    assert.equal(data.data.results[0].name, "Kigali");
});

test("GET /api/weather successfully returns weather data", async (t) => {
    const mockData = {
        current: {
            temperature_2m: 25,
            relative_humidity_2m: 65,
            wind_speed_10m: 12
        }
    };

    t.mock.method(globalThis, "fetch", async (url) => {
        assert.ok(url.includes("api.open-meteo.com/v1/forecast"));

        return {
            ok: true,
            json: async () => mockData
        };
    });

    const response = await request(
        "/api/weather?latitude=1.234567&longitude=30.765432"
    );

    const data = response.data;

    assert.equal(response.status, 200);
    assert.equal(data.status, "success");
    assert.equal(data.data.current.temperature_2m, 25);
});

test("GET /api/air-quality successfully returns air-quality data", async (t) =>{
    const mockData = {
        current: {
            us_aqi: 35,
            pm2_5: 8.2,
            pm10: 12.5
        }
    };

    t.mock.method(globalThis, "fetch", async (url) => {
        assert.ok(url.includes("air-quality-api.open-meteo.com"));

        return {
            ok: true,
            json: async () => mockData
        };
    });

    const response = await request(
        "/api/air-quality?latitude=2.34567&longitude=31.876543"
    );

    const data = response.data;

    assert.equal(response.status, 200);
    assert.equal(data.status, "success");
    assert.equal(data.data.current.us_aqi, 35);
});

test("GET /api/weather with invalid longitude returns HTTP 400", async () => {
    const response = await request(
        "/api/weather?latitude=-1.9&longitude=200"
    );

    assert.equal(response.status,400);
    assert.equal(response.data.status, "error");
});

test("GET /api/city with one-character name returns HTTP 400", async () => {
    const response = await request("/api/city?name=K");

    assert.equal(response.status, 400);
    assert.equal(response.data.status, "error");
});

test("Weather API failure returns HTTP 502", async (t) => {
    t.mock.method(globalThis, "fetch", async () => ({
        ok: false,
        status: 503
    }));

    const response = await request(
        "/api/weather?latitude=10.123&longitude=35.456"
    );

    assert.equal(response.status, 502);
    assert.equal(response.data.status, "error");
});

test("Weather API timeout returns HTTP 504", async (t) => {
    t.mock.method(globalThis, "fetch", async () => {
        const error = new  Error("Request timed out");
        error.name = "TimeoutError";
        throw error;
    });

    const response = await request(
        "/api/weather?latitude=11.123&longitude=36.456"
    );

    assert.equal(response.status, 504);
    assert.equal(response.data.status, "error");
});

test("Repeated city search searches use cached data", async (t) => {
    let calls = 0;

    t.mock.method(globalThis, "fetch", async () => {
        calls++;

        return {
            ok: true,
            json: async () => ({
                results: [{ name: "Cacheville"}]
            })
        };
    });

    await request("/api/city?name=Cacheville");
    await request("/api/city?name=Cacheville");

    assert.equal(calls, 1);
});

test("GET /api/locations without query returns HTTP 400", async () => {
    const response = await request("/api/locations");

    assert.equal(response.status, 400);
    assert.equal(response.data.status, "error");
});

test("GET /api/locations with one character returns HTTP 400", async () => {
    process.env.AHANTU_API_KEY = "test-key";

    const response = await request("/api/locations?q=k");

    assert.equal(response.status, 400);
    assert.equal(response.data.status, "error");
});

test("GET /api/locations returns Kigali locations only", async (t) => {
    process.env.AHANTU_API_KEY = "test-key";

    t.mock.method(globalThis, "fetch", async (url, options) => {
        assert.ok(url.includes("api.ahantu.rw"));
        assert.equal(options.headers.Authorization, "Bearer test-key");

        return {
            ok: true,
            json: async () => ({
                results: [
                    {
                        match: "Kimihurura",
                        type: "neighborhood",
                        precise: false,
                        lat: -1.955,
                        lng: 30.082,
                        province: { name: "City of Kigali"},
                        district: { name: "Gasabo"},
                        sector: { name: "Kimihurura"}
                    },
                    {
                        match: "Kimihurura Office",
                        type: "local_government_office",
                        precise: true,
                        lat: -1.956,
                        lng: 30.097,
                        province: { name: "City of Kigali"}
                    },
                    {
                        match: "Another Kimihurura",
                        lat: -1.5,
                        lng: 30.5,
                        province: { name: "Eastern Province"}
                    }
                ]
            })
        };
    });

    const response = await request("/api/locations?q=Kimihurura");
    const results = response.data.data.results;

    assert.equal(response.status, 200);
    assert.equal(results.length, 2);
    assert.equal(results[0].name, "Kimihurura");
    assert.equal(results[0].district, "Gasabo");
    assert.equal(results[0].latitude, -1.955);
});

test("Ahantu API failure returns HTTP 502", async (t) => {
    process.env.AHANTU_API_KEY = "test-key";

    t.mock.method(globalThis, "fetch", async () => ({
        ok: false,
        status: 503
    }));

    const response = await request("/api/locations?q=FailureTest");

    assert.equal(response.status, 502);
    assert.equal(response.data.status, "error");
});

test("Ahantu API timeout returns HTTP 504", async (t) => {
    process.env.AHANTU_API_KEY = "test-key";

    t.mock.method(globalThis, "fetch", async () => {
        const error = new Error("Request timed out");
        error.name = "TimeoutError";
        throw error;
    });

    const response = await request("/api/locations?q=TimeoutTest");

    assert.equal(response.status, 504);
    assert.equal(response.data.status, "error");
});

test("Repeated Ahantu searches use cached data", async (t) => {
    process.env.AHANTU_API_KEY = "test-key";

    let calls = 0;

    t.mock.method(globalThis, "fetch", async () => {
        calls++;

        return{
            ok: true,
            json: async () => ({
                results: [{
                    math: "CacheTestKigali",
                    type: "neighborhood",
                    lat: -1.95,
                    lng: 30.08,
                    province: { name: "City of Kigali" }
                }]
            })
        };
    });

    await request("/api/locations?q=CacheTestKigali");
    await request("/api/locations?q=CacheTestKigali");

    assert.equal(calls, 1);
});

test("Close test server", async () =>{
    await new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) reject(error);
            else resolve();
        });
    });
});

