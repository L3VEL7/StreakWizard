/**
 * StreakManager - Main entry point
 * 
 * This file now imports and re-exports the modular implementation
 * to maintain backward compatibility with the rest of the code.
 * 
 * The actual implementation has been moved to the modules/ directory
 * to improve code organization and reduce memory usage.
 */

// Import the modular implementation 
const streakManager = require('./modules');

// Re-export everything
module.exports = streakManager;