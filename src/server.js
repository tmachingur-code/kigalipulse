// 1. Import required packages
const dotenv = require("dotenv");

// 2. Load environment variables
dotenv.config();

// 3. Import Express application
const app = require("./app");

// 4. Define server port
const PORT = process.env.PORT || 3000;

// 5.  Start server
app.listen(PORT, () => {
    console.log(`KigaliPulse running on http://localhost:${PORT}`);
});
