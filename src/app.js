const express = require("express");
const helmet = require("helmet");
const compression = require("compression");

const errorHandler = require("./middleware/errorHandler");
const apiRoutes = require("./routes/api.routes");

// Initialise Express application
const app = express();

// Security middleware
app.use(helmet());

// Enable response compression
app.use(compression());

// Enable JSON request handling
app.use(express.static("public"));

// Health ckeck point
app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "success",
        message: "KigaliPulse API is running!",
        timestamp: new Date().toISOString()
    });
});

// Check external API connectivity
app.get("/api/connection", async (req, res) => {
    try {
        const response = await fetch(
            "https://geocoding-api.open-meteo.com/v1/search?name=Kigali&count=1"
        );

        if (!response.ok) {
            throw new Error("Open-Meteo is unavailable");
        }

        res.status(200).json({
            status: "online",
            message: "External API is reachable"
        });

    } catch (error) {
        res.status(503).json({
            status: "offline",
            message: "External API is unreachable"
        });
    }
});

// API routes
app.use("/api", apiRoutes);

// Hnadle unknown routes
app.use((req, res, next) => {
    const error = new Error("Route not found");
    error.statusCode = 404;
    next(error);
})

// Centralized error handler
app.use(errorHandler);

module.exports = app;