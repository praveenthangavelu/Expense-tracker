// Structured request logger that captures method, path, status, duration, userId, and IP.
// Color-coded for quick visual scanning in development:
//   🟢 = success, 🟡 = client error or warning, 🔴 = server error, 🐌 = slow request (>1000ms)

export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // res.finish fires after the response headers and body have been flushed to the client.
  res.on("finish", () => {
    const duration = Date.now() - start;
    const log = {
      ts: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms: duration,
      user: req.user?.id || "anon",
      ip: req.ip,
    };

    const line = JSON.stringify(log);

    if (res.statusCode >= 500) {
      console.error("🔴", line);
    } else if (res.statusCode >= 400) {
      console.warn("🟡", line);
    } else if (duration > 1000) {
      console.warn("🐌", line); // slow but not an error
    } else {
      console.log("🟢", line);
    }
  });

  next();
};
