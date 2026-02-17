#!/usr/bin/env node

/**
 * Manual Registration Form Updates - Backend Implementation
 * 
 * This script applies the necessary database changes for the updated manual registration form:
 * 1. Makes businessType optional in members table
 * 2. Adds cashReceiptNumber field to event_registrations table
 * 
 * Run this script on the production database to apply the changes.
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration
const sequelize = new Sequelize(
  process.env.DB_NAME || 'mandapam',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log
  }
);

async function runMigrations() {
  try {
    console.log('🚀 Starting manual registration form updates...\n');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Migration 1: Make businessType nullable
    console.log('📝 Migration 1: Making business_type column nullable...');
    await sequelize.getQueryInterface().changeColumn('members', 'business_type', {
      type: Sequelize.ENUM('catering', 'sound', 'mandap', 'light', 'decorator', 'photography', 'videography', 'transport', 'other'),
      allowNull: true,
      field: 'business_type'
    });
    console.log('✅ business_type column is now nullable\n');

    // Migration 2: Add cashReceiptNumber column
    console.log('📝 Migration 2: Adding cash_receipt_number column...');
    await sequelize.getQueryInterface().addColumn('event_registrations', 'cash_receipt_number', {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'cash_receipt_number'
    });
    console.log('✅ cash_receipt_number column added\n');

    console.log('🎉 All migrations completed successfully!');
    console.log('\n📋 Summary of changes:');
    console.log('- business_type in members table: now optional (nullable)');
    console.log('- cash_receipt_number in event_registrations table: new field added (optional)');
    console.log('\n🔄 Backend code has been updated to handle these changes.');
    console.log('📱 Frontend form now sends optional businessType and cashReceiptNumber fields.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
