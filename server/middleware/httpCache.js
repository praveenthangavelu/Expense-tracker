// HTTP Cache-Control header helpers.
// These complement the in-memory cache layer — browsers and CDNs can also cache
// responses where appropriate, reducing round trips entirely.

// For sensitive endpoints (auth/me, mutations): prevent all caching.
export const noCache = (req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
};

// For mildly dynamic endpoints (summaries): allow private browser cache for 1 minute.
export const shortCache = (req, res, next) => {
  res.set("Cache-Control", "private, max-age=60");
  next();
};

// For near-static endpoints (categories): allow private browser cache for 5 minutes.
export const mediumCache = (req, res, next) => {
  res.set("Cache-Control", "private, max-age=300");
  next();
};
