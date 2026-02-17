// Migration: Make businessType column nullable in members table
// This migration makes businessType optional as per frontend form changes

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Change businessType column to allow NULL values
      await queryInterface.changeColumn('members', 'business_type', {
        type: Sequelize.ENUM('catering', 'sound', 'mandap', 'light', 'decorator', 'photography', 'videography', 'transport', 'other'),
        allowNull: true,
        field: 'business_type'
      });

      console.log('✅ Made business_type column nullable in members table');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // First, update any NULL values to 'other' to avoid constraint violations
      await queryInterface.sequelize.query(`
        UPDATE members 
        SET business_type = 'other' 
        WHERE business_type IS NULL
      `);

      // Change businessType column back to NOT NULL
      await queryInterface.changeColumn('members', 'business_type', {
        type: Sequelize.ENUM('catering', 'sound', 'mandap', 'light', 'decorator', 'photography', 'videography', 'transport', 'other'),
        allowNull: false,
        field: 'business_type'
      });

      console.log('✅ Reverted business_type column to NOT NULL in members table');
      
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
