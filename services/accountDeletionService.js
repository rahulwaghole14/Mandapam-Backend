const { AccountDeletionRequest, Member, RefreshToken, FCMToken, NotificationLog } = require('../models');
const { Op } = require('sequelize');

class AccountDeletionService {
  static async processScheduledDeletions() {
    try {
      console.log('[AccountDeletionService] Processing scheduled account deletions...');
      
      // Find all verified deletion requests that are due for deletion
      const dueDeletions = await AccountDeletionRequest.findAll({
        where: {
          status: 'verified',
          deletionScheduledAt: { [Op.lte]: new Date() }
        },
        include: [
          {
            model: Member,
            as: 'member',
            required: false
          }
        ]
      });

      console.log(`[AccountDeletionService] Found ${dueDeletions.length} accounts to delete`);

      for (const deletionRequest of dueDeletions) {
        try {
          await this.processSingleDeletion(deletionRequest);
        } catch (error) {
          console.error(`[AccountDeletionService] Error deleting account for ${deletionRequest.mobileNumber}:`, error);
          // Mark as failed but continue with others
          await deletionRequest.update({
            status: 'completed',
            notes: `Deletion failed: ${error.message}`,
            completedAt: new Date()
          });
        }
      }

      console.log('[AccountDeletionService] Account deletion processing completed');
    } catch (error) {
      console.error('[AccountDeletionService] Error in processScheduledDeletions:', error);
    }
  }

  static async processSingleDeletion(deletionRequest) {
    const { mobileNumber } = deletionRequest;
    
    console.log(`[AccountDeletionService] Processing deletion for ${mobileNumber}`);

    // Find the member to be deleted
    const member = await Member.findOne({
      where: { phone: mobileNumber }
    });

    if (!member) {
      console.log(`[AccountDeletionService] Member not found for ${mobileNumber}, marking request as completed`);
      await deletionRequest.update({
        status: 'completed',
        notes: 'Member not found - possibly already deleted',
        completedAt: new Date()
      });
      return;
    }

    // Delete related data
    await this.deleteMemberData(member.id);

    // Delete the member
    await member.destroy();

    // Update deletion request
    await deletionRequest.update({
      status: 'completed',
      completedAt: new Date(),
      notes: `Successfully deleted member: ${member.name} (${member.businessName || 'No business name'})`
    });

    console.log(`[AccountDeletionService] Successfully deleted account for ${mobileNumber} - ${member.name}`);
  }

  static async deleteMemberData(memberId) {
    try {
      // Delete refresh tokens
      await RefreshToken.destroy({
        where: { memberId }
      });

      // Delete FCM tokens
      await FCMToken.destroy({
        where: { memberId }
      });

      // Delete notification logs
      await NotificationLog.destroy({
        where: { memberId }
      });

      // Note: Other related data like event registrations, gallery images, etc.
      // should be handled by cascade deletes in the database or additional cleanup here

      console.log(`[AccountDeletionService] Cleaned up related data for member ${memberId}`);
    } catch (error) {
      console.error(`[AccountDeletionService] Error cleaning up data for member ${memberId}:`, error);
      throw error;
    }
  }

  static async checkPendingRequests() {
    try {
      console.log('[AccountDeletionService] Checking for pending deletion requests...');
      
      // Find requests that will be deleted in the next 24 hours
      const upcomingDeletions = await AccountDeletionRequest.findAll({
        where: {
          status: 'verified',
          deletionScheduledAt: {
            [Op.gte]: new Date(),
            [Op.lte]: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next 24 hours
          }
        }
      });

      if (upcomingDeletions.length > 0) {
        console.log(`[AccountDeletionService] Found ${upcomingDeletions.length} accounts scheduled for deletion in the next 24 hours`);
        
        // Here you could send reminder notifications to users
        // For now, we'll just log them
        upcomingDeletions.forEach(request => {
          console.log(`[AccountDeletionService] Upcoming deletion: ${request.mobileNumber} on ${request.deletionScheduledAt}`);
        });
      }

      return upcomingDeletions;
    } catch (error) {
      console.error('[AccountDeletionService] Error in checkPendingRequests:', error);
      return [];
    }
  }

  static async getDeletionStats() {
    try {
      const stats = await AccountDeletionRequest.findAll({
        attributes: [
          'status',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        group: ['status']
      });

      return stats.reduce((acc, stat) => {
        acc[stat.status] = parseInt(stat.dataValues.count);
        return acc;
      }, {});
    } catch (error) {
      console.error('[AccountDeletionService] Error in getDeletionStats:', error);
      return {};
    }
  }
}

module.exports = AccountDeletionService;
