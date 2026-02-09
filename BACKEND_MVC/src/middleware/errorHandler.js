module.exports = (err, req, res, next) => {
  console.error("❌ Unhandled error:", err);
  res.status(err.statusCode || 500).json({
    status: "error",
    message: err.message || "Internal server error"
  });
};
