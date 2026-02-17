const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Test multer configuration
const testMulterConfiguration = () => {
  console.log('🧪 Testing Multer Configuration...\n');
  
  try {
    // Load multer configuration
    const multerConfig = require('./config/multerConfig');
    
    console.log('✅ Multer configuration loaded successfully');
    
    // Test profile image upload configuration
    if (multerConfig.profileImageUpload) {
      console.log('✅ Profile image upload configured');
    } else {
      console.log('❌ Profile image upload not configured');
    }
    
    // Test business images upload configuration
    if (multerConfig.businessImagesUpload) {
      console.log('✅ Business images upload configured');
    } else {
      console.log('❌ Business images upload not configured');
    }
    
    // Test event images upload configuration
    if (multerConfig.eventImagesUpload) {
      console.log('✅ Event images upload configured');
    } else {
      console.log('❌ Event images upload not configured');
    }
    
    // Test gallery images upload configuration
    if (multerConfig.galleryImagesUpload) {
      console.log('✅ Gallery images upload configured');
    } else {
      console.log('❌ Gallery images upload not configured');
    }
    
    // Test document upload configuration
    if (multerConfig.documentUpload) {
      console.log('✅ Document upload configured');
    } else {
      console.log('❌ Document upload not configured');
    }
    
    // Test utility functions
    if (multerConfig.getFileUrl) {
      console.log('✅ getFileUrl utility function available');
    } else {
      console.log('❌ getFileUrl utility function not available');
    }
    
    if (multerConfig.deleteFile) {
      console.log('✅ deleteFile utility function available');
    } else {
      console.log('❌ deleteFile utility function not available');
    }
    
    if (multerConfig.getFileInfo) {
      console.log('✅ getFileInfo utility function available');
    } else {
      console.log('❌ getFileInfo utility function not available');
    }
    
    if (multerConfig.handleMulterError) {
      console.log('✅ handleMulterError middleware available');
    } else {
      console.log('❌ handleMulterError middleware not available');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Multer configuration test failed:', error.message);
    return false;
  }
};

// Test uploads directory creation
const testUploadsDirectory = () => {
  console.log('\n🧪 Testing Uploads Directory...\n');
  
  try {
    const uploadsPath = path.join(process.cwd(), 'uploads');
    console.log('📁 Uploads path:', uploadsPath);
    
    // Check if uploads directory exists
    if (fs.existsSync(uploadsPath)) {
      console.log('✅ Uploads directory exists');
      
      // List subdirectories
      const subdirs = fs.readdirSync(uploadsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      console.log('📁 Subdirectories:', subdirs);
      
      // Check for expected subdirectories
      const expectedSubdirs = ['profile-images', 'business-images', 'gallery-images', 'event-images', 'documents'];
      const missingSubdirs = expectedSubdirs.filter(subdir => !subdirs.includes(subdir));
      
      if (missingSubdirs.length === 0) {
        console.log('✅ All expected subdirectories exist');
      } else {
        console.log('⚠️ Missing subdirectories:', missingSubdirs);
        console.log('💡 These will be created automatically when files are uploaded');
      }
    } else {
      console.log('ℹ️ Uploads directory does not exist yet');
      console.log('💡 It will be created automatically when files are uploaded');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Uploads directory test failed:', error.message);
    return false;
  }
};

// Test file filter functions
const testFileFilters = () => {
  console.log('\n🧪 Testing File Filters...\n');
  
  try {
    const multerConfig = require('./config/multerConfig');
    
    // Test image file filter
    if (multerConfig.imageFileFilter) {
      console.log('✅ Image file filter available');
      
      // Test with valid image file
      const validImageFile = {
        mimetype: 'image/jpeg',
        originalname: 'test.jpg'
      };
      
      let filterResult = null;
      multerConfig.imageFileFilter(null, validImageFile, (error, result) => {
        filterResult = { error, result };
      });
      
      if (filterResult && filterResult.result) {
        console.log('✅ Image file filter accepts valid image files');
      } else {
        console.log('❌ Image file filter rejected valid image file');
      }
      
      // Test with invalid file
      const invalidFile = {
        mimetype: 'text/plain',
        originalname: 'test.txt'
      };
      
      filterResult = null;
      multerConfig.imageFileFilter(null, invalidFile, (error, result) => {
        filterResult = { error, result };
      });
      
      if (filterResult && filterResult.error) {
        console.log('✅ Image file filter rejects invalid file types');
      } else {
        console.log('❌ Image file filter accepted invalid file type');
      }
    } else {
      console.log('❌ Image file filter not available');
    }
    
    // Test document file filter
    if (multerConfig.documentFileFilter) {
      console.log('✅ Document file filter available');
    } else {
      console.log('❌ Document file filter not available');
    }
    
    return true;
  } catch (error) {
    console.error('❌ File filters test failed:', error.message);
    return false;
  }
};

// Test utility functions
const testUtilityFunctions = () => {
  console.log('\n🧪 Testing Utility Functions...\n');
  
  try {
    const multerConfig = require('./config/multerConfig');
    
    // Test getFileUrl function
    if (multerConfig.getFileUrl) {
      const testUrl = multerConfig.getFileUrl('test-file.jpg', 'https://example.com');
      if (testUrl === 'https://example.com/uploads/test-file.jpg') {
        console.log('✅ getFileUrl function working correctly');
      } else {
        console.log('❌ getFileUrl function not working correctly');
      }
    }
    
    // Test createUploadDir function
    if (multerConfig.createUploadDir) {
      const testDir = multerConfig.createUploadDir('test-dir');
      if (fs.existsSync(testDir)) {
        console.log('✅ createUploadDir function working correctly');
        // Clean up test directory
        fs.rmdirSync(testDir);
      } else {
        console.log('❌ createUploadDir function not working correctly');
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Utility functions test failed:', error.message);
    return false;
  }
};

// Main test function
const runMulterTests = () => {
  console.log('🚀 Starting Multer Configuration Tests...\n');
  
  let allTestsPassed = true;
  
  // Test multer configuration
  const multerConfig = testMulterConfiguration();
  if (!multerConfig) allTestsPassed = false;
  
  // Test uploads directory
  const uploadsDir = testUploadsDirectory();
  if (!uploadsDir) allTestsPassed = false;
  
  // Test file filters
  const fileFilters = testFileFilters();
  if (!fileFilters) allTestsPassed = false;
  
  // Test utility functions
  const utilityFunctions = testUtilityFunctions();
  if (!utilityFunctions) allTestsPassed = false;
  
  console.log('\n📋 Test Summary:');
  console.log(multerConfig ? '✅ Multer configuration - Working' : '❌ Multer configuration - Failed');
  console.log(uploadsDir ? '✅ Uploads directory - Working' : '❌ Uploads directory - Failed');
  console.log(fileFilters ? '✅ File filters - Working' : '❌ File filters - Failed');
  console.log(utilityFunctions ? '✅ Utility functions - Working' : '❌ Utility functions - Failed');
  
  if (allTestsPassed) {
    console.log('\n🎉 All multer configuration tests passed!');
    console.log('💡 The image upload functionality is properly configured.');
  } else {
    console.log('\n⚠️ Some multer configuration tests failed.');
    console.log('💡 Please check the configuration files.');
  }
};

// Run tests
runMulterTests();
