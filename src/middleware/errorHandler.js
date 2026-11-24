function errorHandler(err, req, res, next) {
    console.error("Application error:", err.message);

    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        status: "error",
        message: statusCode === 500 ? "An unexpected server error occured." : err.message
    });
}

module.exports = errorHandler;