/**
 * WhatsApp Queue Service
 * 
 * NOTE: Redis/Queue functionality is disabled.
 * All WhatsApp sends use direct calls (synchronous).
 * This file exists for backward compatibility with existing code.
 */

/**
 * Check if queue is available
 * @returns {Promise<boolean>} Always returns false (queue disabled)
 */
async function isAvailable() {
  return false;
}

/**
 * Add WhatsApp send job to queue
 * @param {Object} jobData - Job data
 * @returns {Promise<null>} Always returns null (queue disabled, use direct calls)
 */
async function addWhatsAppJob(jobData) {
  // Queue is disabled - return null to trigger fallback to direct calls
  return null;
}

/**
 * Get job status
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Always returns not available
 */
async function getJobStatus(jobId) {
  return { exists: false, error: 'Queue not available' };
}

/**
 * Get queue statistics
 * @returns {Promise<Object>} Always returns empty stats
 */
async function getQueueStats() {
  return {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    total: 0,
    error: 'Queue not available'
  };
}

module.exports = {
  get whatsappQueue() {
    return null;
  },
  addWhatsAppJob,
  getJobStatus,
  getQueueStats,
  isAvailable,
  get redisClient() {
    return null;
  }
};
