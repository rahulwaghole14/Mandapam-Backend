const { sequelize, AppVersion } = require('../models');

async function createAppVersionsTable() {
  try {
    console.log('=== Creating App Versions Table ===\n');
    
    // Create the table
    await AppVersion.sync({ force: true });
    console.log('✅ App versions table created successfully');
    
    // Insert sample data
    const sampleVersions = [
      {
        version: '1.0.0',
        platform: 'both',
        isLatest: false,
        isForceUpdate: false,
        minSupportedVersion: '1.0.0',
        releaseNotes: 'Initial release',
        updateUrlIos: 'https://apps.apple.com/app/mandapam/id123456789',
        updateUrlAndroid: 'https://play.google.com/store/apps/details?id=com.mandapam.expo',
        releaseDate: new Date('2024-01-01')
      },
      {
        version: '1.1.0',
        platform: 'both',
        isLatest: true,
        isForceUpdate: false,
        minSupportedVersion: '1.0.0',
        releaseNotes: '• Bug fixes and performance improvements\n• New birthday WhatsApp feature\n• Enhanced search functionality\n• UI improvements',
        updateUrlIos: 'https://apps.apple.com/app/mandapam/id123456789',
        updateUrlAndroid: 'https://play.google.com/store/apps/details?id=com.mandapam.expo',
        releaseDate: new Date('2024-01-15')
      },
      {
        version: '2.0.0',
        platform: 'both',
        isLatest: false,
        isForceUpdate: true,
        minSupportedVersion: '1.5.0',
        releaseNotes: '• Major security updates\n• New authentication system\n• Breaking changes require update',
        updateUrlIos: 'https://apps.apple.com/app/mandapam/id123456789',
        updateUrlAndroid: 'https://play.google.com/store/apps/details?id=com.mandapam.expo',
        releaseDate: new Date('2024-02-01')
      }
    ];
    
    for (const versionData of sampleVersions) {
      await AppVersion.create(versionData);
      console.log(`✅ Inserted version ${versionData.version}`);
    }
    
    console.log('\n🎉 App versions table setup completed successfully!');
    console.log('\nSample data inserted:');
    console.log('- Version 1.0.0 (Initial release)');
    console.log('- Version 1.1.0 (Latest, regular update)');
    console.log('- Version 2.0.0 (Force update required)');
    
  } catch (error) {
    console.error('❌ Error creating app versions table:', error);
  } finally {
    process.exit(0);
  }
}

createAppVersionsTable();
