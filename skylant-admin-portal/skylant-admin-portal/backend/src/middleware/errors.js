function notFound(req, res) {
  res.status(404).json({ success: false, message: "Route not found", error: "NOT_FOUND" });
}

function errorHandler(error, req, res, next) {
  console.error(error);
  const status = error.status || (error.name === "ValidationError" ? 400 : 500);
  res.status(status).json({ success: false, message: status === 500 ? "Internal server error" : error.message, error: error.code || "SERVER_ERROR" });
}

module.exports = { notFound, errorHandler };
