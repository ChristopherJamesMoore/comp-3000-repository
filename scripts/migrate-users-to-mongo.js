const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const getEnv = (name, fallback = undefined) => {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return value;
};

const getAdminUsernames = () =>
  (getEnv('ADMIN_USERNAMES', '') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

const isAdminUser = (username) => getAdminUsernames().includes(username);

const usersFile =
  getEnv('AUTH_USERS_FILE') ||
  path.join(__dirname, '..', 'blockchain', 'server', 'data', 'users.json');

const mongoUri = getEnv('MONGODB_URI');

if (!mongoUri) {
  console.error('MONGODB_URI is required.');
  process.exit(1);
}

if (!fs.existsSync(usersFile)) {
  console.error(`Users file not found: ${usersFile}`);
  process.exit(1);
}

const raw = fs.readFileSync(usersFile, 'utf8');
const users = raw.trim() ? JSON.parse(raw) : [];

if (!Array.isArray(users)) {
  console.error('Users file must contain a JSON array.');
  process.exit(1);
}

async function run() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();
  const collection = db.collection('users');

  let inserted = 0;
  let skipped = 0;

  for (const user of users) {
    if (!user.username) continue;
    const existing = await collection.findOne({ username: user.username });
    if (existing) {
      skipped += 1;
      continue;
    }
    let passwordHash = user.passwordHash;
    if (!passwordHash && user.password) {
      passwordHash = await bcrypt.hash(user.password, 10);
    }
    if (!passwordHash) {
      skipped += 1;
      continue;
    }
    await collection.insertOne({
      username: user.username,
      passwordHash,
      companyType: user.companyType || '',
      companyName: user.companyName || '',
      createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
      isAdmin: isAdminUser(user.username)
    });
    inserted += 1;
  }

  console.log(`Migration complete. Inserted: ${inserted}, Skipped: ${skipped}`);
  await client.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
