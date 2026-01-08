const { Event, Member, EventRegistration } = require('../models');
const { Op } = require('sequelize');

class RSVPService {
  /**
   * Check if an event is upcoming and can accept registrations
   * @param {Object} event - Event object
   * @returns {boolean} - True if event is upcoming
   */
  static isEventUpcoming(event) {
    if (!event) return false;

    // Check if event status is 'Upcoming'
    if (event.status !== 'Upcoming') {
      return false;
    }

    // Check if event start date is in the future
    const now = new Date();
    const eventStartDate = new Date(event.startDate);

    return eventStartDate > now;
  }

  /**
   * Check if a member is already registered for an event
   * @param {number} eventId - Event ID
   * @param {number} memberId - Member ID
   * @returns {Promise<boolean>} - True if already registered
   */
  static async isAlreadyRegistered(eventId, memberId) {
    try {
      const existingRegistration = await EventRegistration.findOne({
        where: {
          eventId,
          memberId,
          status: 'registered'
        }
      });

      return !!existingRegistration;
    } catch (error) {
      console.error('Error checking existing registration:', error);
      throw error;
    }
  }

  /**
   * Check if an event has available capacity
   * @param {number} eventId - Event ID
   * @returns {Promise<boolean>} - True if has capacity
   */
  static async hasCapacity(eventId) {
    try {
      const event = await Event.findByPk(eventId);
      if (!event) return false;

      // If no max attendees limit, always has capacity
      if (!event.maxAttendees) return true;

      // Count current registered attendees
      const registeredCount = await EventRegistration.count({
        where: {
          eventId,
          status: 'registered'
        }
      });

      return registeredCount < event.maxAttendees;
    } catch (error) {
      console.error('Error checking event capacity:', error);
      throw error;
    }
  }

  /**
   * Get current registration count for an event
   * @param {number} eventId - Event ID
   * @returns {Promise<number>} - Current registration count
   */
  static async getRegistrationCount(eventId) {
    try {
      return await EventRegistration.count({
        where: {
          eventId,
          status: 'registered'
        }
      });
    } catch (error) {
      console.error('Error getting registration count:', error);
      throw error;
    }
  }

  /**
   * Register a member for an event
   * @param {number} eventId - Event ID
   * @param {number} memberId - Member ID
   * @param {string} notes - Optional notes
   * @returns {Promise<Object>} - Registration object
   */
  static async registerForEvent(eventId, memberId, notes = null) {
    try {
      // Validate event exists and is upcoming
      const event = await Event.findByPk(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      if (!this.isEventUpcoming(event)) {
        throw new Error('Cannot register for past or completed events');
      }

      // Check if already registered
      if (await this.isAlreadyRegistered(eventId, memberId)) {
        throw new Error('You are already registered for this event');
      }

      // Fetch member to get name and phone for snapshot
      const member = await Member.findByPk(memberId);
      if (!member) {
        throw new Error('Member not found');
      }

      // Check capacity
      if (!(await this.hasCapacity(eventId))) {
        throw new Error('Event is at full capacity');
      }

      // Check if there's a cancelled registration that we can reactivate
      const existingRegistration = await EventRegistration.findOne({
        where: {
          eventId,
          memberId,
          status: 'cancelled'
        }
      });

      let registration;
      if (existingRegistration) {
        // Reactivate cancelled registration
        await existingRegistration.update({
          status: 'registered',
          memberName: member.name,
          memberPhone: member.phone,
          notes: notes || existingRegistration.notes,
          registeredAt: new Date()
        });
        registration = existingRegistration;
      } else {
        // Create new registration
        registration = await EventRegistration.create({
          eventId,
          memberId,
          memberName: member.name,
          memberPhone: member.phone,
          status: 'registered',
          notes
        });
      }

      // Update event attendee count
      await Event.increment('currentAttendees', {
        where: { id: eventId }
      });

      return registration;
    } catch (error) {
      console.error('Error registering for event:', error);
      throw error;
    }
  }

  /**
   * Cancel a member's registration for an event
   * @param {number} eventId - Event ID
   * @param {number} memberId - Member ID
   * @returns {Promise<Object>} - Updated registration object
   */
  static async cancelRegistration(eventId, memberId) {
    try {
      // Find existing registration
      const registration = await EventRegistration.findOne({
        where: {
          eventId,
          memberId,
          status: 'registered'
        }
      });

      if (!registration) {
        throw new Error('No active registration found for this event');
      }

      // Update registration status
      await registration.update({
        status: 'cancelled'
      });

      // Decrease event attendee count
      await Event.decrement('currentAttendees', {
        where: { id: eventId }
      });

      return registration;
    } catch (error) {
      console.error('Error cancelling registration:', error);
      throw error;
    }
  }

  /**
   * Get member's registration status for an event
   * @param {number} eventId - Event ID
   * @param {number} memberId - Member ID
   * @returns {Promise<Object|null>} - Registration object or null
   */
  static async getRegistrationStatus(eventId, memberId) {
    try {
      return await EventRegistration.findOne({
        where: {
          eventId,
          memberId
        },
        include: [
          {
            model: Event,
            as: 'event',
            attributes: ['id', 'title', 'startDate', 'status']
          },
          {
            model: Member,
            as: 'member',
            attributes: ['id', 'name', 'businessName']
          }
        ]
      });
    } catch (error) {
      console.error('Error getting registration status:', error);
      throw error;
    }
  }

  /**
   * Get all registrations for a member
   * @param {number} memberId - Member ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of registrations
   */
  static async getMemberRegistrations(memberId, options = {}) {
    try {
      const {
        status = null,
        limit = 50,
        offset = 0,
        includeEvent = true
      } = options;

      const whereClause = { memberId };
      if (status) {
        whereClause.status = status;
      }

      const includeArray = [];
      if (includeEvent) {
        includeArray.push({
          model: Event,
          as: 'event',
          attributes: ['id', 'title', 'description', 'startDate', 'endDate', 'location', 'status', 'maxAttendees', 'currentAttendees']
        });
      }

      return await EventRegistration.findAndCountAll({
        where: whereClause,
        include: includeArray,
        order: [['registeredAt', 'DESC']],
        limit,
        offset
      });
    } catch (error) {
      console.error('Error getting member registrations:', error);
      throw error;
    }
  }

  /**
   * Get all registrations for an event (admin function)
   * @param {number} eventId - Event ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of registrations
   */
  static async getEventRegistrations(eventId, options = {}) {
    try {
      const {
        status = null,
        limit = 50,
        offset = 0
      } = options;

      const whereClause = { eventId };
      if (status) {
        whereClause.status = status;
      }

      return await EventRegistration.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Member,
            as: 'member',
            attributes: ['id', 'name', 'businessName', 'businessType', 'phone', 'email', 'city']
          }
        ],
        order: [['registeredAt', 'ASC']],
        limit,
        offset
      });
    } catch (error) {
      console.error('Error getting event registrations:', error);
      throw error;
    }
  }

  /**
   * Validate RSVP request
   * @param {number} eventId - Event ID
   * @param {number} memberId - Member ID
   * @returns {Promise<Object>} - Validation result
   */
  static async validateRSVPRequest(eventId, memberId) {
    try {
      const event = await Event.findByPk(eventId);
      if (!event) {
        return {
          isValid: false,
          error: 'Event not found'
        };
      }

      if (!this.isEventUpcoming(event)) {
        return {
          isValid: false,
          error: 'Cannot register for past or completed events'
        };
      }

      if (await this.isAlreadyRegistered(eventId, memberId)) {
        return {
          isValid: false,
          error: 'You are already registered for this event'
        };
      }

      if (!(await this.hasCapacity(eventId))) {
        return {
          isValid: false,
          error: 'Event is at full capacity'
        };
      }

      return {
        isValid: true,
        event
      };
    } catch (error) {
      console.error('Error validating RSVP request:', error);
      return {
        isValid: false,
        error: 'Server error while validating request'
      };
    }
  }
}

module.exports = RSVPService;
