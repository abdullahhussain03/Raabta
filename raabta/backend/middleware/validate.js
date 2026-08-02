const { validationResult } = require('express-validator');

// Run after an array of express-validator checks; short-circuits with 400
// and field-level messages if any check failed. Every mutating route in
// this app should have explicit validators in front of it — never trust
// client-side validation alone.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

module.exports = validate;
