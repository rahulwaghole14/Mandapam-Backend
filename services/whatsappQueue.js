const { Queue } = require('bullmq');
const Redis = require('ioredis');

// Redis connection configuration
// Use environment variable or default to localhost for development
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Disable retry limit for BullMQ
  enableReadyCheck: false,
  retryStrategy: (times) => {
    // Exponential backoff with max delay of 3 seconds
    const delay = Math.min(times * 50, 3000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true; // Reconnect on READONLY error
    }
    return false;
  }
};

// Lazy initialization - only create when needed
let redisClient = null;
let whatsappQueue = null;
let isRedisAvailable = false;
let initializationAttempted = false;

/**
 * Initialize Redis connection and queue (lazy loading)
 * @returns {Promise<boolean>} True if Redis is available, false otherwise
 */
async function initializeRedis() {
  if (initializationAttempted) {
    return isRedisAvailable;
  }

  initializationAttempted = true;

  try {
    // Test Redis connection first
    redisClient = new Redis(redisConnection);

    // Set up error handlers
    redisClient.on('error', (error) => {
      console.error('[WhatsApp Queue] Redis connection error:', error.message);
      isRedisAvailable = false;
    });

    redisClient.on('connect', () => {
      console.log('[WhatsApp Queue] ✅ Redis connected');
      isRedisAvailable = true;
    });

    redisClient.on('ready', () => {
      console.log('[WhatsApp Queue] ✅ Redis ready');
      isRedisAvailable = true;
    });

    redisClient.on('close', () => {
      console.warn('[WhatsApp Queue] ⚠️ Redis connection closed');
      isRedisAvailable = false;
    });

    // Test connection with a simple command
    await redisClient.ping();
    isRedisAvailable = true;

    // Create WhatsApp queue only if Redis is available
    whatsappQueue = new Queue('whatsapp-send', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 1, // NO RETRIES - single attempt only (async, can take as long as needed)
        // Removed backoff - no retries needed
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 100 // Keep last 100 completed jobs
        },
        removeOnFail: {
          age: 86400 // Keep failed jobs for 24 hours
        }
      }
    });

    console.log('[WhatsApp Queue] ✅ Queue initialized successfully');
    return true;
  } catch (error) {
    console.warn('[WhatsApp Queue] ⚠️ Redis not available:', error.message);
    console.warn('[WhatsApp Queue] ⚠️ WhatsApp sending will fall back to direct calls');
    isRedisAvailable = false;
    
    // Clean up failed connection
    if (redisClient) {
      try {
        await redisClient.quit();
      } catch (e) {
        // Ignore cleanup errors
      }
      redisClient = null;
    }
    
    return false;
  }
}

/**
 * Check if Redis is available
 * @returns {Promise<boolean>}
 */
async function isAvailable() {
  if (!initializationAttempted) {
    await initializeRedis();
  }
  return isRedisAvailable && whatsappQueue !== null;
}

/**
 * Add WhatsApp send job to queue
 * @param {Object} jobData - Job data
 * @param {string} jobData.phoneNumber - Phone number
 * @param {Buffer|string} jobData.pdfBuffer - PDF buffer or file path
 * @param {string} jobData.memberName - Member name
 * @param {number} jobData.registrationId - Registration ID
 * @param {number} jobData.eventId - Event ID
 * @param {number} jobData.userId - User ID (for notifications, optional)
 * @returns {Promise<Job|null>} Job instance or null if queue unavailable
 */
async function addWhatsAppJob(jobData) {
  try {
    // Check if Redis is available
    const available = await isAvailable();
    if (!available) {
      console.warn('[WhatsApp Queue] ⚠️ Queue not available, job not added');
      return null;
    }

    const {
      phoneNumber,
      pdfBuffer,
      memberName,
      registrationId,
      eventId,
      userId = null
    } = jobData;

    // Validate required fields
    if (!phoneNumber || !pdfBuffer || !registrationId || !eventId) {
      throw new Error('Missing required job data: phoneNumber, pdfBuffer, registrationId, eventId');
    }

    // Add job to queue with unique ID to prevent duplicates
    const jobId = `whatsapp-${registrationId}-${Date.now()}`;
    
    const job = await whatsappQueue.add(
      'send-whatsapp',
      {
        phoneNumber,
        pdfBuffer: Buffer.isBuffer(pdfBuffer) ? pdfBuffer.toString('base64') : pdfBuffer, // Convert buffer to base64 for storage
        memberName: memberName || '',
        registrationId,
        eventId,
        userId,
        createdAt: new Date().toISOString()
      },
      {
        jobId, // Unique job ID prevents duplicates
        removeOnComplete: true, // Remove completed jobs immediately
        removeOnFail: false // Keep failed jobs for debugging
      }
    );

    console.log(`[WhatsApp Queue] ✅ Job added to queue: ${job.id} for registration ${registrationId}`);
    return job;
  } catch (error) {
    console.error('[WhatsApp Queue] ❌ Error adding job to queue:', error.message);
    // Don't throw - allow fallback to direct call
    return null;
  }
}

/**
 * Get job status
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Job status
 */
async function getJobStatus(jobId) {
  try {
    const available = await isAvailable();
    if (!available || !whatsappQueue) {
      return { exists: false, error: 'Queue not available' };
    }

    const job = await whatsappQueue.getJob(jobId);
    if (!job) {
      return { exists: false };
    }

    const state = await job.getState();
    const progress = job.progress || 0;
    const returnValue = job.returnvalue;
    const failedReason = job.failedReason;

    return {
      exists: true,
      id: job.id,
      state,
      progress,
      data: job.data,
      returnValue,
      failedReason,
      timestamp: job.timestamp
    };
  } catch (error) {
    console.error('[WhatsApp Queue] Error getting job status:', error.message);
    return { exists: false, error: error.message };
  }
}

/**
 * Get queue statistics
 * @returns {Promise<Object>} Queue stats
 */
async function getQueueStats() {
  try {
    const available = await isAvailable();
    if (!available || !whatsappQueue) {
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

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      whatsappQueue.getWaitingCount(),
      whatsappQueue.getActiveCount(),
      whatsappQueue.getCompletedCount(),
      whatsappQueue.getFailedCount(),
      whatsappQueue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed
    };
  } catch (error) {
    console.error('[WhatsApp Queue] Error getting queue stats:', error.message);
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      total: 0,
      error: error.message
    };
  }
}

module.exports = {
  get whatsappQueue() {
    return whatsappQueue;
  },
  addWhatsAppJob,
  getJobStatus,
  getQueueStats,
  isAvailable,
  initializeRedis,
  get redisClient() {
    return redisClient;
  }
};

