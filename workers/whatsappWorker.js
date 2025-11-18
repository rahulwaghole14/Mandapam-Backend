const { Worker } = require('bullmq');
const whatsappService = require('../services/whatsappService');
const pdfService = require('../services/pdfService');
const EventRegistration = require('../models/EventRegistration');
const Event = require('../models/Event');
const Member = require('../models/Member');
const User = require('../models/User');
const NotificationLog = require('../models/NotificationLog');
const { sequelize } = require('../config/database');
const { WHATSAPP_LOCK_TIMESTAMP } = require('../utils/whatsappConstants');
const { acquireWhatsAppLock, releaseWhatsAppLock, updateLockToSentTime } = require('../utils/whatsappLock');
const Logger = require('../utils/logger');

// Redis connection (same as queue)
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

/**
 * Notify manager when WhatsApp is sent
 */
async function notifyManagerOnWhatsAppSent(userId, registration, event, member) {
  try {
    if (!userId) return;

    const sender = await User.findByPk(userId);
    if (!sender || !sender.isActive) return;

    const memberName = member?.name || 'Guest';
    const eventTitle = event?.title || event?.name || 'Event';
    const phone = member?.phone || 'N/A';

    await NotificationLog.create({
      userId: sender.id,
      title: 'WhatsApp Pass Sent',
      message: `Visitor pass sent via WhatsApp to ${memberName} (${phone}) for event "${eventTitle}"`,
      type: 'event',
      eventId: event?.id || null,
      status: 'sent',
      sentAt: new Date()
    });

    console.log(`[WhatsApp Worker] ✅ Notification created for user ${sender.name} (ID: ${sender.id})`);
  } catch (error) {
    console.error('[WhatsApp Worker] ❌ Error notifying user:', error.message);
  }
}

// Create WhatsApp worker
const whatsappWorker = new Worker(
  'whatsapp-send',
  async (job) => {
    const {
      phoneNumber,
      pdfBuffer: pdfBufferBase64,
      memberName,
      registrationId,
      eventId,
      userId
    } = job.data;

    Logger.info('WhatsApp Worker: Processing job', { 
      jobId: job.id, 
      registrationId, 
      phone: phoneNumber, 
      eventId 
    });

    try {
      // Convert base64 back to buffer if needed
      let pdfSource = pdfBufferBase64;
      if (typeof pdfBufferBase64 === 'string' && pdfBufferBase64.startsWith('data:')) {
        // It's a data URL, extract base64
        const base64Data = pdfBufferBase64.split(',')[1];
        pdfSource = Buffer.from(base64Data, 'base64');
      } else if (typeof pdfBufferBase64 === 'string') {
        // It's a base64 string
        pdfSource = Buffer.from(pdfBufferBase64, 'base64');
      } else if (typeof pdfBufferBase64 === 'string' && !pdfBufferBase64.startsWith('http')) {
        // It's a file path (legacy support)
        pdfSource = pdfBufferBase64;
      }

      // CRITICAL: Check if WhatsApp was already sent (idempotency check)
      const registration = await EventRegistration.findByPk(registrationId, {
        include: [
          { model: Member, as: 'member', required: false },
          { model: Event, as: 'event', required: false }
        ]
      });

      if (!registration) {
        throw new Error(`Registration ${registrationId} not found`);
      }

      // Acquire lock using utility function
      const lockResult = await acquireWhatsAppLock(registrationId);

      if (!lockResult.acquired) {
        if (lockResult.reason === 'already_sent') {
          Logger.info('WhatsApp Worker: Already sent', { 
            registrationId, 
            pdfSentAt: lockResult.pdfSentAt 
          });
          return {
            success: true,
            skipped: true,
            reason: 'already_sent',
            pdfSentAt: lockResult.pdfSentAt
          };
        } else {
          Logger.warn('WhatsApp Worker: Could not acquire lock', { 
            registrationId, 
            reason: lockResult.reason 
          });
          return {
            success: false,
            skipped: true,
            reason: lockResult.reason
          };
        }
      }

      // Send WhatsApp (async, single attempt, no timeout)
      const sendStartTime = new Date();
      Logger.info('WhatsApp Worker: Starting send', { 
        registrationId, 
        phone: phoneNumber,
        timestamp: sendStartTime.toISOString()
      });
      
      const result = await whatsappService.sendPdfViaWhatsApp(
        phoneNumber,
        pdfSource,
        memberName
      );
      
      const sendEndTime = new Date();
      const sendDuration = sendEndTime.getTime() - sendStartTime.getTime();
      Logger.info('WhatsApp Worker: Send completed', { 
        registrationId, 
        durationMs: sendDuration,
        timestamp: sendEndTime.toISOString()
      });

      if (result.success) {
        const updateResult = await updateLockToSentTime(registrationId);

        if (!updateResult.updated) {
          Logger.warn('WhatsApp Worker: Lock was released by another process', { registrationId });
        } else {
          Logger.info('WhatsApp Worker: pdfSentAt updated', { 
            registrationId, 
            pdfSentAt: updateResult.actualSentTime.toISOString()
          });
        }

        // Notify manager if userId provided
        if (userId && registration.member && registration.event) {
          await notifyManagerOnWhatsAppSent(
            userId,
            registration,
            registration.event,
            registration.member
          );
        }

        Logger.info('WhatsApp Worker: Successfully sent', { registrationId });
        return {
          success: true,
          message: 'WhatsApp sent successfully',
          pdfSentAt: updateResult.actualSentTime
        };
      } else {
        await releaseWhatsAppLock(registrationId);
        throw new Error(result.error || 'WhatsApp sending failed');
      }
    } catch (error) {
      Logger.error('WhatsApp Worker: Error processing job', error, { 
        jobId: job.id, 
        registrationId 
      });
      
      // Release lock on error
      try {
        await releaseWhatsAppLock(registrationId);
      } catch (updateError) {
        Logger.error('WhatsApp Worker: Error releasing lock', updateError, { registrationId });
      }

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 jobs concurrently
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000 // Per second
    }
  }
);

// Worker event handlers
whatsappWorker.on('completed', (job) => {
  console.log(`[WhatsApp Worker] ✅ Job ${job.id} completed successfully`);
});

whatsappWorker.on('failed', (job, err) => {
  console.error(`[WhatsApp Worker] ❌ Job ${job.id} failed:`, err.message);
});

whatsappWorker.on('error', (error) => {
  console.error('[WhatsApp Worker] ❌ Worker error:', error.message);
});

whatsappWorker.on('stalled', (jobId) => {
  console.warn(`[WhatsApp Worker] ⚠️ Job ${jobId} stalled`);
});

console.log('[WhatsApp Worker] ✅ Worker started and listening for jobs');

module.exports = whatsappWorker;

