// Test database query directly
const { Member } = require('./models');

async function testDatabaseQuery() {
  try {
    console.log('🔍 Testing database query...');
    
    // Test 1: Find all members
    const allMembers = await Member.findAll();
    console.log('📊 All members in database:', allMembers.length);
    allMembers.forEach((member, index) => {
      console.log(`${index + 1}. ${member.name} - Phone: "${member.phone}"`);
    });
    
    // Test 2: Try to find a specific phone number
    const testPhone = '9999999999';
    console.log(`\n🔍 Searching for phone: ${testPhone}`);
    const foundMember = await Member.findOne({ where: { phone: testPhone } });
    console.log('Found member:', foundMember);
    
    // Test 3: Try to find an existing phone number
    const existingPhone = '9096041415';
    console.log(`\n🔍 Searching for existing phone: ${existingPhone}`);
    const existingMember = await Member.findOne({ where: { phone: existingPhone } });
    console.log('Found existing member:', existingMember ? existingMember.name : 'Not found');
    
  } catch (error) {
    console.error('❌ Database query error:', error);
  } finally {
    process.exit(0);
  }
}

testDatabaseQuery();
