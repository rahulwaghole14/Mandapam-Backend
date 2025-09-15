const { Member, Association } = require('../models');
const { Op } = require('sequelize');
const { validateBirthDate } = require('../utils/dateUtils');

class MemberImportService {
  /**
   * Import members from CSV data
   * @param {Array} members - Array of member objects
   * @param {number} createdBy - User ID who is importing
   * @returns {Object} - Import results with summary, errors, warnings, and imported members
   */
  async importMembers(members, createdBy) {
    const results = {
      summary: {
        total: members.length,
        imported: 0,
        failed: 0,
        skipped: 0
      },
      errors: [],
      warnings: [],
      importedMembers: []
    };

    try {
      // Build association lookup map
      const associationMap = await this.buildAssociationMap(members);
      
      // Check for duplicates
      const duplicateMap = await this.checkDuplicates(members);
      
      // Process members in batches
      const batchSize = 50;
      for (let i = 0; i < members.length; i += batchSize) {
        const batch = members.slice(i, i + batchSize);
        await this.processBatch(batch, associationMap, duplicateMap, createdBy, results, i);
      }

      return results;
    } catch (error) {
      console.error('Member import service error:', error);
      throw new Error('Import failed: ' + error.message);
    }
  }

  /**
   * Build association lookup map for efficient association ID resolution
   * @param {Array} members - Array of member objects
   * @returns {Map} - Map of association names to IDs
   */
  async buildAssociationMap(members) {
    const associationNames = [...new Set(members.map(m => m.associationName).filter(Boolean))];
    
    if (associationNames.length === 0) {
      return new Map();
    }

    const associations = await Association.findAll({
      where: {
        name: { [Op.iLike]: { [Op.any]: associationNames } },
        isActive: true
      },
      attributes: ['id', 'name']
    });

    const map = new Map();
    associations.forEach(assoc => {
      map.set(assoc.name.toLowerCase(), assoc.id);
    });

    return map;
  }

  /**
   * Check for duplicate members by phone and email
   * @param {Array} members - Array of member objects
   * @returns {Map} - Map of duplicate phone/email to type
   */
  async checkDuplicates(members) {
    const phones = members.map(m => m.phone).filter(Boolean);
    const emails = members.map(m => m.email).filter(Boolean);
    
    if (phones.length === 0 && emails.length === 0) {
      return new Map();
    }

    const whereConditions = [];
    if (phones.length > 0) {
      whereConditions.push({ phone: { [Op.in]: phones } });
    }
    if (emails.length > 0) {
      whereConditions.push({ email: { [Op.in]: emails } });
    }

    const existingMembers = await Member.findAll({
      where: {
        [Op.or]: whereConditions
      },
      attributes: ['phone', 'email']
    });

    const duplicateMap = new Map();
    existingMembers.forEach(member => {
      if (member.phone) duplicateMap.set(member.phone, 'phone');
      if (member.email) duplicateMap.set(member.email, 'email');
    });

    return duplicateMap;
  }

  /**
   * Process a batch of members
   * @param {Array} batch - Batch of members to process
   * @param {Map} associationMap - Association name to ID mapping
   * @param {Map} duplicateMap - Duplicate phone/email mapping
   * @param {number} createdBy - User ID
   * @param {Object} results - Results object to update
   * @param {number} startIndex - Starting index for row numbering
   */
  async processBatch(batch, associationMap, duplicateMap, createdBy, results, startIndex) {
    const validMembers = [];
    const batchErrors = [];

    for (let i = 0; i < batch.length; i++) {
      const member = batch[i];
      const rowNumber = startIndex + i + 1;
      const errors = [];

      // Validate required fields
      if (!member.name || member.name.trim() === '') {
        errors.push('Name is required');
      }
      if (!member.businessName || member.businessName.trim() === '') {
        errors.push('Business name is required');
      }
      if (!member.phone || member.phone.trim() === '') {
        errors.push('Phone number is required');
      }
      if (!member.city || member.city.trim() === '') {
        errors.push('City is required');
      }
      if (!member.state || member.state.trim() === '') {
        errors.push('State is required');
      }
      if (!member.associationName || member.associationName.trim() === '') {
        errors.push('Association name is required');
      }

      // Validate phone number format
      if (member.phone && !/^[0-9+\-\s()]{10,15}$/.test(member.phone.replace(/\s/g, ''))) {
        errors.push('Invalid phone number format');
      }

      // Validate email format
      if (member.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
        errors.push('Invalid email format');
      }

      // Validate business type
      const validBusinessTypes = ['catering', 'sound', 'mandap', 'madap', 'light', 'decorator', 'photography', 'videography', 'transport', 'other'];
      if (member.businessType && !validBusinessTypes.includes(member.businessType)) {
        errors.push('Invalid business type');
      }

      // Validate GST number format
      if (member.gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(member.gstNumber)) {
        errors.push('Invalid GST number format');
      }

      // Validate experience
      if (member.experience !== undefined && member.experience !== null && member.experience !== '') {
        const exp = parseInt(member.experience);
        if (isNaN(exp) || exp < 0 || exp > 100) {
          errors.push('Experience must be between 0-100 years');
        }
      }

      // Validate association
      const associationId = associationMap.get(member.associationName.toLowerCase());
      if (!associationId) {
        errors.push(`Association '${member.associationName}' not found`);
      }

      // Check duplicates
      if (duplicateMap.has(member.phone)) {
        results.warnings.push({
          row: rowNumber,
          data: { name: member.name, phone: member.phone },
          message: `Member with phone number ${member.phone} already exists, skipped`
        });
        results.summary.skipped++;
        continue;
      }

      if (member.email && duplicateMap.has(member.email)) {
        results.warnings.push({
          row: rowNumber,
          data: { name: member.name, email: member.email },
          message: `Member with email ${member.email} already exists, skipped`
        });
        results.summary.skipped++;
        continue;
      }

      // Validate birth date
      if (member.birthDate) {
        const birthDateValidation = validateBirthDate(member.birthDate);
        if (!birthDateValidation.isValid) {
          errors.push(birthDateValidation.message);
        }
      }

      if (errors.length > 0) {
        batchErrors.push({
          row: rowNumber,
          data: member,
          errors
        });
        results.summary.failed++;
      } else {
        validMembers.push({
          name: member.name.trim(),
          businessName: member.businessName.trim(),
          businessType: member.businessType || 'other',
          phone: member.phone.replace(/\s/g, ''),
          email: member.email ? member.email.trim() : null,
          city: member.city.trim(),
          state: member.state.trim(),
          district: member.district ? member.district.trim() : member.city.trim(),
          pincode: member.pincode ? member.pincode.trim() : null,
          address: member.address ? member.address.trim() : null,
          gstNumber: member.gstNumber ? member.gstNumber.trim() : null,
          description: member.description ? member.description.trim() : null,
          experience: member.experience ? parseInt(member.experience) : null,
          birthDate: member.birthDate || null,
          associationId,
          associationName: member.associationName.trim(),
          createdBy,
          isActive: true,
          isVerified: false,
          rating: 0.0,
          totalBookings: 0
        });
      }
    }

    // Add batch errors to results
    results.errors.push(...batchErrors);

    // Insert valid members
    if (validMembers.length > 0) {
      try {
        const insertedMembers = await Member.bulkCreate(validMembers, {
          returning: true,
          validate: true
        });
        
        results.importedMembers.push(...insertedMembers.map(m => ({
          id: m.id,
          name: m.name,
          businessName: m.businessName,
          phone: m.phone
        })));
        
        results.summary.imported += insertedMembers.length;
      } catch (error) {
        console.error('Batch insert error:', error);
        // Add all members in this batch as failed
        validMembers.forEach((member, index) => {
          results.errors.push({
            row: startIndex + index + 1,
            data: member,
            errors: ['Database insert failed: ' + error.message]
          });
        });
        results.summary.failed += validMembers.length;
        results.summary.imported -= validMembers.length;
      }
    }
  }
}

module.exports = new MemberImportService();
