const { sequelize } = require('../config/database');
const { User, Association, Member, Event, Vendor, BOD } = require('../models');

// Sample data for migration (replace with your actual MongoDB data)
const sampleData = {
  associations: [
    {
      name: 'Mumbai Mandap Association',
      description: 'Leading mandap association in Mumbai',
      address: '123 Main Street, Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      phone: '9876543210',
      email: 'info@mumbaimandap.com',
      website: 'https://mumbaimandap.com',
      registrationNumber: 'MMA001',
      establishedYear: 2010,
      isActive: true,
      totalMembers: 0,
      totalVendors: 0
    },
    {
      name: 'Pune Mandap Association',
      description: 'Premier mandap association in Pune',
      address: '456 Park Avenue, Pune',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      phone: '9876543211',
      email: 'info@punemandap.com',
      website: 'https://punemandap.com',
      registrationNumber: 'PMA001',
      establishedYear: 2012,
      isActive: true,
      totalMembers: 0,
      totalVendors: 0
    }
  ],
  users: [
    {
      name: 'Admin User',
      email: 'admin@mandap.com',
      password: 'admin123',
      role: 'admin',
      district: 'Mumbai',
      state: 'Maharashtra',
      phone: '9876543210',
      isActive: true,
      permissions: {
        vendors: { read: true, write: true, delete: true },
        events: { read: true, write: true, delete: true },
        bod: { read: true, write: true, delete: true },
        members: { read: true, write: true, delete: true },
        associations: { read: true, write: true, delete: true }
      }
    }
  ],
  members: [
    {
      name: 'Rajesh Kumar',
      businessName: 'Kumar Sound Systems',
      businessType: 'sound',
      address: '789 Sound Street, Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400002',
      phone: '9876543212',
      email: 'rajesh@kumarsound.com',
      gstNumber: '27ABCDE1234F1Z5',
      description: 'Professional sound system provider',
      experience: 10,
      rating: 4.5,
      totalBookings: 150,
      isActive: true,
      isVerified: true,
      birthDate: '1985-01-15',
      associationId: 1
    },
    {
      name: 'Priya Sharma',
      businessName: 'Sharma Decorations',
      businessType: 'decorator',
      address: '321 Decoration Lane, Pune',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411002',
      phone: '9876543213',
      email: 'priya@sharmadecor.com',
      gstNumber: '27FGHIJ5678K1Z5',
      description: 'Creative decoration specialist',
      experience: 8,
      rating: 4.8,
      totalBookings: 200,
      isActive: true,
      isVerified: true,
      birthDate: '1990-01-15',
      associationId: 2
    }
  ]
};

const migrateData = async () => {
  try {
    console.log('🔄 Starting data migration to PostgreSQL...');

    // Test connection
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established');

    // Sync database (create tables)
    await sequelize.sync({ force: true });
    console.log('✅ Database tables created');

    // Migrate associations
    console.log('📊 Migrating associations...');
    const associations = await Association.bulkCreate(sampleData.associations);
    console.log(`✅ Created ${associations.length} associations`);

    // Migrate users
    console.log('👥 Migrating users...');
    const users = await User.bulkCreate(sampleData.users);
    console.log(`✅ Created ${users.length} users`);

    // Migrate members
    console.log('👤 Migrating members...');
    const members = await Member.bulkCreate(sampleData.members);
    console.log(`✅ Created ${members.length} members`);

    console.log('🎉 Data migration completed successfully!');
    
    // Display summary
    const totalAssociations = await Association.count();
    const totalUsers = await User.count();
    const totalMembers = await Member.count();
    
    console.log('\n📊 Migration Summary:');
    console.log(`- Associations: ${totalAssociations}`);
    console.log(`- Users: ${totalUsers}`);
    console.log(`- Members: ${totalMembers}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  migrateData();
}

module.exports = { migrateData };
