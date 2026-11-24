// 1. Import required packages
const express = require("express");
const dotenv = require("dotenv");
const helmet = require("helmet");
const compression = require("compression");
const errorHandler = require("./middleware/errorHandler");
const apiRoutes = require("./routes/api.routes");

// 2. Load environment variables
dotenv.config();

// 3. Initialise Express application
const app = express();

// 4. Define server port
const PORT = process.env.PORT || 3000;

// 5. Security middleware
app.use(helmet());

// 6. Enable response compression
app.use(compression());

// 7. Enable JSON request handling
app.use(express.json());

// 8. Serve fronted static files
app.use(express.static("public"));

// 9. Create a basic test route
app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "sucess",
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
            throw new Error("Open-Meteo is unavaible");
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

app.use("/api", apiRoutes);

//Handle requests to routes that do not exist
app.use((req, res, next) => {
    const error = new Error("Route not found");
    error.statusCode = 404;
    next(error);
});

// Centralized error handler
app.use(errorHandler);

// 10. Start the server
app.listen(PORT, () => {
    console.log(`KigaliPulse running on http://localhost:${PORT}`);
});
