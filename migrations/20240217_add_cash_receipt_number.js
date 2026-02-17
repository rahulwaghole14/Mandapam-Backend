// Migration: Add cashReceiptNumber column to event_registrations table
// This migration adds support for cash receipt numbers in manual registrations

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Add cashReceiptNumber column to event_registrations table
      await queryInterface.addColumn('event_registrations', 'cash_receipt_number', {
        type: Sequelize.STRING(100),
        allowNull: true,
        field: 'cash_receipt_number'
      });

      console.log('✅ Added cash_receipt_number column to event_registrations table');
      
      // Add comment for documentation
      await queryInterface.changeColumn('event_registrations', 'cash_receipt_number', {
        comment: 'Cash receipt number for manual registrations - optional field for tracking cash payments'
      });

      console.log('✅ Added comment to cash_receipt_number column');
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove cashReceiptNumber column from event_registrations table
      await queryInterface.removeColumn('event_registrations', 'cash_receipt_number');
      
      console.log('✅ Removed cash_receipt_number column from event_registrations table');
      
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
