const express = require("express");

const {
    searchCity,
    getWeather,
    getAirQuality
} = require("../services/openMeteo.service");

const router = express.Router();

// Search for a city
router.get("/city", async (req, res) => {
    const { name } = req.query;

    if (!name || typeof name !== "string") {
        return res.status(400).json({
           status: "error",
           message: "Please provide a city name." 
        });
    }

    const data = await searchCity(name);

    res.status(200).json({
        status: "success",
        data
    });
});

// Validate latitude and longitude
function getCoordinates(req, res) {
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);
    
    if (
        req.query.latitude === undefined ||
        req.query.longitude === undefined ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        res.status(400).json({
            status: "error",
            message: "Please provide valid latitude and longitude."
        });

        return null;
    }

    return { latitude, longitude};
}

// Get weather forecast
router.get("/weather", async (req, res) => {
    const coordinates = getCoordinates(req, res);

    if (!coordinates) return;

    const data = await getWeather(
        coordinates.latitude,
        coordinates.longitude
    );

    res.status(200).json({
        status: "success",
        data
    });
});

// Get air-quality information 
router.get("/air-quality", async (req, res) => {
    const coordinates = getCoordinates(req, res);

    if (!coordinates) return;

    const data = await getAirQuality(
        coordinates.latitude,
        coordinates.longitude
    );

    res.status(200).json({
        status: "success",
        data
    });
});

module.exports = router;