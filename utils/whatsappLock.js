const EventRegistration = require('../models/EventRegistration');
const { sequelize } = require('../config/database');
const { WHATSAPP_LOCK_TIMESTAMP } = require('./whatsappConstants');

/**
 * Acquire a database lock for WhatsApp sending to prevent duplicate sends
 * @param {number} registrationId - The registration ID to lock
 * @param {boolean} forceResend - If true, allow resending even if already sent (for manual sends)
 * @returns {Promise<{acquired: boolean, reason?: string, pdfSentAt?: Date}>}
 */
async function acquireWhatsAppLock(registrationId, forceResend = false) {
  try {
    const lockResult = await sequelize.transaction(async (transaction) => {
      // Lock the row for update (SELECT FOR UPDATE)
      const lockedRegistration = await EventRegistration.findByPk(registrationId, {
        attributes: ['id', 'pdfSentAt'],
        lock: transaction.LOCK.UPDATE,
        transaction
      });
      
      if (!lockedRegistration) {
        return { acquired: false, reason: 'not_found' };
      }
      
      // Check if already sent (double-check after acquiring lock)
      if (lockedRegistration.pdfSentAt) {
        // Check if it's a real timestamp (already sent) or lock value (currently sending)
        if (lockedRegistration.pdfSentAt.getTime() > WHATSAPP_LOCK_TIMESTAMP.getTime()) {
          // If forceResend is true, clear the pdfSentAt to allow resending
          if (forceResend) {
            await lockedRegistration.update({ pdfSentAt: WHATSAPP_LOCK_TIMESTAMP }, { transaction });
            return { acquired: true, wasAlreadySent: true };
          } else {
            return { 
              acquired: false, 
              reason: 'already_sent', 
              pdfSentAt: lockedRegistration.pdfSentAt 
            };
          }
        } else {
          // Lock value - another process is currently sending
          return { acquired: false, reason: 'lock_held' };
        }
      }
      
      // Acquire lock by setting pdfSentAt to a temporary value
      await lockedRegistration.update({ pdfSentAt: WHATSAPP_LOCK_TIMESTAMP }, { transaction });
      
      return { acquired: true };
    });
    
    return lockResult;
  } catch (error) {
    console.error(`[WhatsApp Lock] Error acquiring lock for registration ${registrationId}:`, error);
    return { acquired: false, reason: 'error', error: error.message };
  }
}

/**
 * Release the WhatsApp lock (set pdfSentAt to null)
 * Used when sending fails or is cancelled
 * @param {number} registrationId - The registration ID to unlock
 * @returns {Promise<boolean>} - True if lock was released
 */
async function releaseWhatsAppLock(registrationId) {
  try {
    const [updatedRows] = await EventRegistration.update(
      { pdfSentAt: null },
      { where: { id: registrationId } }
    );
    return updatedRows > 0;
  } catch (error) {
    console.error(`[WhatsApp Lock] Error releasing lock for registration ${registrationId}:`, error);
    return false;
  }
}

/**
 * Update lock to actual sent timestamp
 * @param {number} registrationId - The registration ID
 * @param {Date} sentTime - The actual sent time (defaults to now)
 * @returns {Promise<{updated: boolean, actualSentTime: Date}>}
 */
async function updateLockToSentTime(registrationId, sentTime = null) {
  try {
    const actualSentTime = sentTime || new Date();
    const [updatedRows] = await EventRegistration.update(
      { pdfSentAt: actualSentTime },
      { 
        where: { 
          id: registrationId,
          pdfSentAt: WHATSAPP_LOCK_TIMESTAMP // Only update if lock is still held
        }
      }
    );
    
    return {
      updated: updatedRows > 0,
      actualSentTime
    };
  } catch (error) {
    console.error(`[WhatsApp Lock] Error updating lock to sent time for registration ${registrationId}:`, error);
    return {
      updated: false,
      actualSentTime: sentTime || new Date()
    };
  }
}

module.exports = {
  acquireWhatsAppLock,
  releaseWhatsAppLock,
  updateLockToSentTime
};



