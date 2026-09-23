import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';

let database;
let client;

const connectToDb = async (options = {}) => {
  if (database) {
    return database;
  }

  const connectionString = options.connectionString || process.env.MONGODB_URI;
  const databaseName = options.databaseName || process.env.MONGODB_DB_NAME || 'practice';

  if (!connectionString) {
    throw new Error('MONGODB_URI is required.');
  }

  // Connect native client
  client = new MongoClient(connectionString);
  await client.connect();
  database = client.db(databaseName);

  // Connect Mongoose
  // We need to pass the dbName to mongoose.connect to ensure it uses the correct database
  await mongoose.connect(connectionString, { dbName: databaseName });

  return database;
};

const getDb = () => {
  if (!database) {
    throw new Error('Database not initialized. Call connectToDb first.');
  }
  return database;
};

const closeDb = async () => {
  if (client) {
    await client.close();
    client = undefined;
    database = undefined;
  }
  await mongoose.disconnect();
};

export { closeDb, connectToDb, getDb };
