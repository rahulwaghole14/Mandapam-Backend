const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { RefreshToken, Member } = require('../models');

class RefreshTokenService {
  /**
   * Generate a secure refresh token
   * @returns {string} - Random refresh token
   */
  static generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Generate JWT access token
   * @param {Object} member - Member object
   * @returns {string} - JWT access token
   */
  static generateAccessToken(member) {
    const tokenData = {
      id: member.id,
      phone: member.phone,
      name: member.name,
      businessName: member.businessName,
      businessType: member.businessType,
      city: member.city,
      associationName: member.association?.name || 'Unknown Association',
      isActive: member.isActive,
      userType: 'member'
    };
    
    return jwt.sign(tokenData, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '24h' // Access token (24 hours)
    });
  }

  /**
   * Create refresh token for member
   * @param {number} memberId - Member ID
   * @param {Object} deviceInfo - Device information
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent string
   * @returns {Promise<Object>} - Created refresh token
   */
  static async createRefreshToken(memberId, deviceInfo = null, ipAddress = null, userAgent = null) {
    try {
      const refreshToken = this.generateRefreshToken();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const tokenRecord = await RefreshToken.create({
        token: refreshToken,
        memberId,
        expiresAt,
        deviceInfo,
        ipAddress,
        userAgent
      });

      return tokenRecord;
    } catch (error) {
      console.error('Error creating refresh token:', error);
      throw error;
    }
  }

  /**
   * Verify refresh token and get member
   * @param {string} token - Refresh token
   * @returns {Promise<Object>} - Member and token record
   */
  static async verifyRefreshToken(token) {
    try {
      const tokenRecord = await RefreshToken.findOne({
        where: {
          token,
          isRevoked: false,
          expiresAt: {
            [require('sequelize').Op.gt]: new Date()
          }
        },
        include: [{
          model: Member,
          as: 'member',
          where: { isActive: true }
        }]
      });

      if (!tokenRecord) {
        return null;
      }

      // Update last used timestamp
      await tokenRecord.update({ lastUsedAt: new Date() });

      return {
        member: tokenRecord.member,
        tokenRecord
      };
    } catch (error) {
      console.error('Error verifying refresh token:', error);
      throw error;
    }
  }

  /**
   * Revoke refresh token
   * @param {string} token - Refresh token to revoke
   * @returns {Promise<boolean>} - Success status
   */
  static async revokeRefreshToken(token) {
    try {
      const [updatedRows] = await RefreshToken.update(
        { isRevoked: true },
        { where: { token } }
      );

      return updatedRows > 0;
    } catch (error) {
      console.error('Error revoking refresh token:', error);
      throw error;
    }
  }

  /**
   * Revoke all refresh tokens for a member
   * @param {number} memberId - Member ID
   * @returns {Promise<number>} - Number of revoked tokens
   */
  static async revokeAllRefreshTokensForMember(memberId) {
    try {
      const [updatedRows] = await RefreshToken.update(
        { isRevoked: true },
        { where: { memberId, isRevoked: false } }
      );

      return updatedRows;
    } catch (error) {
      console.error('Error revoking all refresh tokens for member:', error);
      throw error;
    }
  }

  /**
   * Clean up expired refresh tokens
   * @returns {Promise<number>} - Number of cleaned tokens
   */
  static async cleanupExpiredTokens() {
    try {
      const deletedRows = await RefreshToken.destroy({
        where: {
          expiresAt: {
            [require('sequelize').Op.lt]: new Date()
          }
        }
      });

      console.log(`🧹 Cleaned up ${deletedRows} expired refresh tokens`);
      return deletedRows;
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
      throw error;
    }
  }

  /**
   * Get active refresh tokens for a member
   * @param {number} memberId - Member ID
   * @returns {Promise<Array>} - Active refresh tokens
   */
  static async getActiveRefreshTokens(memberId) {
    try {
      const tokens = await RefreshToken.findAll({
        where: {
          memberId,
          isRevoked: false,
          expiresAt: {
            [require('sequelize').Op.gt]: new Date()
          }
        },
        attributes: ['id', 'deviceInfo', 'ipAddress', 'userAgent', 'lastUsedAt', 'created_at'],
        order: [['lastUsedAt', 'DESC']]
      });

      return tokens;
    } catch (error) {
      console.error('Error getting active refresh tokens:', error);
      throw error;
    }
  }

  /**
   * Generate both access and refresh tokens
   * @param {Object} member - Member object
   * @param {Object} deviceInfo - Device information
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent string
   * @returns {Promise<Object>} - Tokens and member info
   */
  static async generateTokenPair(member, deviceInfo = null, ipAddress = null, userAgent = null) {
    try {
      // Generate access token
      const accessToken = this.generateAccessToken(member);
      
      // Create refresh token
      const refreshTokenRecord = await this.createRefreshToken(
        member.id,
        deviceInfo,
        ipAddress,
        userAgent
      );

      return {
        accessToken,
        refreshToken: refreshTokenRecord.token,
        expiresIn: 15 * 60, // 15 minutes in seconds
        refreshExpiresIn: 30 * 24 * 60 * 60, // 30 days in seconds
        member: {
          id: member.id,
          name: member.name,
          businessName: member.businessName,
          businessType: member.businessType,
          phone: member.phone,
          city: member.city,
          associationName: member.association?.name || 'Unknown Association',
          isActive: member.isActive
        }
      };
    } catch (error) {
      console.error('Error generating token pair:', error);
      throw error;
    }
  }
}

module.exports = RefreshTokenService;
