export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.type === "ValidationError") {
    return res.status(400).json({
      error: "Validation Error",
      details: err.message,
    });
  }

  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
};

export const notFound = (req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: "The requested resource was not found",
  });
};
