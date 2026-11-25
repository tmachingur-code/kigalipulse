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

test("GET /api/connection returns a valid connectivity response", async () => {
    const response = await fetch(`${baseUrl}/api/connection`);
    const data = await response.json();

    assert.ok([200, 503].includes(response.status));
    assert.ok(["online", "offline"].includes(data.status));
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

test("Close test server", async () =>{
    await new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) reject(error);
            else resolve();
        });
    });
});

