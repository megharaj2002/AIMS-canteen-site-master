// Vercel Serverless Function Handler for Express App
// This file wraps the Express app to work with Vercel's serverless runtime

const app = require('../backend/server');

// Export the app for Vercel
// @vercel/node will automatically wrap this and handle request/response conversion
// The Express app's res.json(), res.send(), etc. will work correctly
// 
// Important: This MUST export the Express app directly (not a function)
// @vercel/node expects the default export to be an Express app instance
module.exports = app;

