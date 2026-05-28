/**
 * Custom NoSQL Injection Prevention Middleware for Express 5 compatibility.
 * 
 * Express 5 implements req.query as a read-only getter, which causes the legacy
 * express-mongo-sanitize package to throw TypeError. This middleware sanitizes
 * req.body, req.query, and req.params by mutating property values in-place
 * instead of reassigning the root objects.
 */

const hasDangerousChar = (key) => key.startsWith("$") || key.includes(".");

const sanitize = (obj) => {
  if (obj && typeof obj === "object") {
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (obj[i] && typeof obj[i] === "object") {
          sanitize(obj[i]);
        }
      }
    } else {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          if (hasDangerousChar(key)) {
            delete obj[key];
          } else if (obj[key] && typeof obj[key] === "object") {
            sanitize(obj[key]);
          }
        }
      }
    }
  }
  return obj;
};

export const mongoSanitize = (req, res, next) => {
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  next();
};

export default mongoSanitize;
