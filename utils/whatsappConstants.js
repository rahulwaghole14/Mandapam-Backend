/**
 * Constants for WhatsApp sending functionality
 * Used for database-level locking to prevent duplicate sends
 */

// Lock timestamp used to mark a registration as "sending in progress"
// This is a special date value (2000-01-01) that is used as a lock flag
// Real sent timestamps will always be after this date
const WHATSAPP_LOCK_TIMESTAMP = new Date('2000-01-01');

module.exports = {
  WHATSAPP_LOCK_TIMESTAMP
};


