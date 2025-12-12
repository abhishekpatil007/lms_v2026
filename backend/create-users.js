// Script to create instructors and students via API
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5001';

// Login as admin
async function loginAdmin() {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@lmsportal.com',
      password: 'Admin@123'
    })
  });
  const data = await response.json();
  return data.tokens.accessToken;
}

// Onboard an instructor
async function onboardInstructor(token, name, email) {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/onboard-instructor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name,
        email,
        preferred_language: 'English'
      })
    });
    const data = await response.json();
    console.log(`✅ Instructor created: ${name} (${email})`);
    console.log(`   Password: ${data.credentials?.password || 'Instructor@123'}`);
    return data;
  } catch (error) {
    console.error(`❌ Failed to create instructor ${email}:`, error.message);
  }
}

// Onboard a student
async function onboardStudent(token, name, email) {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/onboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name,
        email,
        preferred_language: 'English'
      })
    });
    const data = await response.json();
    console.log(`✅ Student created: ${name} (${email})`);
    console.log(`   Password: ${data.credentials?.password || 'Student@123'}`);
    return data;
  } catch (error) {
    console.error(`❌ Failed to create student ${email}:`, error.message);
  }
}

// Main function
async function main() {
  console.log('🚀 Starting user creation...\n');

  // Login as admin
  console.log('🔐 Logging in as admin...');
  const token = await loginAdmin();
  console.log('✅ Admin logged in\n');

  // Create instructors
  console.log('👨‍🏫 Creating instructors...');
  const instructors = [
    { name: 'John Doe', email: 'john.doe@lmsportal.com' },
    { name: 'Jane Smith', email: 'jane.smith@lmsportal.com' },
    { name: 'Michael Brown', email: 'michael.brown@lmsportal.com' },
    { name: 'Emily Davis', email: 'emily.davis@lmsportal.com' },
    { name: 'Robert Wilson', email: 'robert.wilson@lmsportal.com' },
  ];

  for (const instructor of instructors) {
    await onboardInstructor(token, instructor.name, instructor.email);
  }

  console.log('\n🧑‍🎓 Creating students...');
  const students = [
    { name: 'Alice Johnson', email: 'alice.johnson@lmsportal.com' },
    { name: 'Bob Martin', email: 'bob.martin@lmsportal.com' },
    { name: 'Charlie Thomas', email: 'charlie.thomas@lmsportal.com' },
    { name: 'Diana Lee', email: 'diana.lee@lmsportal.com' },
    { name: 'Ethan Harris', email: 'ethan.harris@lmsportal.com' },
    { name: 'Fiona White', email: 'fiona.white@lmsportal.com' },
    { name: 'George Clark', email: 'george.clark@lmsportal.com' },
    { name: 'Hannah Lewis', email: 'hannah.lewis@lmsportal.com' },
    { name: 'Ian Walker', email: 'ian.walker@lmsportal.com' },
    { name: 'Julia Young', email: 'julia.young@lmsportal.com' },
  ];

  for (const student of students) {
    await onboardStudent(token, student.name, student.email);
  }

  console.log('\n✨ All users created successfully!');
  console.log('\n📝 Note: All generated passwords will be shown above.');
  console.log('   Or use the default passwords:');
  console.log('   - Instructors: Instructor@123');
  console.log('   - Students: Student@123');
}

main().catch(console.error);
