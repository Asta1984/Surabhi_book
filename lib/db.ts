import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDB(): Promise<Db> {
  if (db) {
    return db;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db('student_social_network');

  // Initialize collections with indexes
  const usersCollection = db.collection('users');
  const postsCollection = db.collection('posts');
  const sessionsCollection = db.collection('sessions');

  // Create indexes for better performance
  await usersCollection.createIndex({ email: 1 }, { unique: true });
  await usersCollection.createIndex({ username: 1 }, { unique: true });
  await postsCollection.createIndex({ createdAt: -1 });
  await postsCollection.createIndex({ targetUserId: 1, createdAt: -1 });
  await postsCollection.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });
  await sessionsCollection.createIndex({ userId: 1 });
  await sessionsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  console.log('[v0] Database connected successfully');
  return db;
}

export async function getDB(): Promise<Db> {
  if (!db) {
    return await connectDB();
  }
  return db;
}

export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
