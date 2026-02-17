/**
 * WhatsApp Worker
 * 
 * NOTE: Worker functionality is disabled (Redis not required).
 * All WhatsApp sends use direct calls from the API routes.
 * This file exists for backward compatibility with existing code.
 */

const Logger = require('../utils/logger');

// Worker is disabled - no Redis required
let whatsappWorker = null;

/**
 * Get worker instance
 * @returns {null} Always returns null (worker disabled)
 */
function getWorker() {
  return null;
}

/**
 * Initialize worker (no-op, worker disabled)
 * @returns {Promise<null>} Always returns null
 */
async function initializeWorker() {
  Logger.info('WhatsApp Worker: Worker disabled (Redis not required)');
  Logger.info('WhatsApp Worker: WhatsApp sending uses direct calls');
  return null;
}

/**
 * Check if worker is available
 * @returns {boolean} Always returns false
 */
function isAvailable() {
  return false;
}

// Log that worker is disabled
Logger.info('WhatsApp Worker: Worker module loaded (disabled - using direct calls)');

module.exports = {
  getWorker,
  initializeWorker,
  isAvailable
};
