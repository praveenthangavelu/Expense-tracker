// asyncHandler wraps async route controllers and sends any thrown error to Express.
// This keeps controllers focused on business logic instead of repeating try-catch blocks.

/*
BEFORE: every async controller needs its own try-catch.

const getTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id });
    res.json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
};

AFTER: asyncHandler catches rejected promises for us.

const getTransactions = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find({ user: req.user._id });
  res.json({ success: true, data: transactions });
});
*/

// The wrapper takes an async controller function as input.
const asyncHandler = (fn) => {
  // It returns a normal Express middleware function.
  return (req, res, next) => {
    // Promise.resolve turns the controller result into a promise.
    // If the promise rejects or the async function throws, .catch(next) passes the error forward.
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Export the helper so route files can wrap async controllers with it.
export default asyncHandler;
