/**
 * Seed script: creates one sample university (active), an admin user, and a
 * couple of sample communities so the app is testable immediately after
 * setup.
 *
 * Usage: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const University = require('./models/University');
const User = require('./models/User');
const Community = require('./models/Community');

const ADMIN_EMAIL = 'admin@seecs.edu.pk';
const ADMIN_PASSWORD = 'ChangeMe123!'; // change immediately after first login

async function seed() {
  await connectDB();

  console.log('[seed] Clearing existing seed data (University/User/Community only)...');
  await University.deleteMany({});
  await User.deleteMany({});
  await Community.deleteMany({});

  console.log('[seed] Creating sample university (NUST)...');
  const university = await University.create({
    name: 'National University of Sciences & Technology',
    shortName: 'NUST',
    verifiedEmailDomains: ['seecs.edu.pk', 'nust.edu.pk'],
    status: 'active',
    hasBeenActivated: true,
  });

  console.log('[seed] Creating admin user...');
  const admin = await User.create({
    name: 'Raabta Admin',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD, // hashed by the User pre-save hook
    university: university._id,
    role: 'admin',
    isEmailVerified: true,
  });

  console.log('[seed] Creating sample communities...');
  await Community.create([
    {
      name: 'NUST General',
      slug: 'general',
      university: university._id,
      type: 'general',
      description: 'The main community for all verified NUST students.',
      isVerifiedOfficial: true,
      createdBy: admin._id,
    },
    {
      name: 'SEECS - Computer Science',
      slug: 'seecs-cs',
      university: university._id,
      type: 'department',
      description: 'Official departmental community for Computer Science students at NUST SEECS.',
      isVerifiedOfficial: true,
      createdBy: admin._id,
    },
  ]);

  console.log('\n[seed] Done!');
  console.log('-----------------------------------------');
  console.log(`University: ${university.name} (${university.shortName})`);
  console.log(`Allowed email domains: ${university.verifiedEmailDomains.join(', ')}`);
  console.log(`Admin login: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log('(Admin login requires 2FA email OTP — check your configured SMTP inbox.)');
  console.log('-----------------------------------------\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
