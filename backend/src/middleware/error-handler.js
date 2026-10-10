export function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode ?? 500;

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code ?? "INTERNAL_SERVER_ERROR",
      message:
        statusCode >= 500
          ? "An unexpected error occurred"
          : err.message,
    },
  });
}

/*

prevents unexpected internal error messages from leaking to clients in production.
Later, we'll introduce typed application errors and structured logging.

*/